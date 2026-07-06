import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:Kushal1947%40@localhost:5432/customer_registration")
os.environ.setdefault("JWT_SECRET", "change_me")

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_app_starts() -> None:
    response = client.get("/docs")
    assert response.status_code == 200
