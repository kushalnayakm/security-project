import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { entityService } from "../../services/entityService";
import { useDynamicBranding } from "../../hooks/useDynamicBranding";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1").replace(/\/api\/v1\/?$/, "");
const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='80' fill='%23effbfc'/%3E%3Ccircle cx='80' cy='58' r='30' fill='%2394dbe0'/%3E%3Cpath d='M32 138c10-27 31-42 48-42 18 0 39 15 48 42' fill='%2394dbe0'/%3E%3C/svg%3E";

function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_ORIGIN}/${String(path).replace(/^\/+/, "")}`;
}

function extractAcademicYear(title) {
  const match = String(title || "").match(/\b(20\d{2}\s*-\s*20\d{2})\b/);
  return match ? match[1].replace(/\s+/g, "") : null;
}

function getSectionLabel(title, entityName) {
  const year = extractAcademicYear(title);
  return year ? `Students ${year}` : `${entityName} folders`;
}

function getFolderLabel(title) {
  const normalized = String(title || "").trim();
  const year = extractAcademicYear(normalized);
  if (!year) return normalized || "Untitled";

  const cleaned = normalized.replace(year, "").replace(/[-:]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || year;
}

function splitVerticalText(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .split("");
}

function buildWorkspaceSections(forms, submissionCounts, entityName) {
  const grouped = new Map();

  for (const form of forms) {
    const sectionTitle = getSectionLabel(form.title, entityName);
    if (!grouped.has(sectionTitle)) {
      grouped.set(sectionTitle, []);
    }

    grouped.get(sectionTitle).push({
      id: form.form_id,
      title: getFolderLabel(form.title),
      count: submissionCounts[form.form_id] ?? 0,
    });
  }

  return Array.from(grouped.entries()).map(([title, items]) => ({ title, items }));
}

export function EntityDashboardPage() {
  const { logout, entity: authEntity } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [workspaceSections, setWorkspaceSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  const [logoutHover, setLogoutHover] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [profileRes, formsRes] = await Promise.all([
          entityService.getProfile(),
          entityService.getForms(),
        ]);

        setProfile(profileRes);

        const forms = formsRes?.existingForms || [];
        const submissionPairs = await Promise.all(
          forms.map(async (form) => {
            try {
              const submissions = await entityService.getFormSubmissions(form.form_id);
              return [form.form_id, Array.isArray(submissions) ? submissions.length : 0];
            } catch {
              return [form.form_id, 0];
            }
          }),
        );

        const submissionCounts = Object.fromEntries(submissionPairs);
        const resolvedEntityName = profileRes?.name || authEntity?.name || profileRes?.parent_name || "Entity";
        const sections = buildWorkspaceSections(forms, submissionCounts, resolvedEntityName);

        setWorkspaceSections(
          sections.length > 0
            ? sections
            : [{ title: `${resolvedEntityName} folders`, items: [] }],
        );
      } catch (err) {
        setError(err.message || "Failed to load dashboard details.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [authEntity]);

  // Trigger fade-in after mount
  useEffect(() => {
    const timer = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const mergedProfile = {
    ...authEntity,
    ...profile,
  };
  const logoUrl = resolveAssetUrl(mergedProfile.logo_url);
  const displayLogoUrl = logoUrl || "/did-logo.png";
  const { primary, secondary, accent, isExtracted } = useDynamicBranding(logoUrl);
  const operatorPhotoUrl = resolveAssetUrl(mergedProfile.operator_photo) || DEFAULT_AVATAR;
  const qrImageUrl = resolveAssetUrl(mergedProfile.qr_image_url);
  const entityName = mergedProfile.name || authEntity?.name || mergedProfile.parent_name || "Entity";
  const branchName =
    mergedProfile.branch_name ||
    authEntity?.branch_name ||
    (mergedProfile.entity_type === "BRANCH" ? mergedProfile.parent_name || "Branch" : "Main Campus");
  const gstNo = mergedProfile.gst_no || mergedProfile.gstNo || "";
  const phone = mergedProfile.phone || authEntity?.phone || "";
  const address = mergedProfile.address || "";
  const locationText = mergedProfile.location || "";
  const gstDocumentUrl = resolveAssetUrl(mergedProfile.gst_doc_url);
  const addressProofUrl = resolveAssetUrl(mergedProfile.address_proof_url);
  const isLaptop = viewportWidth <= 1440;
  const isTablet = viewportWidth <= 1100;
  const isMobile = viewportWidth <= 820;

  const handleLogout = () => {
    logout();
    navigate("/entity/login");
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading dashboard details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>Error: {error}</p>
        <button onClick={() => window.location.reload()} style={styles.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.container,
        borderTopColor: primary,
        opacity: fadeIn ? 1 : 0,
        transition: "opacity 300ms ease-in-out, border-color 450ms ease-in-out, color 450ms ease-in-out, background-color 450ms ease-in-out",
      }}
    >
      <main
        style={{
          ...styles.main,
          padding: isMobile ? "10px" : isTablet ? "12px" : "12px 16px 20px",
        }}
      >
        <div
          style={{
            ...styles.dashboardShell,
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "280px minmax(0, 1fr)" : "320px minmax(0, 1fr)",
          }}
        >
          <aside
            style={{
              ...styles.sidebar,
              borderColor: secondary,
              transition: "border-color 450ms ease-in-out, opacity 400ms ease",
              padding: isMobile ? "18px 14px" : isTablet ? "20px 16px 16px" : styles.sidebar.padding,
            }}
          >
            {/* Section 1: Entity Name, Branch Name, Entity Logo */}
            <div style={styles.sidebarSection}>
              <div style={styles.entityTitleBlock}>
                <h1 style={{ ...styles.entityTitle, color: primary, transition: "color 450ms ease-in-out" }}>{entityName}</h1>
                <p style={styles.entitySubtitle}>{branchName}</p>
              </div>

              <div style={{ ...styles.brandImageWrap, borderColor: secondary, transition: "border-color 450ms ease-in-out" }}>
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt="Entity logo"
                    style={{
                      ...styles.brandImage,
                      opacity: fadeIn ? 1 : 0,
                      transition: "opacity 400ms ease-in-out",
                    }}
                  />
                ) : (
                  <div style={{ ...styles.brandFallback, color: primary }}>
                    <BuildingIcon />
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...styles.separator, borderTopColor: secondary, transition: "border-color 450ms ease-in-out" }} />

            {/* Section 2: Operator Photo */}
            <div style={styles.sidebarSection}>
              <div style={{ ...styles.operatorImageWrap, borderColor: secondary, transition: "border-color 450ms ease-in-out" }}>
                <img src={operatorPhotoUrl} alt="Operator" style={styles.operatorImage} />
              </div>
            </div>

            <div style={{ ...styles.separator, borderTopColor: secondary, transition: "border-color 450ms ease-in-out" }} />

            {/* Section 3: DID QR Code */}
            <div style={styles.sidebarSection}>
              <div style={{ ...styles.qrFrame, borderColor: secondary, transition: "border-color 450ms ease-in-out" }}>
                {qrImageUrl ? (
                  <img src={qrImageUrl} alt="Entity QR Code" style={styles.qrImage} />
                ) : (
                  <div style={{ ...styles.qrEmpty, color: primary }}>QR Not Assigned</div>
                )}
              </div>
            </div>

            <div style={{ ...styles.separator, borderTopColor: secondary, transition: "border-color 450ms ease-in-out" }} />

            {/* Logout Button */}
            <button
              style={{
                ...styles.logoutBtn,
                borderColor: secondary,
                color: primary,
                transition: "background 200ms ease, color 200ms ease, border-color 450ms ease-in-out",
                ...(logoutHover ? { background: secondary, borderColor: secondary, color: "#ffffff" } : {}),
              }}
              onMouseEnter={() => setLogoutHover(true)}
              onMouseLeave={() => setLogoutHover(false)}
              onClick={handleLogout}
            >
              Logout
            </button>
          </aside>

          <section
            style={{
              ...styles.workspace,
              padding: isMobile ? "4px 8px 8px" : isLaptop ? "6px 8px 0" : styles.workspace.padding,
            }}
          >
            {workspaceSections.map((section, sectionIndex) => (
              <div key={`${section.title}-${sectionIndex}`} style={styles.workspaceSection}>
                <div
                  style={{
                    ...styles.sectionHeader,
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: isMobile ? "10px" : 0,
                    padding: isMobile ? "12px 12px 10px" : isLaptop ? "12px 14px 10px" : styles.sectionHeader.padding,
                  }}
                >
                  <div style={styles.sectionTitleWrap}>
                    <FolderOutlineIcon color={primary} />
                    <h2
                      style={{
                        ...styles.sectionTitle,
                        color: primary,
                        fontSize: isMobile ? "16px" : isLaptop ? "17px" : styles.sectionTitle.fontSize,
                        transition: "color 450ms ease-in-out",
                      }}
                    >
                      {section.title}
                    </h2>
                  </div>
                  <button onClick={() => navigate("/entity/forms")} style={{ ...styles.addFolderBtn, color: primary, transition: "color 450ms ease-in-out" }}>
                    + Add folder
                  </button>
                </div>

                <div
                  style={{
                    ...styles.sectionBody,
                    padding: isMobile ? "16px 14px" : isLaptop ? "20px 18px" : styles.sectionBody.padding,
                  }}
                >
                  {section.items.length > 0 ? (
                    <div
                      style={{
                        ...styles.folderGrid,
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : isTablet
                            ? "repeat(auto-fit, minmax(220px, 1fr))"
                            : isLaptop
                              ? "repeat(auto-fit, minmax(235px, 1fr))"
                              : styles.folderGrid.gridTemplateColumns,
                        gap: isMobile ? "16px" : isLaptop ? "20px" : styles.folderGrid.gap,
                      }}
                    >
                      {section.items.map((item, itemIndex) => (
                        <Link
                          key={item.id}
                          to="/entity/forms"
                          state={{ formId: item.id }}
                          style={{
                            ...styles.folderCard,
                            borderColor: secondary,
                            minHeight: isMobile ? "180px" : isLaptop ? "220px" : styles.folderCard.minHeight,
                            padding: isMobile ? "16px" : isLaptop ? "18px" : styles.folderCard.padding,
                            transition: "transform 200ms ease, box-shadow 200ms ease, border-color 450ms ease-in-out",
                            ...(itemIndex === 0 && sectionIndex > 0 ? { borderColor: accent, background: `${accent}12` } : {}),
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = primary;
                            e.currentTarget.style.boxShadow = `0 8px 24px ${primary}25`;
                            e.currentTarget.style.transform = "scale(1.02) translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = itemIndex === 0 && sectionIndex > 0 ? accent : secondary;
                            e.currentTarget.style.boxShadow = styles.folderCard.boxShadow;
                            e.currentTarget.style.transform = "scale(1) translateY(0)";
                          }}
                        >
                          <div style={styles.folderCardTop}>
                            <div style={{ ...styles.folderBadge, background: primary, transition: "background-color 450ms ease-in-out" }}>
                              <FolderFilledIcon />
                            </div>
                            <span style={{ ...styles.folderCount, color: accent }}>{String(item.count).padStart(2, "0")}</span>
                            <span style={styles.folderMenu}>⋮</span>
                          </div>
                          <div
                            style={{
                              ...styles.folderTextColumn,
                              gap: isMobile ? "2px" : styles.folderTextColumn.gap,
                            }}
                          >
                            {splitVerticalText(item.title).map((char, index) => (
                              <span
                                key={`${item.id}-${index}`}
                                style={{
                                  ...styles.folderLetter,
                                  color: accent,
                                  fontSize: isMobile ? "15px" : isLaptop ? "16px" : styles.folderLetter.fontSize,
                                }}
                              >
                                {char}
                              </span>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.emptyWorkspace}>No folders available for this section yet.</div>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#FFFFFF",
    borderTop: "8px solid var(--primary-color)",
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
    boxSizing: "border-box",
  },
  main: {
    padding: "12px 16px 20px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  dashboardShell: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: "10px",
    alignItems: "start",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  sidebar: {
    width: "100%",
    maxWidth: "320px",
    minWidth: 0,
    boxSizing: "border-box",
    background: "#fff",
    borderRadius: 0,
    border: "1px solid var(--secondary-color)",
    padding: "20px 16px",
  },
  sidebarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  entityTitleBlock: {
    width: "100%",
    textAlign: "left",
    marginBottom: "16px",
  },
  entityTitle: {
    margin: 0,
    color: "var(--primary-color)",
    fontSize: "18px",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  entitySubtitle: {
    margin: "4px 0 0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 500,
  },
  brandImageWrap: {
    width: "190px",
    height: "190px",
    margin: "0 auto",
    border: "1px solid var(--secondary-color)",
    borderRadius: 0,
    overflow: "hidden",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  brandFallback: {
    width: "100%",
    height: "100%",
    background: "#ffffff",
    color: "var(--primary-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    borderTop: "1px solid var(--secondary-color)",
    margin: "18px 0",
    width: "100%",
  },
  operatorImageWrap: {
    width: "180px",
    height: "180px",
    margin: "0 auto",
    border: "1px solid var(--secondary-color)",
    borderRadius: 0,
    overflow: "hidden",
    background: "#fff",
  },
  operatorImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  qrFrame: {
    width: "190px",
    height: "190px",
    margin: "0 auto",
    border: "1px solid var(--secondary-color)",
    borderRadius: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
  },
  qrImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    padding: "8px",
  },
  qrEmpty: {
    color: "var(--primary-color)",
    fontSize: "14px",
    textAlign: "center",
    padding: "1rem",
  },
  logoutBtn: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid var(--secondary-color)",
    borderRadius: 0,
    background: "#fff",
    color: "var(--primary-color)",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 600,
    transition: "background 180ms ease, color 180ms ease",
  },
  logoutBtnHover: {
    background: "var(--secondary-color)",
    color: "#fff",
  },
  workspace: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid var(--secondary-color)",
    padding: "6px 10px 0",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
  },
  workspaceSection: {
    marginBottom: "10px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px 10px",
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  sectionTitle: {
    margin: 0,
    color: "var(--primary-color)",
    fontSize: "18px",
    fontWeight: 500,
  },
  addFolderBtn: {
    background: "transparent",
    border: "none",
    color: "var(--primary-color)",
    fontSize: "17px",
    cursor: "pointer",
    padding: 0,
  },
  sectionBody: {
    border: "1px solid var(--secondary-color)",
    borderRadius: "12px",
    padding: "26px 30px 24px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  folderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "32px",
    alignItems: "start",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },
  folderCard: {
    minHeight: "210px",
    border: "1px solid var(--secondary-color)",
    borderRadius: "12px",
    padding: "20px 22px",
    background: "#fff",
    textDecoration: "none",
    color: "#13213d",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.04)",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    transition: "transform 200ms ease, box-shadow 200ms ease, border-color 450ms ease",
  },
  folderCardHighlight: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,245,245,0.92))",
  },
  folderCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  folderBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "var(--primary-color)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  folderCount: {
    marginLeft: "16px",
    marginRight: "auto",
    fontSize: "19px",
    fontWeight: 500,
    color: "var(--accent-color)",
  },
  folderMenu: {
    color: "#15233d",
    fontSize: "28px",
    lineHeight: 1,
    transform: "translateY(-4px)",
  },
  folderTextColumn: {
    flex: 1,
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  },
  folderLetter: {
    fontSize: "17px",
    lineHeight: 1.25,
    fontWeight: 400,
  },
  emptyWorkspace: {
    minHeight: "190px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontSize: "14px",
    border: "1px dashed #bfeef2",
    borderRadius: "12px",
    background: "#fcffff",
    padding: "20px",
    textAlign: "center",
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
  },
  loadingText: {
    color: "#0F172A",
    marginTop: "1rem",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #b7edf1",
    borderTop: "4px solid #10a7b4",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    padding: "2rem",
  },
  errorText: {
    color: "#dc2626",
    fontWeight: "bold",
  },
  retryBtn: {
    marginTop: "1rem",
    padding: "0.5rem 1.5rem",
    background: "#10a7b4",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },
};

function BuildingIcon({ small = false }) {
  const size = small ? 72 : 44;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M12 53V19l14-6 14 6v34" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 53h42M24 53V39h8v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 24h4M22 30h4M22 36h4M34 24h4M34 30h4M34 36h4M46 25v28M46 25l10 4v24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FolderOutlineIcon({ color = "#10a7b4" }) {
  return (
    <svg width="28" height="24" viewBox="0 0 28 24" fill="none" aria-hidden="true">
      <path d="M2 7.5h8l2.5-3H26v3" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 7.5h24v11.8a2.2 2.2 0 0 1-2.2 2.2H4.2A2.2 2.2 0 0 1 2 19.3V7.5Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

function FolderFilledIcon() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
      <path d="M1.5 4.2A2.7 2.7 0 0 1 4.2 1.5H8l2 2.2h7.8a2.7 2.7 0 0 1 2.7 2.7V13.8a2.7 2.7 0 0 1-2.7 2.7H4.2a2.7 2.7 0 0 1-2.7-2.7V4.2Z" fill="currentColor" />
    </svg>
  );
}
