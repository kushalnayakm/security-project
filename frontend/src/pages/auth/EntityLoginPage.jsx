import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

export function EntityLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // OTP mode
  const [gstNo, setGstNo] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.requestEntityOtp(gstNo, phone);
      setStep(2);
      setSuccess("OTP sent to your registered phone");
    } catch (err) {
      setError(err.message || "Failed to send OTP. Check GST number and phone.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authService.verifyEntityOtp(gstNo, phone, otp);
      login(res.token, res.entity, res.role);
      navigate("/entity/dashboard");
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo}>DID</h1>
          <Link to="/auth/entity/register" style={styles.registerLink} onMouseEnter={(e) => e.target.style.background = "#1e40af"} onMouseLeave={(e) => e.target.style.background = "#1e3a8a"}>
            NEW Entity reg
          </Link>
        </div>

        {success && <p style={styles.success}>{success}</p>}
        {error && <p style={styles.error}>{error}</p>}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>GST Number *</label>
              <input
                type="text"
                value={gstNo}
                onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                placeholder="Enter GST number"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter registered phone"
                style={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Sending..." : "SEND OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <p style={styles.otpInfo}>
              Enter OTP sent to <strong>{phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}</strong>
            </p>
            <div style={styles.field}>
              <label style={styles.label}>OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                style={{ ...styles.input, textAlign: "center", letterSpacing: "0.5rem", fontSize: "1.25rem" }}
                maxLength={6}
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? "Verifying..." : "VERIFY"}
            </button>
            <button type="button" onClick={() => setStep(1)} style={styles.resendBtn}>
              Resend OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: "2rem 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "white",
    borderRadius: "8px",
    padding: "2rem",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #e5e7eb",
  },
  logo: {
    fontSize: "1.75rem",
    fontWeight: "bold",
    color: "#1e3a8a",
    margin: 0,
  },
  registerLink: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "white",
    background: "#1e3a8a",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    textDecoration: "none",
    transition: "background 0.2s, transform 0.1s",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#374151",
  },
  input: {
    padding: "0.625rem 0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "1rem",
    outline: "none",
  },
  submitBtn: {
    marginTop: "0.5rem",
    padding: "0.875rem",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  resendBtn: {
    marginTop: "0.5rem",
    padding: "0.625rem",
    background: "transparent",
    color: "#1e3a8a",
    border: "1px solid #1e3a8a",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  otpInfo: {
    fontSize: "0.875rem",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: "0.5rem",
  },
  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "1rem",
    textAlign: "center",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    marginBottom: "1rem",
    textAlign: "center",
  },
};