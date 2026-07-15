import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

export function EntityRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1 = send, 2 = verify
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Entity Info
    name: "",
    gstNo: "",
    gstDoc: null,
    businessType: "",
    address: "",
    contactPerson: "",
    phone: "",
    email: "",
    // Step 2: Personal Details
    firstName: "",
    midName: "",
    lastName: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    sex: "",
    dob: "",
    // Step 3: Documents & Credentials
    entityName: "",
    branchName: "",
    entityLogo: null,
    operatorPhoto: null,
    userDocument: null,
    userId: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name) return "Entity name is required";
      if (!formData.gstNo) return "GST number is required";
      if (!formData.phone) return "Phone is required";
      if (!formData.email) return "Email is required";
      return null;
    }
    if (step === 2) {
      if (!formData.firstName) return "First name is required";
      if (!formData.lastName) return "Last name is required";
      if (!formData.sex) return "Sex is required";
      if (!formData.dob) return "Date of birth is required";
      return null;
    }
    if (step === 3) {
      if (!formData.entityName) return "Entity name is required";
      if (!otpVerified) return "Please verify your phone number with OTP";
      return null;
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSendOtp = async () => {
    setError("");
    setOtpLoading(true);
    try {
      await authService.requestRegistrationOtp(formData.phone);
      setOtpStep(2);
      setOtpSent(true);
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setOtpLoading(true);
    try {
      await authService.verifyRegistrationOtp(formData.phone, otp);
      setOtpVerified(true);
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp("");
    setOtpStep(1);
    setOtpVerified(false);
    handleSendOtp();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("gstNo", formData.gstNo);
      if (formData.gstDoc) {
        formDataToSend.append("gstDoc", formData.gstDoc);
      }
      if (formData.businessType) formDataToSend.append("businessType", formData.businessType);
      if (formData.address) formDataToSend.append("address", formData.address);
      if (formData.contactPerson) formDataToSend.append("contactPerson", formData.contactPerson);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("firstName", formData.firstName);
      if (formData.midName) formDataToSend.append("midName", formData.midName);
      formDataToSend.append("lastName", formData.lastName);
      if (formData.fatherName) formDataToSend.append("fatherName", formData.fatherName);
      if (formData.motherName) formDataToSend.append("motherName", formData.motherName);
      if (formData.spouseName) formDataToSend.append("spouseName", formData.spouseName);
      formDataToSend.append("sex", formData.sex);
      formDataToSend.append("dob", formData.dob);
      formDataToSend.append("entityName", formData.entityName);
      if (formData.branchName) formDataToSend.append("branchName", formData.branchName);
      if (formData.entityLogo) formDataToSend.append("entityLogo", formData.entityLogo);
      if (formData.operatorPhoto) formDataToSend.append("operatorPhoto", formData.operatorPhoto);
      if (formData.userDocument) formDataToSend.append("userDocument", formData.userDocument);
      await authService.registerEntity(formDataToSend);
      setSuccess(true);
      setTimeout(() => navigate("/auth/entity/login"), 2000);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <fieldset style={styles.section}>
      <legend style={styles.legend}>Entity Information</legend>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Entity Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter entity name"
            style={styles.input}
            required
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>GST Number *</label>
          <input
            type="text"
            value={formData.gstNo}
            onChange={(e) => handleChange("gstNo", e.target.value.toUpperCase())}
            placeholder="GST Number"
            style={styles.input}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>GST Document (PDF) *</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileChange("gstDoc", e)}
            style={styles.fileInput}
            required
          />
          {formData.gstDoc && <p style={styles.fileName}>File: {formData.gstDoc.name}</p>}
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Business Type</label>
          <input
            type="text"
            value={formData.businessType}
            onChange={(e) => handleChange("businessType", e.target.value)}
            placeholder="Business type"
            style={styles.input}
          />
        </div>
      </div>
      <div style={{ ...styles.field, width: "100%" }}>
        <label style={styles.label}>Address</label>
        <textarea
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="Full address"
          style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
        />
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Contact Person</label>
          <input
            type="text"
            value={formData.contactPerson}
            onChange={(e) => handleChange("contactPerson", e.target.value)}
            placeholder="Contact person name"
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Phone *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="Phone number"
            style={styles.input}
            required
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="Email address"
            style={styles.input}
            required
          />
        </div>
      </div>
    </fieldset>
  );

  const renderStep2 = () => (
    <fieldset style={styles.section}>
      <legend style={styles.legend}>Personal Details (Owner)</legend>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>First Name *</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            placeholder="First name"
            style={styles.input}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Middle Name</label>
          <input
            type="text"
            value={formData.midName}
            onChange={(e) => handleChange("midName", e.target.value)}
            placeholder="Middle name"
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Last Name *</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            placeholder="Last name"
            style={styles.input}
            required
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Father Name</label>
          <input
            type="text"
            value={formData.fatherName}
            onChange={(e) => handleChange("fatherName", e.target.value)}
            placeholder="Father's name"
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Mother Name</label>
          <input
            type="text"
            value={formData.motherName}
            onChange={(e) => handleChange("motherName", e.target.value)}
            placeholder="Mother's name"
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Spouse Name</label>
          <input
            type="text"
            value={formData.spouseName}
            onChange={(e) => handleChange("spouseName", e.target.value)}
            placeholder="Spouse name"
            style={styles.input}
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Sex *</label>
          <select
            value={formData.sex}
            onChange={(e) => handleChange("sex", e.target.value)}
            style={styles.input}
            required
          >
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>D.O.B *</label>
          <input
            type="date"
            value={formData.dob}
            onChange={(e) => handleChange("dob", e.target.value)}
            style={styles.input}
            required
          />
        </div>
      </div>
    </fieldset>
  );

  const renderStep3 = () => (
    <fieldset style={styles.section}>
      <legend style={styles.legend}>Entity / Operator / Document</legend>
      
      {/* Phone Verification Section */}
      <div style={styles.phoneVerification}>
        <h4 style={styles.phoneVerifyTitle}>Phone Verification</h4>
        <p style={styles.phoneVerifyText}>
          Verify the phone number entered in Step 1: <strong>{formData.phone}</strong>
        </p>
        
        {otpStep === 1 && (
          <div style={styles.otpSection}>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpLoading}
              style={styles.sendOtpBtn}
            >
              {otpLoading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        )}
        
        {otpStep === 2 && (
          <div style={styles.otpSection}>
            <div style={styles.field}>
              <label style={styles.label}>Enter OTP</label>
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
            <div style={styles.otpButtons}>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpLoading}
                style={styles.verifyBtn}
              >
                {otpLoading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                style={styles.resendBtn}
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}
        
        {otpVerified && (
          <div style={styles.verified}>
            <span style={styles.verifiedIcon}>✓</span>
            <span>Phone verified successfully!</span>
          </div>
        )}
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Entity Name *</label>
          <input
            type="text"
            value={formData.entityName}
            onChange={(e) => handleChange("entityName", e.target.value)}
            placeholder="Entity display name"
            style={styles.input}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Branch Name</label>
          <input
            type="text"
            value={formData.branchName}
            onChange={(e) => handleChange("branchName", e.target.value)}
            placeholder="Branch name"
            style={styles.input}
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Entity Logo</label>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange("entityLogo", e)} style={styles.fileInput} />
          {formData.entityLogo && <p style={styles.fileName}>File: {formData.entityLogo.name}</p>}
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Operator Photo</label>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange("operatorPhoto", e)} style={styles.fileInput} />
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>User Document / Certificate</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange("userDocument", e)} style={styles.fileInput} />
          {formData.userDocument && <p style={styles.fileName}>File: {formData.userDocument.name}</p>}
        </div>
      </div>
      <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
        <h4 style={{ color: "#1e3a8a", margin: "0 0 0.5rem 0", fontSize: "0.875rem" }}>Registration Summary</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem", color: "#475569" }}>
          <div><strong>Entity Name:</strong> {formData.name}</div>
          <div><strong>Branch Name:</strong> {formData.branchName || "Main Office"}</div>
          <div><strong>GST Number:</strong> {formData.gstNo}</div>
          <div><strong>Contact Person:</strong> {formData.contactPerson || "N/A"}</div>
          <div><strong>Status:</strong> <span style={{ color: "#00695C", fontWeight: 600 }}>PENDING_VERIFICATION</span></div>
        </div>
      </div>
    </fieldset>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo}>DID</h1>
          <Link to="/auth/entity/login" style={styles.backLink}>
            Back to Login
          </Link>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.progress}>
            <div style={{ ...styles.step, ...(step >= 1 ? styles.stepActive : {}) }}>
              <span style={styles.stepNum}>1</span> Entity Info
            </div>
            <div style={{ ...styles.step, ...(step >= 2 ? styles.stepActive : {}) }}>
              <span style={styles.stepNum}>2</span> Personal Details
            </div>
            <div style={{ ...styles.step, ...(step >= 3 ? styles.stepActive : {}) }}>
              <span style={styles.stepNum}>3</span> Documents & Verify
            </div>
          </div>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.nav}>
            {step > 1 && <button type="button" onClick={prevStep} style={styles.prevBtn}>Previous</button>}
            {step < 3 ? (
              <button type="button" onClick={nextStep} style={styles.nextBtn}>Next</button>
            ) : (
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? "Registering..." : "Register Entity"}
              </button>
            )}
          </div>
        </form>
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
    maxWidth: "720px",
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
  backLink: {
    fontSize: "0.875rem",
    color: "#1e3a8a",
    textDecoration: "none",
    fontWeight: 500,
  },
  progress: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #e5e7eb",
  },
  step: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
  stepNum: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#e5e7eb",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "0.75rem",
  },
  stepActive: {
    color: "#1e3a8a",
    fontWeight: 600,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "1rem",
    margin: 0,
  },
  legend: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#1e3a8a",
    padding: "0 0.5rem",
  },
  row: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    flex: 1,
    minWidth: "180px",
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
  fileInput: {
    padding: "0.5rem",
    border: "1px dashed #d1d5db",
    borderRadius: "4px",
    fontSize: "0.875rem",
  },
  fileName: {
    marginTop: "0.5rem",
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  phoneVerification: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "1rem",
    marginBottom: "1rem",
  },
  phoneVerifyTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#1e293b",
    margin: "0 0 0.5rem",
  },
  phoneVerifyText: {
    fontSize: "0.875rem",
    color: "#64748b",
    margin: "0 0 1rem",
  },
  otpSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sendOtpBtn: {
    padding: "0.75rem",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  otpButtons: {
    display: "flex",
    gap: "0.5rem",
  },
  verifyBtn: {
    flex: 1,
    padding: "0.75rem",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  resendBtn: {
    padding: "0.75rem 1rem",
    background: "transparent",
    color: "#1e3a8a",
    border: "1px solid #1e3a8a",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  verified: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "4px",
  },
  verifiedIcon: {
    fontSize: "1.25rem",
    fontWeight: "bold",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
  },
  prevBtn: {
    padding: "0.625rem 1.25rem",
    background: "transparent",
    color: "#1e3a8a",
    border: "1px solid #1e3a8a",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  nextBtn: {
    padding: "0.875rem 1.5rem",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtn: {
    padding: "0.875rem 1.5rem",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    marginBottom: "1rem",
    textAlign: "center",
  },
  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "1rem",
    textAlign: "center",
  },
};