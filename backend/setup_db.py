import asyncio
import os
import sys
import subprocess
import uuid
from pathlib import Path
from urllib.parse import urlparse, unquote

# Add backend directory to Python path so we can import app modules
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def load_db_url_from_env():
    """Parser to dynamically read DATABASE_URL from .env file with zero external dependencies."""
    candidates = [
        BACKEND_DIR / ".env",
        BACKEND_DIR.parent / ".env",
        Path.cwd() / ".env",
        Path.cwd() / "backend" / ".env",
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            if key.strip() == "DATABASE_URL":
                                return val.strip().strip('"').strip("'")
            except Exception:
                pass
    return os.environ.get("DATABASE_URL")


# Load DB URL dynamically from .env file
DATABASE_URL = load_db_url_from_env()

# Try importing asyncpg. If it is missing, try running with the local virtual environment Python.
try:
    import asyncpg
except ImportError:
    # Search for .venv in parent and script directory
    venv_dirs = [
        BACKEND_DIR.parent / ".venv",
        BACKEND_DIR / ".venv",
    ]
    python_exe = None
    for vd in venv_dirs:
        if vd.exists():
            bin_path = vd / "bin" / "python"
            if bin_path.exists():
                python_exe = bin_path
                break
            win_path = vd / "Scripts" / "python.exe"
            if win_path.exists():
                python_exe = win_path
                break
    if python_exe:
        print(f"[*] Required packages not installed in this Python environment ({sys.executable}).")
        print(f"[*] Automatically re-running database setup using the virtual environment: {python_exe}...\n")
        res = subprocess.run([str(python_exe)] + sys.argv)
        sys.exit(res.returncode)
    else:
        print("Error: Required dependency (asyncpg) not found, and no virtual environment (.venv) was detected.")
        print("Please activate your virtual environment or install the required packages:")
        print("  pip install -r backend/requirements.txt")
        sys.exit(1)


def parse_db_url(url: str):
    """Parse connection URL to extract credentials, host, and DB name."""
    url = url.strip().strip('"').strip("'")
    clean_url = url
    if url.startswith("postgresql+asyncpg://"):
        clean_url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif url.startswith("postgres+asyncpg://"):
        clean_url = url.replace("postgres+asyncpg://", "postgresql://", 1)
    
    parsed = urlparse(clean_url)
    username = unquote(parsed.username) if parsed.username else None
    password = unquote(parsed.password) if parsed.password else None
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    db_name = parsed.path.lstrip('/')
    
    return username, password, host, port, db_name


async def main():
    print("Loading database configuration from .env...")
    db_url = DATABASE_URL
    if not db_url:
        print("Error: DATABASE_URL is not set in the configuration/environment.")
        sys.exit(1)
        
    username, password, host, port, db_name = parse_db_url(db_url)
    
    print("\n" + "-" * 50)
    print("PostgreSQL Connection Credentials:")
    print(f"  Host:      {host}")
    print(f"  Port:      {port}")
    print(f"  Database:  {db_name}")
    print(f"  Username:  {username}")
    print(f"  Password:  {'*' * len(password) if password else '(None)'}")
    print("-" * 50 + "\n")
    
    # 1. Connect to the default 'postgres' database to drop/recreate the target database
    postgres_dsn = f"postgresql://{username}:{password}@{host}:{port}/postgres"
    print("Connecting to PostgreSQL default database 'postgres'...")
    try:
        conn = await asyncpg.connect(dsn=postgres_dsn)
    except Exception as e:
        print(f"Error connecting to default 'postgres' database: {e}")
        print("Please ensure PostgreSQL is running and your username/password are correct.")
        sys.exit(1)
        
    try:
        # Terminate active connections to target database to prevent lock issues
        print(f"Terminating any active connections to database '{db_name}'...")
        await conn.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{db_name}'
              AND pid <> pg_backend_pid();
        """)
        
        print(f"Dropping database '{db_name}' if it exists...")
        await conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        
        print(f"Creating database '{db_name}'...")
        await conn.execute(f'CREATE DATABASE "{db_name}"')
    except Exception as e:
        print(f"Database recreation failed: {e}")
        sys.exit(1)
    finally:
        await conn.close()
        
    # 2. Connect to the new database and initialize the schema
    target_dsn = f"postgresql://{username}:{password}@{host}:{port}/{db_name}"
    print(f"Connecting to newly created database '{db_name}'...")
    try:
        conn = await asyncpg.connect(dsn=target_dsn)
    except Exception as e:
        print(f"Error connecting to target database '{db_name}': {e}")
        sys.exit(1)
        
    try:
        print("Ensuring 'pgcrypto' extension is enabled...")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
        
        print("Pre-creating 'alembic_version' table with VARCHAR(255) to support long migration names...")
        await conn.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(255) PRIMARY KEY);")
        
        schema_path = BACKEND_DIR / "schema.sql"
        print(f"Reading schema definition from {schema_path}...")
        if not schema_path.exists():
            print(f"Error: schema.sql not found at {schema_path}")
            sys.exit(1)
            
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()
            
        print("Initializing database schema...")
        await conn.execute(schema_sql)
        print("Database schema initialized successfully.")
        
        # 3. Seed the single admin user
        print("Seeding default admin user...")
        user_id = uuid.uuid4()
        admin_id = uuid.uuid4()
        
        # Password is set to plain text 'admin@123'
        await conn.execute("""
            INSERT INTO users (user_id, name, password_hash, phone, role, status)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user_id, "admin", "admin@123", "9876543210", "ADMIN", "ACTIVE")
        
        await conn.execute("""
            INSERT INTO admins (admin_id, user_id, can_manage_entities, can_manage_customers)
            VALUES ($1, $2, $3, $4)
        """, admin_id, user_id, True, True)
        
        print("\n" + "=" * 50)
        print("DATABASE SETUP SUCCESSFUL!")
        print(f"Admin Username: admin")
        print(f"Admin Password: admin@123")
        print(f"Admin ID (UUID for API/Postman): {admin_id}")
        print("=" * 50 + "\n")
        
    except Exception as e:
        print(f"Schema initialization or seeding failed: {e}")
        sys.exit(1)
    finally:
        await conn.close()
        
    # 4. Synchronize Alembic migrations status
    print("Synchronizing Alembic migration status (stamping HEAD)...")
    try:
        # Run alembic stamp head using the current python executable to ensure packages match
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "stamp", "head"],
            cwd=str(BACKEND_DIR),
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("Alembic successfully stamped to HEAD revision.")
        else:
            print("Warning: Alembic stamping failed.")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            print("You may need to manually run: alembic stamp head")
    except Exception as e:
        print(f"Warning: Failed to run Alembic stamp: {e}")


if __name__ == "__main__":
    asyncio.run(main())
