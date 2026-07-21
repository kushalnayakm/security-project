import React from "react";
import { Link } from "react-router-dom";

export function EntityHomePage() {
  return (
    <div style={styles.container}>
      <img src="/did-logo.png" alt="DID" style={styles.logo} />

      <div style={styles.actions}>
        <Link to="/auth/entity/register" style={styles.btnPrimary}>
          Sign up
        </Link>
        <Link to="/auth/entity/login" style={styles.btnSecondary}>
          Sign in
        </Link>
      </div>

      <div style={styles.qrBox}>
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://your-did-link.example.com"
          alt="QR code"
          style={styles.qrImg}
        />
      </div>
    </div>
  );
}

const CYAN = "#7aedf3";

const styles = {
  container: {
    minHeight: "100vh",
    padding: "2rem 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    background: "white",
  },
  logo: {
    width: "clamp(120px, 24vw, 160px)",
    height: "auto",
    objectFit: "contain",
    display: "block",
    userSelect: "none",
  },
  actions: {
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  btnPrimary: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    height: "90px",
    padding: "1rem",
    color: "#7aedf3",
    textDecoration: "none",
    border: `2px solid ${CYAN}`,
    fontSize: "2rem",
    fontWeight: 2600,
    boxSizing: "border-box",
  },
  btnSecondary: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    height: "90px",
    padding: "1rem",
    background: "white",
    color: "#7aedf3",
    textDecoration: "none",
    border: `2px solid ${CYAN}`,
    fontSize: "2rem",
    fontWeight: 2600,
    boxSizing: "border-box",
  },
  qrBox: {
    width: "150px",
    height: "150px",
    border: `2px solid ${CYAN}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qrImg: {
    width: "140px",
    height: "140px",
  },
};
