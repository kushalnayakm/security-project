import { createContext, useCallback, useContext, useRef, useState } from "react";

const RegistrationDraftContext = createContext(null);

/**
 * Holds the entity-registration draft (form fields + uploaded File objects) in memory
 * for the lifetime of the registration flow, shared between EntityRegisterPage and
 * DocumentPreviewPage.
 *
 * WHY this exists instead of sessionStorage:
 * sessionStorage can only hold strings. A real browser File object cannot survive
 * JSON.stringify/JSON.parse — it gets silently reduced to an empty object, which is
 * exactly what caused FastAPI's "Expected UploadFile, received: str" error. Keeping
 * the draft in a React Context means the actual File references never get serialized
 * at all; they just live in memory until the user submits or navigates away.
 */
export function RegistrationDraftProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [formData, setFormData] = useState(null);

  // Track blob preview URLs (from URL.createObjectURL) so we can revoke them on
  // clearDraft() and avoid leaking memory if the user goes back and forth.
  const objectUrlsRef = useRef([]);

  const registerObjectUrl = useCallback((url) => {
    objectUrlsRef.current.push(url);
  }, []);

  const clearDraft = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    objectUrlsRef.current = [];
    setDocuments([]);
    setFormData(null);
  }, []);

  const value = {
    documents,
    setDocuments,
    formData,
    setFormData,
    registerObjectUrl,
    clearDraft,
  };

  return (
    <RegistrationDraftContext.Provider value={value}>
      {children}
    </RegistrationDraftContext.Provider>
  );
}

export function useRegistrationDraft() {
  const ctx = useContext(RegistrationDraftContext);
  if (!ctx) {
    throw new Error("useRegistrationDraft must be used inside a RegistrationDraftProvider");
  }
  return ctx;
}