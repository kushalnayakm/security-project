import { useAuth } from "../../context/AuthContext";

export function EntityDashboardPage() {
  const { entity, logout } = useAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>DID</h1>
          <span style={styles.entityName}>{entity?.name || "Entity Dashboard"}</span>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.welcome}>
          <h2>Welcome back</h2>
          <p>Manage your forms, submissions, and certificates</p>
        </div>

        <div style={styles.grid}>
          <Link to="/entity/forms" style={styles.card}>
            <div style={styles.cardIcon}>📋</div>
            <h3>Forms</h3>
            <p>Create and manage registration forms</p>
          </Link>

          <Link to="/entity/customers" style={styles.card}>
            <div style={styles.cardIcon}>👥</div>
            <h3>Customers</h3>
            <p>View customer submissions</p>
          </Link>

          <Link to="/entity/qr" style={styles.card}>
            <div style={styles.cardIcon}>📱</div>
            <h3>QR Codes</h3>
            <p>Generate QR codes for forms</p>
          </Link>

          <Link to="/entity/certificates" style={styles.card}>
            <div style={styles.cardIcon}>📜</div>
            <h3>Certificates</h3>
            <p>Issue and manage certificates</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "white",
    borderBottom: "1px solid #e2e8f0",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#1e3a8a",
    margin: 0,
  },
  entityName: {
    fontSize: "1rem",
    color: "#64748b",
    background: "#f1f5f9",
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
  },
  logoutBtn: {
    padding: "0.5rem 1rem",
    background: "transparent",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  main: {
    flex: 1,
    padding: "2rem",
    maxWidth: "900px",
    width: "100%",
    margin: "0 auto",
  },
  welcome: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "2rem 1.5rem",
    background: "white",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    textDecoration: "none",
    color: "inherit",
    transition: "all 0.2s",
  },
  cardIcon: {
    fontSize: "2.5rem",
    marginBottom: "1rem",
  },
};