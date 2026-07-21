import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

export function EntityLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithOtp } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [gstNo, setGstNo] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const otpInputRefs = useRef([]);
  const otpDigits = useMemo(() => Array.from({ length: 6 }, (_, index) => otp[index] || ""), [otp]);

  const updateOtpAtIndex = (index, value) => {
    const nextDigits = [...otpDigits];
    nextDigits[index] = value;
    setOtp(nextDigits.join(""));
  };

  const focusOtpInput = (index) => {
    otpInputRefs.current[index]?.focus();
    otpInputRefs.current[index]?.select?.();
  };

  const handleOtpChange = (index, rawValue) => {
    const numericValue = rawValue.replace(/\D/g, "");
    if (!numericValue) {
      updateOtpAtIndex(index, "");
      return;
    }

    if (numericValue.length > 1) {
      const nextDigits = [...otpDigits];
      numericValue.slice(0, 6 - index).split("").forEach((digit, offset) => {
        nextDigits[index + offset] = digit;
      });
      setOtp(nextDigits.join(""));
      focusOtpInput(Math.min(index + numericValue.length, 5));
      return;
    }

    updateOtpAtIndex(index, numericValue);
    if (index < 5) {
      focusOtpInput(index + 1);
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      if (otpDigits[index]) {
        updateOtpAtIndex(index, "");
      } else if (index > 0) {
        updateOtpAtIndex(index - 1, "");
        focusOtpInput(index - 1);
      }
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      focusOtpInput(index - 1);
      event.preventDefault();
    }

    if (event.key === "ArrowRight" && index < 5) {
      focusOtpInput(index + 1);
      event.preventDefault();
    }
  };

  const handleOtpPaste = (event) => {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedDigits) {
      return;
    }

    event.preventDefault();
    setOtp(pastedDigits);
    focusOtpInput(Math.min(pastedDigits.length - 1, 5));
  };

  const handleRequestOtp = async (event) => {
    event.preventDefault();
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

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithOtp(gstNo, phone, otp);
      const redirectTo = location.state?.from?.pathname || "/entity/dashboard";
      // Use push (default) instead of replace so the login page stays in browser
      // history. This preserves normal Back/Forward navigation — pressing Back
      // from the dashboard returns to the login page, which will see the stored
      // token and redirect forward again without forcing a logout.
      navigate(redirectTo);
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetOtpStep = () => {
    setStep(1);
    setOtp("");
    setSuccess(false);
    setError(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.page}>
        <img src="/did-logo.png" alt="DID" style={styles.logo} />

        {success && step === 2 ? <p style={styles.success}>{success}</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}

        <form onSubmit={step === 1 ? handleRequestOtp : handleVerifyOtp} style={styles.form}>
          <div style={styles.field}>
            <input
              id="gstNo"
              type="text"
              value={gstNo}
              onChange={(event) => setGstNo(event.target.value.toUpperCase())}
              placeholder="G S T #"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="PHONE #"
              style={styles.input}
              required
            />
          </div>

          {step === 2 ? (
            <div style={styles.field}>
              <div style={styles.otpRow} onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpInputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    style={styles.otpInput}
                    maxLength={1}
                    required
                    autoFocus={index === 0}
                    aria-label={`OTP digit ${index + 1}`}
                    placeholder="-"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <button type="submit" disabled={loading} style={styles.primaryButton}>
              {loading ? "Requesting..." : "Request OTP"}
            </button>
          ) : (
            <>
              <button type="submit" disabled={loading || otp.length !== 6} style={styles.primaryButton}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button type="button" onClick={resetOtpStep} style={styles.secondaryButton}>
                Resend OTP
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

const TEAL_BORDER = "#7EEAD9";
const MINT_ACTION = "#7EF7E8";
const TEXT_MUTED = "#6f6a70";

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  page: {
    width: "100%",
    maxWidth: "520px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: "clamp(140px, 30vw, 180px)",
    height: "auto",
    objectFit: "contain",
    display: "block",
    userSelect: "none",
    lineHeight: 1,
    margin: "0 0 40px",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  input: {
    width: "100%",
    height: "86px",
    padding: "0 18px",
    border: `1px solid ${TEAL_BORDER}`,
    borderRadius: "0",
    background: "#ffffff",
    color: TEXT_MUTED,
    fontSize: "1rem",
    fontWeight: 500,
    letterSpacing: "0.18em",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
  },
  otpRow: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: "0",
  },
  otpInput: {
    width: "100%",
    height: "84px",
    border: `1px solid ${TEAL_BORDER}`,
    borderRadius: "0",
    background: "#ffffff",
    color: TEXT_MUTED,
    textAlign: "center",
    fontSize: "1.5rem",
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box",
    marginLeft: "-1px",
  },
  primaryButton: {
    width: "100%",
    height: "62px",
    marginTop: "8px",
    border: "none",
    borderRadius: "0",
    background: MINT_ACTION,
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    height: "58px",
    border: `1px solid ${TEAL_BORDER}`,
    borderRadius: "0",
    background: "#ffffff",
    color: MINT_ACTION,
    fontSize: "0.95rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    cursor: "pointer",
  },
  success: {
    width: "100%",
    margin: "0 0 16px",
    color: MINT_ACTION,
    fontSize: "0.92rem",
    textAlign: "center",
  },
  error: {
    width: "100%",
    margin: "0 0 16px",
    color: "#dc2626",
    fontSize: "0.92rem",
    textAlign: "center",
  },
};
