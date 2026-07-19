import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { entityService } from "../../services/entityService";
import { GoogleMapsLocationPicker } from "../../components/GoogleMapsLocationPicker";
import { useRegistrationDraft } from "../../context/RegistrationDraftContext";

const MINT_FILL = "#D6FBF5";
const MINT_BORDER = "#2FBF9B";
const MINT_DONE = "#9FE1CB";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export function EntityRegisterPage() {
  const navigate = useNavigate();
  const { entity: authEntity, isAuthenticated, logout } = useAuth();
  const { setDocuments, setFormData: setDraftFormData, registerObjectUrl } = useRegistrationDraft();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [otpStep, setOtpStep] = useState(isAuthenticated ? 2 : 1);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(Boolean(isAuthenticated));
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    branchName: "",
    phone: "",
    gstNo: "",
    gstDoc: null,
    address: "",
    addressProof: null,
    operatorPhoto: null,
    location: "",
    locationLat: "",
    locationLng: "",
  });

  useEffect(() => {
    setOtpVerified(Boolean(isAuthenticated));
    setOtpStep(isAuthenticated ? 2 : 1);
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!isAuthenticated) {
        return;
      }

      setProfileLoading(true);
      try {
        const profile = await entityService.getProfile();
        if (!active) {
          return;
        }

        setFormData((prev) => ({
          ...prev,
          name: profile?.name || authEntity?.name || prev.name,
          branchName: profile?.branch_name || authEntity?.branch_name || prev.branchName,
          phone: profile?.phone || authEntity?.phone || prev.phone,
          gstNo: profile?.gst_no || authEntity?.gst_no || authEntity?.gstNo || prev.gstNo,
          address: profile?.address || prev.address,
          location: profile?.location || prev.location,
          locationLat: profile?.location_lat || prev.locationLat,
          locationLng: profile?.location_lng || prev.locationLng,
        }));
      } catch (err) {
        if (active) {
          console.warn("Optional entity profile request failed", {
            message: err.message,
            status: err.status,
            url: err.url,
            method: err.method,
          });
          if (err.status === 401 || err.status === 404) {
            logout();
          }
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [authEntity, isAuthenticated]);

  const hasLockedGst = Boolean(authEntity?.gst_no || authEntity?.gstNo || formData.gstNo);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  };

  const handleFileRemove = (field) => {
    setFormData((prev) => ({ ...prev, [field]: null }));
    setContextMenu(null);
  };

  const handleFileContextMenu = (field, event) => {
    event.preventDefault();
    setContextMenu({ field, x: event.clientX, y: event.clientY });
  };

  const handleFileDoubleClick = (field) => {
    if (window.confirm("Remove selected document?")) {
      handleFileRemove(field);
    }
  };

  const handleLocatePick = () => {
    setError("");
    if (!GOOGLE_MAPS_API_KEY) {
      setError("Google Maps is unavailable. Location is optional.");
      return;
    }
    setMapModalOpen(true);
  };

  const handleLocationSelect = (locationData) => {
    setFormData((prev) => ({
      ...prev,
      location: locationData.formatted,
      locationLat: locationData.lat,
      locationLng: locationData.lng,
    }));
  };

  const handleSendOtp = async () => {
    if (!formData.phone) {
      setError("Enter phone number before requesting OTP");
      return;
    }
    setError("");
    setOtpLoading(true);
    try {
      await authService.requestRegistrationOtp(formData.phone);
      setOtpStep(2);
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

  // Mandatory fields: name, branchName, phone, gstNo, address, gstDoc, addressProof
  // Optional fields: location, operatorPhoto
  const mandatoryFields = ["name", "branchName", "phone", "gstNo", "address"];
  const mandatoryFiles = ["gstDoc", "addressProof"];
  const isStepValid =
    mandatoryFields.every((field) => formData[field]) &&
    mandatoryFiles.every((field) => formData[field]) &&
    otpVerified;

  const summaryStatus = useMemo(
    () => (otpVerified ? "PHONE_VERIFIED" : "PENDING_VERIFICATION"),
    [otpVerified],
  );

  const locationDisplay = formData.location || "";
  const phoneVerificationLabel = formData.phone ? `Verify phone number ${formData.phone}` : "Verify phone number";

  const renderRequestError = () => {
    if (!error) {
      return null;
    }

    return <p style={styles.error}>{error}</p>;
  };

  const handleContinue = () => {
    if (!isStepValid) {
      if (!otpVerified) {
        setError("Please verify your phone number with OTP before continuing");
      } else {
        setError("Please fill all required fields marked with *");
      }
      return;
    }

    setError("");

    // Build document metadata for the preview page. File objects are kept as real
    // File instances the whole way through — they are handed to the shared
    // RegistrationDraftContext below, never serialized to a string anywhere.
    const documents = [];
    if (formData.gstDoc instanceof File) {
      const previewUrl = URL.createObjectURL(formData.gstDoc);
      registerObjectUrl(previewUrl);
      documents.push({
        field: "gstDoc",
        file: formData.gstDoc,
        name: formData.gstDoc.name,
        type: formData.gstDoc.type,
        size: formData.gstDoc.size,
        previewUrl,
      });
    }
    if (formData.addressProof instanceof File) {
      const previewUrl = URL.createObjectURL(formData.addressProof);
      registerObjectUrl(previewUrl);
      documents.push({
        field: "addressProof",
        file: formData.addressProof,
        name: formData.addressProof.name,
        type: formData.addressProof.type,
        size: formData.addressProof.size,
        previewUrl,
      });
    }
    if (formData.operatorPhoto instanceof File) {
      const previewUrl = URL.createObjectURL(formData.operatorPhoto);
      registerObjectUrl(previewUrl);
      documents.push({
        field: "operatorPhoto",
        file: formData.operatorPhoto,
        name: formData.operatorPhoto.name,
        type: formData.operatorPhoto.type,
        size: formData.operatorPhoto.size,
        previewUrl,
      });
    }

    // Hand the draft to the shared in-memory context instead of sessionStorage.
    setDocuments(documents);
    setDraftFormData({
      name: formData.name,
      branchName: formData.branchName,
      phone: formData.phone,
      gstNo: formData.gstNo,
      address: formData.address,
      location: formData.location,
      locationLat: formData.locationLat,
      locationLng: formData.locationLng,
    });

    navigate("/entity/register/preview");
  };

  return (
    <div style={styles.container}>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.logo}>DID</h1>
          <Link to="/auth/entity/login" style={styles.backLink}>
            Back to Login
          </Link>
        </div>

        <div style={styles.form}>
          <div style={styles.grid}>
            <div style={styles.gridCell}>
              <label style={styles.gridLabel}>ENTITY NAME *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                style={styles.gridInput}
                placeholder="Enter entity name"
                required
              />
            </div>
            <div style={styles.gridCell}>
              <label style={styles.gridLabel}>BRANCH NAME *</label>
              <input
                type="text"
                value={formData.branchName}
                onChange={(e) => handleChange("branchName", e.target.value)}
                style={styles.gridInput}
                placeholder="Enter branch name"
                required
              />
            </div>
            <div style={styles.gridCell}>
              <label style={styles.gridLabel}>PHONE NUMBER *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                style={styles.gridInput}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div style={styles.gridCell}>
              <label style={styles.gridLabel}>GST NUMBER *</label>
              <input
                type="text"
                value={formData.gstNo}
                onChange={(e) => handleChange("gstNo", e.target.value.toUpperCase())}
                style={styles.gridInput}
                placeholder="Enter GST number"
                required
              />
            </div>
            <div style={styles.gridCell}>
              <label style={styles.gridLabel}>ADDRESS *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                style={styles.gridInput}
                placeholder="Enter full address"
                required
              />
            </div>
            <div style={styles.gridCell}>
              <label style={styles.gridLabel}>LOCATION (Optional)</label>
              <div style={styles.locationField}>
                {formData.location || "Not Provided"}
              </div>
            </div>

            {/* GST Certificate - mandatory */}
            <label
              style={{ ...styles.attachCell, background: formData.gstDoc ? "#E8FDFB" : MINT_FILL }}
              onContextMenu={(e) => formData.gstDoc && handleFileContextMenu("gstDoc", e)}
              onDoubleClick={() => formData.gstDoc && handleFileDoubleClick("gstDoc")}
            >
              <span style={{ ...styles.attachLabel, transform: formData.gstDoc ? "none" : "rotate(-25deg)" }}>
                {formData.gstDoc ? `✓ ${formData.gstDoc.name}` : "ATTACH GST CERTIFICATE *"}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange("gstDoc", e)}
                style={styles.hiddenInput}
              />
            </label>

            {/* Address Proof - mandatory */}
            <label
              style={{ ...styles.attachCell, background: formData.addressProof ? "#E8FDFB" : MINT_FILL }}
              onContextMenu={(e) => formData.addressProof && handleFileContextMenu("addressProof", e)}
              onDoubleClick={() => formData.addressProof && handleFileDoubleClick("addressProof")}
            >
              <span style={{ ...styles.attachLabel, transform: formData.addressProof ? "none" : "rotate(-25deg)" }}>
                {formData.addressProof ? `✓ ${formData.addressProof.name}` : "ATTACH ADDRESS PROOF *"}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange("addressProof", e)}
                style={styles.hiddenInput}
              />
            </label>

            {/* Operator Photo - optional */}
            <label
              style={{ ...styles.attachCell, background: formData.operatorPhoto ? "#E8FDFB" : MINT_FILL }}
              onContextMenu={(e) => formData.operatorPhoto && handleFileContextMenu("operatorPhoto", e)}
              onDoubleClick={() => formData.operatorPhoto && handleFileDoubleClick("operatorPhoto")}
            >
              <span style={{ ...styles.attachLabel, transform: formData.operatorPhoto ? "none" : "rotate(-25deg)" }}>
                {formData.operatorPhoto ? `✓ ${formData.operatorPhoto.name}` : "ATTACH OPERATOR PHOTO (Optional)"}
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange("operatorPhoto", e)}
                style={styles.hiddenInput}
              />
            </label>

            {/* Google Maps - optional */}
            <div
              onClick={handleLocatePick}
              style={{
                ...styles.attachCell,
                ...styles.mapCell,
                background: formData.location ? "#E8FDFB" : MINT_FILL,
                cursor: GOOGLE_MAPS_API_KEY ? "pointer" : "default",
                opacity: GOOGLE_MAPS_API_KEY ? 1 : 0.6,
              }}
              title={GOOGLE_MAPS_API_KEY ? "Click to select location on map" : "Google Maps API key not configured"}
            >
              <span style={{ ...styles.attachLabel, transform: formData.location ? "none" : "rotate(-25deg)" }}>
                {formData.location
                  ? "✓ Location Selected"
                  : GOOGLE_MAPS_API_KEY
                    ? "LOCATE IN GOOGLE MAPS (Optional)"
                    : "GOOGLE MAPS UNAVAILABLE"}
              </span>
            </div>
          </div>

          <div style={styles.otpSection}>
            {!otpVerified ? (
              <div style={styles.otpRow}>
                <p style={styles.otpText}>{phoneVerificationLabel}</p>
                {otpStep === 1 && (
                  <button type="button" onClick={handleSendOtp} disabled={otpLoading} style={styles.otpBtn}>
                    {otpLoading ? "Sending..." : "Send OTP"}
                  </button>
                )}
                {otpStep === 2 && (
                  <div style={styles.otpInline}>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter OTP"
                      maxLength={6}
                      style={styles.otpInput}
                      autoFocus
                    />
                    <button type="button" onClick={handleVerifyOtp} disabled={otpLoading} style={styles.otpBtn}>
                      {otpLoading ? "..." : "Verify"}
                    </button>
                    <button type="button" onClick={handleResendOtp} style={styles.otpResendBtn}>
                      Resend
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.verifiedStrip}>✓ Phone Verified</div>
            )}
          </div>

          <div style={styles.summaryBox}>
            <h4 style={styles.summaryTitle}>Registration Summary</h4>
            <div style={styles.summaryGrid}>
              <div><strong>Entity Name:</strong> {formData.name || "—"}</div>
              <div><strong>Branch:</strong> {formData.branchName || "—"}</div>
              <div><strong>GST:</strong> {formData.gstNo || "—"}</div>
              <div><strong>Phone:</strong> {formData.phone || "—"}</div>
              <div><strong>Address:</strong> {formData.address || "—"}</div>
              <div><strong>Location:</strong> {formData.location || "Not Provided"}</div>
              <div><strong>Status:</strong> <span style={styles.pendingTag}>{summaryStatus}</span></div>
            </div>
          </div>

          {profileLoading && <p style={styles.loadingHint}>Loading profile data...</p>}
          {renderRequestError()}

          <div style={styles.nav}>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!isStepValid || submitting}
              style={{ ...styles.submitBtn, ...((!isStepValid || submitting) ? styles.submitBtnDisabled : {}) }}
            >
              {submitting ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu for file removal */}
      {contextMenu && (
        <>
          <div
            style={styles.contextMenuOverlay}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            style={{
              ...styles.contextMenu,
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <div style={styles.contextMenuTitle}>Remove selected document?</div>
            <div style={styles.contextMenuActions}>
              <button
                onClick={() => handleFileRemove(contextMenu.field)}
                style={styles.contextMenuYesBtn}
              >
                Yes
              </button>
              <button
                onClick={() => setContextMenu(null)}
                style={styles.contextMenuNoBtn}
              >
                No
              </button>
            </div>
          </div>
        </>
      )}

      <GoogleMapsLocationPicker
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelect={handleLocationSelect}
        initialQuery={formData.location || formData.address || formData.name || ""}
      />
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#ffffff",
    padding: "1.5rem 0.75rem",
    display: "flex",
    justifyContent: "center",
  },
  page: {
    width: "100%",
    maxWidth: "980px",
    background: "white",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: `2px solid ${MINT_BORDER}`,
  },
  logo: {
    fontSize: "1.75rem",
    fontWeight: "bold",
    color: "#0F6E56",
    margin: 0,
  },
  backLink: {
    fontSize: "0.875rem",
    color: "#0F6E56",
    textDecoration: "none",
    fontWeight: 500,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "0.85rem",
    alignItems: "stretch",
  },
  gridCell: {
    border: `2px solid ${MINT_BORDER}`,
    minHeight: "118px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "0.55rem",
    background: "white",
    boxSizing: "border-box",
  },
  gridLabel: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#333",
    textAlign: "center",
    letterSpacing: "0.08em",
  },
  gridInput: {
    padding: "0.65rem 0.5rem",
    border: "none",
    borderRadius: 0,
    fontSize: "0.95rem",
    outline: "none",
    textAlign: "center",
    background: "transparent",
  },
  readonlyInput: {
    background: "transparent",
    color: "#4b5563",
    cursor: "not-allowed",
  },
  locationField: {
    minHeight: "48px",
    fontSize: "0.95rem",
    color: "#333",
    textAlign: "center",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  attachCell: {
    border: `2px solid ${MINT_BORDER}`,
    minHeight: "190px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    textAlign: "center",
    padding: "0.85rem",
    boxSizing: "border-box",
    transition: "background 0.15s",
    overflow: "hidden",
  },
  mapCell: {
    gridColumn: "1 / span 1",
  },
  attachLabel: {
    fontWeight: 600,
    fontSize: "0.96rem",
    color: "#333",
    display: "inline-block",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    textAlign: "center",
  },
  hiddenInput: {
    display: "none",
  },
  removeFileBtn: {
    position: "absolute",
    right: "0.65rem",
    bottom: "0.65rem",
    padding: "0.35rem 0.6rem",
    border: `1px solid ${MINT_BORDER}`,
    background: "#ffffff",
    color: "#0F6E56",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  otpSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  otpRow: {
    border: `2px solid ${MINT_BORDER}`,
    background: MINT_FILL,
    padding: "0.7rem 0.9rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  otpText: {
    fontSize: "0.9rem",
    color: "#0F6E56",
    margin: 0,
  },
  otpInline: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  otpInput: {
    padding: "0.55rem 0.65rem",
    border: `2px solid ${MINT_BORDER}`,
    borderRadius: 0,
    fontSize: "0.95rem",
    width: "130px",
    letterSpacing: "0.2rem",
    background: "white",
  },
  otpBtn: {
    padding: "0.55rem 0.95rem",
    background: "#0F6E56",
    color: "white",
    border: "none",
    borderRadius: 0,
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  otpResendBtn: {
    padding: "0.55rem 0.95rem",
    background: "transparent",
    color: "#0F6E56",
    border: `1px solid #0F6E56`,
    borderRadius: 0,
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  verifiedStrip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    border: `1px solid ${MINT_BORDER}`,
    background: "#ECFDF5",
    color: "#047857",
    fontWeight: 600,
    fontSize: "0.85rem",
    padding: "0.4rem 0.8rem",
  },
  summaryBox: {
    border: `2px solid ${MINT_BORDER}`,
    background: MINT_FILL,
    padding: "0.8rem 1rem",
  },
  summaryTitle: {
    color: "#0F6E56",
    margin: "0 0 0.5rem 0",
    fontSize: "0.88rem",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.35rem 0.85rem",
    fontSize: "0.82rem",
    color: "#333",
  },
  pendingTag: {
    color: "#0F6E56",
    fontWeight: 600,
  },
  nav: {
    display: "flex",
    justifyContent: "center",
  },
  submitBtn: {
    padding: "1rem 2rem",
    background: "#0F6E56",
    color: "white",
    border: "none",
    borderRadius: 0,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  submitBtnDisabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    textAlign: "left",
    margin: 0,
  },
  loadingHint: {
    color: "#0F6E56",
    fontSize: "0.82rem",
    margin: 0,
  },
  loadingText: {
    color: "#0F6E56",
    textAlign: "center",
    marginTop: "4rem",
  },
  contextMenuOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    background: "transparent",
  },
  contextMenu: {
    position: "fixed",
    zIndex: 1000,
    background: "#ffffff",
    border: `2px solid ${MINT_BORDER}`,
    borderRadius: "6px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
    padding: "0.75rem 1rem",
    minWidth: "220px",
  },
  contextMenuTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#333",
    marginBottom: "0.65rem",
  },
  contextMenuActions: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-end",
  },
  contextMenuYesBtn: {
    padding: "0.4rem 1rem",
    background: "#DC2626",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  contextMenuNoBtn: {
    padding: "0.4rem 1rem",
    background: "transparent",
    color: "#0F6E56",
    border: `1px solid ${MINT_BORDER}`,
    borderRadius: "4px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};

