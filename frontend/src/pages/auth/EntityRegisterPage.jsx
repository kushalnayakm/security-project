import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { GoogleMapsLocationPicker } from "../../components/GoogleMapsLocationPicker";
import { useRegistrationDraft } from "../../context/RegistrationDraftContext";

const MINT = "#2FBF9B";
const BORDER = "#d7e7e3";
const TEXT = "#1f2937";
const MUTED = "#6b7280";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function Icon({ children }) {
  return <span style={styles.iconWrap} aria-hidden="true">{children}</span>;
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8M8 17h8" />
    </svg>
  );
}

function FieldCard({ icon, label, required, value, onChange, type = "text", as = "input", placeholder }) {
  return (
    <label style={{ ...styles.card, ...styles.fieldCard, ...(value ? styles.cardHasValue : {}) }}>
      <div style={styles.cardLabelRow}>
        <Icon>{icon}</Icon>
        <span style={styles.cardLabel}>{label}{required ? " *" : ""}</span>
      </div>
      {as === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || " "}
          style={{ ...styles.input, ...styles.textarea }}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || " "}
          style={styles.input}
        />
      )}
    </label>
  );
}

function UploadCard({ title, file, onPick, onRemove, accept, photo = false, previewUrl = "", showMap = false, location = "", mapsUrl = "", inputRef = null, compact = false }) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  useEffect(() => {
    if (!(file instanceof File) || !file.type?.startsWith("image/")) {
      setLocalPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleCardClick = () => {
    if (showMap) {
      onPick?.();
      return;
    }
    inputRef?.current?.click();
  };

  return (
    <div style={{ ...styles.card, ...styles.uploadCard, ...(file || location ? styles.uploadSelected : {}) }} onClick={handleCardClick} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick()}>
      <div style={styles.cardLabelRow}>
        <Icon>{photo ? <CameraIcon /> : showMap ? <LocationIcon /> : <DocIcon />}</Icon>
        <span style={styles.cardLabel}>{title}</span>
        {file || location ? <span style={styles.checkBadge}>✓</span> : null}
      </div>

      {photo ? (
        <div style={styles.fileRow}>
          <div style={styles.photoPreviewWrap}>
            {file && (previewUrl || localPreviewUrl) ? <img src={previewUrl || localPreviewUrl} alt={file.name} style={styles.photoPreview} /> : <div style={styles.photoPlaceholder}>o</div>}
          </div>
          <div style={styles.fileMeta}>
            <div style={styles.fileName}>{file ? file.name : "Click anywhere to upload"}</div>
            <div style={styles.fileSize}>{file ? formatFileSize(file.size) : "PNG, JPG, WEBP"}</div>
          </div>
          {file && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={styles.removeBtn} aria-label={`Remove ${title}`}>x</button>}
        </div>
      ) : showMap ? (
        <div style={styles.mapBlock}>
          {location ? (
            <>
              <div style={styles.mapPreview}>
                <div style={styles.mapPin}>map</div>
                <div style={styles.mapPreviewText}>Google Maps preview</div>
              </div>
              <div style={styles.fileMeta}>
                <div style={styles.fileName}>{location}</div>
                <a href={mapsUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={styles.mapLink}>
                  View on Google Maps
                </a>
              </div>
            </>
          ) : (
            <div style={styles.placeholderText}>{GOOGLE_MAPS_API_KEY ? "Tap to choose a location" : "Google Maps unavailable"}</div>
          )}
        </div>
      ) : (
        <div style={styles.fileRow}>
          <div style={compact ? styles.logoPreviewWrap : styles.fileTypeIcon}>
            {compact && file && (previewUrl || localPreviewUrl) ? (
              <img src={previewUrl || localPreviewUrl} alt={file.name} style={styles.logoPreview} />
            ) : file && (previewUrl || localPreviewUrl) && file.type?.startsWith("image/") ? (
              <img src={previewUrl || localPreviewUrl} alt={file.name} style={styles.docPreviewImage} />
            ) : compact ? (
              <div style={styles.didPlaceholder}>
                <img src="/did-logo.png" alt="" style={styles.didPlaceholderLogo} />
              </div>
            ) : (
              <FileIcon />
            )}
          </div>
          <div style={styles.fileMeta}>
            <div style={styles.fileName}>{file ? file.name : "Click anywhere to upload"}</div>
            <div style={styles.fileSize}>{file ? formatFileSize(file.size) : "PDF, PNG, JPG"}</div>
          </div>
          {file && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={styles.removeBtn} aria-label={`Remove ${title}`}>x</button>}
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} onChange={onPick} style={styles.hiddenInput} />
    </div>
  );
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function buildMapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function isPreviewableFile(file) {
  return Boolean(file && (file.type?.startsWith("image/") || file.type === "application/pdf"));
}

export function EntityRegisterPage() {
  const navigate = useNavigate();
  const { clearDraft, setDocuments, setFormData: setDraftFormData, registerObjectUrl } = useRegistrationDraft();
  useAuth();
  const [error, setError] = useState("");
  const [submitting] = useState(false);
  const [profileLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(45);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [operatorPreviewUrl, setOperatorPreviewUrl] = useState("");
  const [entityLogoPreviewUrl, setEntityLogoPreviewUrl] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    entityName: "",
    branchName: "",
    phone: "",
    email: "",
    gstNo: "",
    gstDoc: null,
    entityLicence: null,
    address: "",
    addressProof: null,
    entityLogo: null,
    operatorPhoto: null,
    location: "",
    locationLat: "",
    locationLng: "",
  });

  const fileInputRefs = {
    gstDoc: useRef(null),
    entityLicence: useRef(null),
    addressProof: useRef(null),
    operatorPhoto: useRef(null),
    entityLogo: useRef(null),
  };

  useEffect(() => {
    clearDraft();
  }, [clearDraft]);

  useEffect(() => {
    if (!(formData.operatorPhoto instanceof File)) {
      setOperatorPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(formData.operatorPhoto);
    setOperatorPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.operatorPhoto]);

  useEffect(() => {
    if (!(formData.entityLogo instanceof File)) {
      setEntityLogoPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(formData.entityLogo);
    setEntityLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.entityLogo]);

  useEffect(() => {
    if (otpStep !== 2 || otpVerified) return undefined;
    setOtpCountdown(45);
    const timer = window.setInterval(() => {
      setOtpCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpStep, otpVerified]);

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const pickFile = (field, event) => {
    const file = event?.target?.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, [field]: file }));
  };
  const removeFile = (field) => setFormData((prev) => ({ ...prev, [field]: null }));

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
      setOtpCountdown(45);
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

  const mandatoryFields = ["name", "branchName", "phone", "gstNo", "address"];
  const mandatoryFiles = ["gstDoc", "addressProof"];
  const isStepValid = mandatoryFields.every((field) => formData[field]) && mandatoryFiles.every((field) => formData[field]) && otpVerified;
  const summaryStatus = otpVerified ? "PHONE_VERIFIED" : "PENDING_VERIFICATION";
  const locationMapsUrl = formData.location ? buildMapsUrl(formData.location) : "";

  const handleContinue = () => {
    if (!isStepValid) {
      setError(!otpVerified ? "Please verify your phone number with OTP before continuing" : "Please fill all required fields marked with *");
      return;
    }

    setError("");
    const documents = [];

    if (formData.gstDoc instanceof File) {
      const previewUrl = URL.createObjectURL(formData.gstDoc);
      registerObjectUrl(previewUrl);
      documents.push({ field: "gstDoc", file: formData.gstDoc, name: formData.gstDoc.name, type: formData.gstDoc.type, size: formData.gstDoc.size, previewUrl });
    }
    if (formData.addressProof instanceof File) {
      const previewUrl = URL.createObjectURL(formData.addressProof);
      registerObjectUrl(previewUrl);
      documents.push({ field: "addressProof", file: formData.addressProof, name: formData.addressProof.name, type: formData.addressProof.type, size: formData.addressProof.size, previewUrl });
    }
    if (formData.entityLicence instanceof File) {
      const previewUrl = URL.createObjectURL(formData.entityLicence);
      registerObjectUrl(previewUrl);
      documents.push({ field: "entityLicence", file: formData.entityLicence, name: formData.entityLicence.name, type: formData.entityLicence.type, size: formData.entityLicence.size, previewUrl });
    }
    if (formData.operatorPhoto instanceof File) {
      const previewUrl = URL.createObjectURL(formData.operatorPhoto);
      registerObjectUrl(previewUrl);
      documents.push({ field: "operatorPhoto", file: formData.operatorPhoto, name: formData.operatorPhoto.name, type: formData.operatorPhoto.type, size: formData.operatorPhoto.size, previewUrl });
    }
    if (formData.entityLogo instanceof File) {
      const previewUrl = URL.createObjectURL(formData.entityLogo);
      registerObjectUrl(previewUrl);
      documents.push({ field: "entityLogo", file: formData.entityLogo, name: formData.entityLogo.name, type: formData.entityLogo.type, size: formData.entityLogo.size, previewUrl });
    }

    setDocuments(documents);
    setDraftFormData({
      name: formData.name,
      entityName: formData.entityName,
      branchName: formData.branchName,
      phone: formData.phone,
      email: formData.email,
      gstNo: formData.gstNo,
      address: formData.address,
      location: formData.location,
      locationLat: formData.locationLat,
      locationLng: formData.locationLng,
    });

    navigate("/entity/register/preview");
  };

  return (
    <div style={styles.shell}>
      <div style={styles.page}>
        <header style={styles.header}>
          <img src="/did-logo.png" alt="DID" style={styles.logo} />
        </header>

        <section style={styles.grid}>
          <FieldCard icon={<BuildingIcon />} label="Entity Name" required value={formData.name} onChange={(v) => handleChange("name", v)} />
          <FieldCard icon={<PercentIcon />} label="GST Number" required value={formData.gstNo} onChange={(v) => handleChange("gstNo", v)} />
          <FieldCard icon={<PhoneIcon />} label="Phone Number" required value={formData.phone} onChange={(v) => handleChange("phone", v)} />

          <FieldCard icon={<BranchIcon />} label="Entity Branch" required value={formData.branchName} onChange={(v) => handleChange("branchName", v)} />
          <UploadCard title="GST Certificate" file={formData.gstDoc} onPick={(e) => pickFile("gstDoc", e)} onRemove={() => removeFile("gstDoc")} accept=".pdf,.jpg,.jpeg,.png,.webp" inputRef={fileInputRefs.gstDoc} />
          <section style={{ ...styles.card, ...styles.otpCard }}>
            <div style={styles.cardLabelRow}>
              <Icon><PhoneIcon /></Icon>
              <span style={styles.cardLabel}>Verification (OTP)</span>
            </div>
            {!otpVerified ? (
              <div style={styles.otpBody}>
                <div style={styles.otpText}>{otpStep === 1 ? "Phone Verification" : "Enter the 6-digit OTP sent to your phone"}</div>
                {otpStep === 1 && <button type="button" onClick={handleSendOtp} disabled={otpLoading} style={styles.miniBtn}>{otpLoading ? "Sending..." : "Send OTP"}</button>}
                {otpStep === 2 && (
                  <div style={styles.otpStack}>
                    <div style={styles.otpBoxes} aria-label="OTP input">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <input
                          key={index}
                          type="text"
                          value={otp[index] || ""}
                          onChange={(e) => {
                            const digit = e.target.value.replace(/\D/g, "").slice(-1);
                            const nextOtp = otp.split("");
                            nextOtp[index] = digit;
                            setOtp(nextOtp.join("").slice(0, 6));
                            if (digit && e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !otp[index] && e.currentTarget.previousElementSibling) {
                              e.currentTarget.previousElementSibling.focus();
                            }
                          }}
                          maxLength={1}
                          style={styles.otpBox}
                          aria-label={`OTP digit ${index + 1}`}
                        />
                      ))}
                    </div>
                    <div style={styles.otpActions}>
                      <button type="button" onClick={handleVerifyOtp} disabled={otpLoading || otp.length !== 6} style={styles.miniBtn}>{otpLoading ? "Verifying..." : "Verify OTP"}</button>
                      <button type="button" onClick={handleResendOtp} disabled={otpLoading} style={styles.outlineBtn}>Resend OTP</button>
                    </div>
                    <div style={styles.resendText}>Resend OTP in 00:{String(otpCountdown).padStart(2, "0")}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.verifiedStrip}>✓ Phone Verified</div>
            )}
          </section>

          <UploadCard title="Locate on Maps" file={null} onPick={handleLocatePick} onRemove={() => {}} accept="" showMap location={formData.location} mapsUrl={locationMapsUrl} />
          <UploadCard title="Address Proof" file={formData.addressProof} onPick={(e) => pickFile("addressProof", e)} onRemove={() => removeFile("addressProof")} accept=".pdf,.jpg,.jpeg,.png,.webp" inputRef={fileInputRefs.addressProof} />
          <UploadCard title="Operator Photo" file={formData.operatorPhoto} onPick={(e) => pickFile("operatorPhoto", e)} onRemove={() => removeFile("operatorPhoto")} accept=".jpg,.jpeg,.png,.webp" photo previewUrl={operatorPreviewUrl} inputRef={fileInputRefs.operatorPhoto} />

          <UploadCard title="Entity Licence" file={formData.entityLicence} onPick={(e) => pickFile("entityLicence", e)} onRemove={() => removeFile("entityLicence")} accept=".pdf,.jpg,.jpeg,.png" inputRef={fileInputRefs.entityLicence} />
          <UploadCard title="Entity Logo" file={formData.entityLogo} onPick={(e) => pickFile("entityLogo", e)} onRemove={() => removeFile("entityLogo")} accept=".png,.jpg,.jpeg,.webp,.svg" previewUrl={entityLogoPreviewUrl} inputRef={fileInputRefs.entityLogo} compact />
        </section>

        {profileLoading && <p style={styles.loadingHint}>Loading profile data...</p>}
        {error && <p style={styles.error}>{error}</p>}

        

        <div style={styles.nav}>
          <button type="button" onClick={handleContinue} disabled={!isStepValid || submitting} style={{ ...styles.submitBtn, ...((!isStepValid || submitting) ? styles.submitBtnDisabled : {}) }}>
            <span>Register Entity</span>
            <span style={styles.arrow}>-&gt;</span>
          </button>
        </div>

        <section style={styles.summaryBox}>
          <h4 style={styles.summaryTitle}>Registration Summary</h4>
          <div style={styles.summaryGrid}>
            <div><strong>Entity Name:</strong> {formData.name || "-"}</div>
            <div><strong>Branch:</strong> {formData.branchName || "-"}</div>
            <div><strong>GST:</strong> {formData.gstNo || "-"}</div>
            <div><strong>Phone:</strong> {formData.phone || "-"}</div>
            <div><strong>Address:</strong> {formData.address || "-"}</div>
            <div><strong>Location:</strong> {formData.location || "Not Provided"}</div>
            <div><strong>Status:</strong> <span style={styles.pendingTag}>{summaryStatus}</span></div>
          </div>
        </section>

        <p style={styles.footerNote}>Your information is secure and encrypted.</p>
      </div>

      <GoogleMapsLocationPicker
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelect={handleLocationSelect}
        initialQuery={formData.location || formData.address || formData.name || ""}
      />
    </div>
  );
}

function BuildingIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V7a1 1 0 0 1 1-1h6v15" /><path d="M14 21V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v17" /><path d="M2 21h20" /><path d="M7 10h1M7 14h1M17 8h1M17 12h1M17 16h1" /></svg>;
}
function PercentIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /></svg>;
}
function PhoneIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v2.1a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 6.2 2 2 0 0 1 5 4h2.1a2 2 0 0 1 2 1.7c.1.7.3 1.4.5 2a2 2 0 0 1-.5 2.1L8 10.9a16 16 0 0 0 5.1 5.1l1.1-1.1a2 2 0 0 1 2.1-.5c.6.2 1.3.4 2 .5a2 2 0 0 1 1.7 2z" /></svg>;
}
function BranchIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v5m0 0L5 17m7-5 7 5" /></svg>;
}
function LocationIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>;
}
function DocIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>;
}
function CameraIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /><circle cx="12" cy="13" r="3.2" /></svg>;
}

const styles = {
  shell: { minHeight: "100vh", background: "#fff", padding: "18px 18px 36px" },
  page: { maxWidth: 1280, margin: "0 auto", animation: "fadeIn 320ms ease-out" },
  header: { display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 20, paddingBottom: 18, marginBottom: 18, minHeight: 112 },
  logo: { width: 150, maxWidth: "100%", height: "auto", objectFit: "contain", display: "block" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18, background: "#fff", alignItems: "stretch" },
  card: { border: `1px solid ${MINT}`, borderRadius: 0, background: "#fff", boxShadow: "none", overflow: "hidden", transition: "border-color 180ms ease, background-color 180ms ease, transform 180ms ease" },
  fieldCard: { minHeight: 126, padding: "18px 18px 16px" },
  uploadCard: { minHeight: 126, padding: "18px", cursor: "pointer" },
  uploadSelected: { background: "#EAFBF7", borderColor: MINT, animation: "fadeIn 180ms ease-out" },
  otpCard: { minHeight: 126, padding: "18px" },
  cardLabelRow: { display: "flex", alignItems: "center", gap: 12, color: MINT, marginBottom: 14 },
  iconWrap: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, color: MINT, flex: "0 0 auto" },
  cardLabel: { fontSize: 14, fontWeight: 700, letterSpacing: "0.03em", color: "#475569", textTransform: "uppercase" },
  cardHasValue: { background: "#fcfffe" },
  input: { width: "100%", border: "none", borderBottom: "1px solid #b9ddd5", outline: "none", fontSize: 16, color: TEXT, background: "transparent", padding: "4px 2px 8px" },
  textarea: { resize: "none", minHeight: 82, lineHeight: 1.45 },
  fileRow: { display: "flex", alignItems: "center", gap: 14, position: "relative" },
  fileTypeIcon: { width: 54, height: 68, borderRadius: 0, border: `1px solid ${MINT}`, display: "grid", placeItems: "center", color: MINT, background: "#fff", flex: "0 0 auto" },
  docPreviewImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  docPreviewFrame: { width: "100%", height: "100%", border: "none", display: "block" },
  fileMeta: { minWidth: 0, flex: 1 },
  fileName: { fontSize: 15, color: TEXT, fontWeight: 500, whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word" },
  fileSize: { fontSize: 13, color: MUTED, marginTop: 6 },
  removeBtn: { border: `1px solid ${MINT}`, background: "#fff", color: MINT, width: 30, height: 30, borderRadius: 0, cursor: "pointer", flex: "0 0 auto" },
  hiddenInput: { display: "none" },
  photoPreviewWrap: { width: 46, height: 46, borderRadius: "50%", overflow: "hidden", border: `1px solid ${MINT}`, background: "#f7fbfa", flex: "0 0 auto" },
  photoPreview: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  photoPlaceholder: { width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 18, color: MINT },
  logoPreviewWrap: { width: 54, height: 54, borderRadius: 0, overflow: "hidden", border: `1px solid ${MINT}`, background: "#fff", flex: "0 0 auto" },
  logoPreview: { width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 4, boxSizing: "border-box" },
  didPlaceholder: { width: "100%", height: "100%", display: "grid", placeItems: "center", background: "#fff" },
  didPlaceholderLogo: { width: 30, height: 30, objectFit: "contain", display: "block", opacity: 0.75 },
  checkBadge: { marginLeft: "auto", color: MINT, fontSize: 12, fontWeight: 800, lineHeight: 1, background: "#fff", border: `1px solid ${MINT}`, padding: "2px 5px" },
  mapBlock: { display: "flex", flexDirection: "column", gap: 10 },
  mapPreview: { height: 84, borderRadius: 0, border: `1px solid ${MINT}`, background: "#eafbf7", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: MINT },
  mapPin: { fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  mapPreviewText: { fontSize: 13, fontWeight: 600 },
  mapLink: { color: MINT, textDecoration: "none", fontSize: 14, fontWeight: 600 },
  placeholderText: { color: MUTED, fontSize: 14, paddingTop: 18, minHeight: 54 },
  otpBody: { display: "flex", flexDirection: "column", gap: 12 },
  otpText: { color: TEXT, fontSize: 14, fontWeight: 600 },
  otpStack: { display: "flex", flexDirection: "column", gap: 10 },
  otpBoxes: { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 },
  otpBox: { width: "100%", aspectRatio: "1 / 1", border: `1px solid ${MINT}`, borderRadius: 0, textAlign: "center", fontSize: 16, fontWeight: 700, color: TEXT, outline: "none", background: "#fff" },
  otpActions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  miniBtn: { border: "none", borderRadius: 0, background: MINT, color: "#fff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  outlineBtn: { border: `1px solid ${MINT}`, borderRadius: 0, background: "#fff", color: MINT, padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  resendText: { color: MINT, fontSize: 13, fontWeight: 600 },
  verifiedStrip: { display: "inline-flex", alignItems: "center", border: `1px solid ${MINT}`, borderRadius: 0, background: "#eafbf7", color: "#0f7a63", padding: "10px 14px", fontWeight: 700, fontSize: 13 },
  summaryBox: { marginTop: 18, border: `1px solid ${MINT}`, borderRadius: 0, background: "#fff", padding: 16 },
  summaryTitle: { margin: "0 0 12px", color: MINT, fontSize: 14, letterSpacing: "0.04em", textTransform: "uppercase" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, fontSize: 13, color: TEXT },
  pendingTag: { color: MINT, fontWeight: 700 },
  nav: { display: "flex", justifyContent: "center", marginTop: 22 },
  submitBtn: { minWidth: 360, padding: "16px 26px", border: "none", borderRadius: 0, background: `linear-gradient(90deg, ${MINT} 0%, #2aa98d 100%)`, color: "#fff", fontSize: 16, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 14, cursor: "pointer", boxShadow: "none", transition: "transform 160ms ease, opacity 160ms ease" },
  submitBtnDisabled: { opacity: 0.6, cursor: "not-allowed", boxShadow: "none" },
  arrow: { fontSize: 24, lineHeight: 1 },
  error: { color: "#c2410c", marginTop: 14, fontSize: 14 },
  loadingHint: { color: MINT, marginTop: 12, fontSize: 13 },
  footerNote: { textAlign: "center", color: MUTED, fontSize: 13, marginTop: 14 },
};
