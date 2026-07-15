import { Link } from "react-router-dom";

export function EntityHomePage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo}>DID</h1>
        </div>

        <div style={styles.content}>
          <div style={styles.actions}>
            <Link to="/auth/entity/login" style={styles.btnPrimary}>
              Sign In to Entity Portal
            </Link>
            <Link to="/auth/entity/register" style={styles.btnSecondary}>
              Register New Entity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
    padding: "2rem 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    background: "white",
    borderRadius: "12px",
    padding: "2.5rem",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  },
  header: {
    marginBottom: "1.5rem",
  },
  logo: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#1e3a8a",
    margin: 0,
    textAlign: "center",
  },
  content: {
    textAlign: "center",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 0.5rem",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#64748b",
    margin: "0 0 2rem",
    lineHeight: 1.6,
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
    marginBottom: "2rem",
    textAlign: "left",
  },
  feature: {
    padding: "1rem",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  featureIcon: {
    fontSize: "1.5rem",
    marginBottom: "0.5rem",
  },
  featureTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#1e293b",
    margin: "0 0 0.25rem",
  },
  featureDesc: {
    fontSize: "0.8125rem",
    color: "#64748b",
    margin: 0,
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  btnPrimary: {
    display: "block",
    padding: "0.875rem 1.5rem",
    background: "#1e3a8a",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    textAlign: "center",
    transition: "background 0.2s",
  },
  btnSecondary: {
    display: "block",
    padding: "0.875rem 1.5rem",
    background: "white",
    color: "#1e3a8a",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    textAlign: "center",
    border: "2px solid #1e3a8a",
    transition: "all 0.2s",
  },
};