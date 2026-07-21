import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { entityService } from "../../services/entityService";
import { useRegistrationDraft } from "../../context/RegistrationDraftContext";

function isImage(mimeType) {
  return /^image\/(png|jpeg|jpg|webp|gif|bmp)$/i.test(mimeType);
}

function isPdf(mimeType) {
  return mimeType === "application/pdf" || /\.pdf$/i.test(mimeType);
}

function getDocDisplayName(doc) {
  if (doc.field === "gstDoc") return "GST Certificate";
  if (doc.field === "addressProof") return "Address Proof";
  if (doc.field === "operatorPhoto") return "Operator Photo";
  return doc.name || "Document";
}

export function DocumentPreviewPage() {
  const navigate = useNavigate();
  const { entity: authEntity, isAuthenticated } = useAuth();

  // Documents and formData now come from the shared in-memory context populated by
  // EntityRegisterPage. They are real File objects the whole way through — nothing
  // here reads from or writes to sessionStorage anymore.
  const { documents, formData, clearDraft } = useRegistrationDraft();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewError, setPreviewError] = useState("");

  const currentDoc = documents[currentIndex] || null;
  const totalDocs = documents.length;

  const handlePrevious = () => {
    setPreviewError("");
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setPreviewError("");
    setCurrentIndex((prev) => Math.min(totalDocs - 1, prev + 1));
  };

  const handleSubmit = async () => {
    if (!formData) {
      setError("No registration data found. Please go back and fill the form again.");
      return;
    }

    // Validate mandatory fields before submit
    const missing = [];
    if (!formData.name) missing.push("Entity Name");
    if (!formData.branchName) missing.push("Branch Name");
    if (!formData.phone) missing.push("Phone Number");
    if (!formData.gstNo) missing.push("GST Number");
    if (!formData.address) missing.push("Address");

    const hasGstDoc = documents.some((d) => d.field === "gstDoc");
    const hasAddressProof = documents.some((d) => d.field === "addressProof");
    if (!hasGstDoc) missing.push("GST Certificate");
    if (!hasAddressProof) missing.push("Address Proof");

    if (missing.length > 0) {
      setError(`Missing required fields: ${missing.join(", ")}`);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const payload = new FormData();

      // NOTE: field names below use snake_case to match the actual Postgres/FastAPI
      // naming convention used elsewhere in this project (gst_no, business_type,
      // contact_person, etc). Verify these exactly against the real
      // POST /entity/register (or updateProfile) endpoint's Form(...)/File(...)
      // parameter names before relying on this — see conversation notes.
      payload.append("name", formData.name || "");
      payload.append("branchName", formData.branchName || "");
      payload.append("phone", formData.phone || "");
      payload.append("gstNo", formData.gstNo || "");
      payload.append("address", formData.address || "");
      payload.append("location", formData.location || "");
      payload.append("locationLat", formData.locationLat || "");
      payload.append("locationLng", formData.locationLng || "");

      // Attach the ORIGINAL File objects (never touched sessionStorage, so they are
      // still real File instances here — this is the actual fix for the
      // "Expected UploadFile, received: str" error).
      for (const doc of documents) {
        if (doc.file instanceof File) {
          if (doc.field === "gstDoc") {
            payload.append("gstDoc", doc.file);
          } else if (doc.field === "addressProof") {
            payload.append("addressProof", doc.file);
          } else if (doc.field === "operatorPhoto") {
            payload.append("operatorPhoto", doc.file);
          }
        }
      }

      if (isAuthenticated) {
        await entityService.updateProfile(payload);
        setSuccess("Profile updated successfully!");
        setTimeout(() => {
          clearDraft();
          navigate("/entity/dashboard");
        }, 1500);
      } else {
        const res = await authService.registerEntity(payload);
        if (res.token) {
          localStorage.setItem("token", res.token);
          localStorage.setItem("entity", JSON.stringify(res.entity));
          localStorage.setItem("role", res.role);
          setSuccess("Registration successful! Redirecting...");
          setTimeout(() => {
            clearDraft();
            // Use React Router navigate instead of window.location.href to avoid
            // a full page reload. This preserves the in-memory auth state and
            // keeps browser history intact for proper Back/Forward navigation.
            navigate("/entity/dashboard");
          }, 1500);
        } else {
          clearDraft();
          navigate("/auth/entity/login");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToRegistration = () => {
    navigate("/auth/entity/register");
  };

  // Empty state
  if (totalDocs === 0 && !error) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2 style={styles.emptyTitle}>No Documents to Preview</h2>
          <p style={styles.emptyText}>
            Please upload documents on the registration page first.
          </p>
          <button onClick={handleBackToRegistration} style={styles.backBtn}>
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  const docDisplayName = currentDoc ? getDocDisplayName(currentDoc) : "";
  const docFileName = currentDoc?.name || "Unknown file";
  const docMimeType = currentDoc?.type || "";

  return (
    <div style={styles.container}>
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Preview Document</h1>
          <button onClick={handleBackToRegistration} style={styles.headerBackBtn}>
            Back to Registration
          </button>
        </div>

        {/* Error / Success messages */}
        {error && <div style={styles.errorBanner}>{error}</div>}
        {success && <div style={styles.successBanner}>{success}</div>}

        {/* Top Center: Current Document indicator */}
        <div style={styles.docIndicator}>
          <div style={styles.docCounter}>
            {currentIndex + 1} of {totalDocs}
          </div>
          <div style={styles.docTypeLabel}>{docDisplayName}</div>
        </div>

        {/* Document Navigation */}
        <div style={styles.navBar}>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            style={{
              ...styles.navBtn,
              ...(currentIndex === 0 ? styles.navBtnDisabled : {}),
            }}
          >
            ← Previous
          </button>

          <div style={styles.navFilename}>
            {docFileName}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === totalDocs - 1}
            style={{
              ...styles.navBtn,
              ...(currentIndex === totalDocs - 1 ? styles.navBtnDisabled : {}),
            }}
          >
            Next →
          </button>
        </div>

        {/* Preview Area */}
        <div style={styles.previewContainer}>
          {previewError ? (
            <div style={styles.previewErrorState}>
              <div style={styles.previewErrorIcon}>⚠</div>
              <p style={styles.previewErrorText}>Unable to preview this document.</p>
              <p style={styles.previewErrorHint}>You can still continue with submission.</p>
            </div>
          ) : currentDoc ? (
            <>
              {currentDoc.previewUrl && isImage(docMimeType) ? (
                <img
                  src={currentDoc.previewUrl}
                  alt={docFileName}
                  style={styles.previewImage}
                  onError={() => setPreviewError("Unable to render this image.")}
                />
              ) : currentDoc.previewUrl && isPdf(docMimeType) ? (
                <iframe
                  src={`${currentDoc.previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  title={docFileName}
                  style={styles.previewPdf}
                  onError={() => setPreviewError("Unable to render this PDF.")}
                />
              ) : currentDoc.previewUrl ? (
                <iframe
                  src={currentDoc.previewUrl}
                  title={docFileName}
                  style={styles.previewPdf}
                  onError={() => setPreviewError("Unable to render this document.")}
                />
              ) : (
                <div style={styles.previewLoadingState}>
                  <div style={styles.spinner}></div>
                  <p style={styles.previewLoadingText}>Loading Document...</p>
                </div>
              )}
            </>
          ) : (
            <div style={styles.previewLoadingState}>
              <div style={styles.spinner}></div>
              <p style={styles.previewLoadingText}>Loading Document...</p>
            </div>
          )}
        </div>

        {/* Bottom Counter */}
        <div style={styles.bottomCounter}>
          {currentIndex + 1} of {totalDocs}
        </div>

        {/* Submit Area */}
        <div style={styles.submitArea}>
          <button
            onClick={handleSubmit}
            disabled={submitting || totalDocs === 0}
            style={{
              ...styles.submitBtn,
              ...(submitting || totalDocs === 0 ? styles.submitBtnDisabled : {}),
            }}
          >
            {submitting ? "Submitting..." : "Submit Preview"}
          </button>
        </div>
      </div>
    </div>
  );
}

const MINT_FILL = "#D6FBF5";
const MINT_BORDER = "#2FBF9B";

const styles = {
  container: {
    minHeight: "100vh",
    background: "#ffffff",
    display: "flex",
    justifyContent: "center",
    padding: "1.5rem 0.75rem",
  },
  page: {
    width: "100%",
    maxWidth: "980px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "1rem",
    borderBottom: `2px solid ${MINT_BORDER}`,
  },
  headerTitle: {
    fontSize: "1.75rem",
    fontWeight: "bold",
    color: "#0F6E56",
    margin: 0,
  },
  headerBackBtn: {
    padding: "0.5rem 1rem",
    background: "transparent",
    color: "#0F6E56",
    border: `1px solid ${MINT_BORDER}`,
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  errorBanner: {
    padding: "0.75rem 1rem",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "4px",
    color: "#DC2626",
    fontSize: "0.875rem",
  },
  successBanner: {
    padding: "0.75rem 1rem",
    background: "#ECFDF5",
    border: `1px solid ${MINT_BORDER}`,
    borderRadius: "4px",
    color: "#047857",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  docIndicator: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.5rem 0",
  },
  docCounter: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#0F6E56",
  },
  docTypeLabel: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  navBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "0.5rem 0",
  },
  navBtn: {
    padding: "0.55rem 1.25rem",
    background: MINT_FILL,
    color: "#0F6E56",
    border: `2px solid ${MINT_BORDER}`,
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    minWidth: "120px",
  },
  navBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  navFilename: {
    fontSize: "0.85rem",
    color: "#6B7280",
    textAlign: "center",
    wordBreak: "break-word",
    maxWidth: "300px",
    fontWeight: 500,
  },
  previewContainer: {
    flex: 1,
    minHeight: "500px",
    border: `2px solid ${MINT_BORDER}`,
    borderRadius: "8px",
    background: "#FAFAFA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    display: "block",
  },
  previewPdf: {
    width: "100%",
    height: "100%",
    border: "none",
    minHeight: "500px",
  },
  previewLoadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    padding: "2rem",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #E5E7EB",
    borderTopColor: "#0F6E56",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  previewLoadingText: {
    color: "#0F6E56",
    fontSize: "0.95rem",
    margin: 0,
  },
  previewErrorState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "2rem",
    textAlign: "center",
  },
  previewErrorIcon: {
    fontSize: "2.5rem",
  },
  previewErrorText: {
    color: "#DC2626",
    fontSize: "0.95rem",
    fontWeight: 600,
    margin: 0,
  },
  previewErrorHint: {
    color: "#6B7280",
    fontSize: "0.85rem",
    margin: 0,
  },
  bottomCounter: {
    textAlign: "center",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#0F6E56",
    padding: "0.25rem 0",
  },
  submitArea: {
    padding: "1rem",
    background: MINT_FILL,
    border: `2px solid ${MINT_BORDER}`,
    borderRadius: "8px",
    display: "flex",
    justifyContent: "center",
  },
  submitBtn: {
    padding: "1rem 2rem",
    background: "#0F6E56",
    color: "white",
    border: "none",
    borderRadius: "0",
    fontSize: "1.05rem",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    maxWidth: "400px",
  },
  submitBtnDisabled: {
    background: "#9CA3AF",
    cursor: "not-allowed",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "1rem",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    color: "#0F6E56",
    margin: 0,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: "0.95rem",
    margin: 0,
  },
  backBtn: {
    padding: "0.65rem 1.5rem",
    background: "#0F6E56",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};


