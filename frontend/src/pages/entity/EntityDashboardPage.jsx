import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { entityService } from "../../services/entityService";

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

  const mergedProfile = {
    ...authEntity,
    ...profile,
  };
  const logoUrl = resolveAssetUrl(mergedProfile.logo_url);
  const operatorPhotoUrl = resolveAssetUrl(mergedProfile.operator_photo) || DEFAULT_AVATAR;
  const qrImageUrl = resolveAssetUrl(mergedProfile.qr_image_url);
  const entityName = mergedProfile.name || authEntity?.name || mergedProfile.parent_name || "Entity";
  const branchName =
    mergedProfile.branch_name ||
    authEntity?.branch_name ||
    (mergedProfile.entity_type === "BRANCH" ? mergedProfile.parent_name || "Branch" : "Main Campus");
  const gstNo = mergedProfile.gst_no || mergedProfile.gstNo || "";
  const isLaptop = viewportWidth <= 1440;
  const isTablet = viewportWidth <= 1100;
  const isMobile = viewportWidth <= 820;

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
    <div style={styles.container}>
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
              padding: isMobile ? "18px 14px" : isTablet ? "20px 16px 16px" : styles.sidebar.padding,
            }}
          >
            <div style={styles.entityHeader}>
              <div style={styles.buildingIconWrap}>
                <BuildingIcon />
              </div>
              <div>
                <h1 style={styles.entityTitle}>{entityName}</h1>
                <p style={styles.entitySubtitle}>{branchName}</p>
              </div>
            </div>

            <div style={styles.brandImageWrap}>
              {logoUrl ? (
                <img src={logoUrl} alt="Entity logo" style={styles.brandImage} />
              ) : (
                <div style={styles.brandFallback}>
                  <BuildingIcon small />
                </div>
              )}
            </div>

            <div style={styles.infoBlock}>
              <span style={styles.infoLabel}>GST Number</span>
              <span style={styles.infoValue}>{gstNo || "Not Available"}</span>
            </div>

            <div style={styles.infoBlock}>
              <span style={styles.infoLabel}>Branch Name</span>
              <span style={styles.infoValue}>{branchName}</span>
            </div>

            <div style={styles.separator} />

            <div style={styles.infoBlock}>
              <span style={styles.infoLabel}>Operator Photo</span>
            </div>

            <div style={styles.operatorImageWrap}>
              <img src={operatorPhotoUrl} alt="Operator" style={styles.operatorImage} />
            </div>

            <div style={styles.separator} />

            <div style={styles.infoBlock}>
              <span style={styles.infoLabel}>Entity QR Code</span>
            </div>

            <div style={styles.qrFrame}>
              {qrImageUrl ? (
                <img src={qrImageUrl} alt="Entity QR Code" style={styles.qrImage} />
              ) : (
                <div style={styles.qrEmpty}>QR Not Assigned</div>
              )}
            </div>

            <button onClick={logout} style={styles.logoutBtn}>
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
                    <FolderOutlineIcon />
                    <h2
                      style={{
                        ...styles.sectionTitle,
                        fontSize: isMobile ? "16px" : isLaptop ? "17px" : styles.sectionTitle.fontSize,
                      }}
                    >
                      {section.title}
                    </h2>
                  </div>
                  <button onClick={() => navigate("/entity/forms")} style={styles.addFolderBtn}>
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
                            minHeight: isMobile ? "180px" : isLaptop ? "220px" : styles.folderCard.minHeight,
                            padding: isMobile ? "16px" : isLaptop ? "18px" : styles.folderCard.padding,
                            ...(itemIndex === 0 && sectionIndex > 0 ? styles.folderCardHighlight : {}),
                          }}
                        >
                          <div style={styles.folderCardTop}>
                            <div style={styles.folderBadge}>
                              <FolderFilledIcon />
                            </div>
                            <span style={styles.folderCount}>{String(item.count).padStart(2, "0")}</span>
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
    borderTop: "8px solid #11a7b3",
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
    borderRadius: "16px",
    border: "1px solid #b7edf1",
    padding: "24px 18px 18px",
    boxShadow: "0 4px 20px rgba(14, 165, 177, 0.08)",
  },
  entityHeader: {
    display: "grid",
    gridTemplateColumns: "44px 1fr",
    gap: "14px",
    alignItems: "center",
    marginBottom: "20px",
  },
  buildingIconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#10a7b4",
  },
  entityTitle: {
    margin: 0,
    color: "#10a7b4",
    fontSize: "18px",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  entitySubtitle: {
    margin: "4px 0 0",
    color: "#1f2941",
    fontSize: "14px",
  },
  brandImageWrap: {
    width: "176px",
    height: "176px",
    margin: "0 auto 18px",
    border: "1px solid #dbe6ea",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#edf9fb",
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
    background: "#edf9fb",
    color: "#10a7b4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBlock: {
    maxWidth: "220px",
    margin: "0 auto 16px",
    width: "100%",
  },
  infoLabel: {
    display: "block",
    color: "#25314c",
    fontSize: "13px",
    marginBottom: "6px",
  },
  infoValue: {
    display: "block",
    color: "#121d35",
    fontSize: "15px",
    fontWeight: 500,
  },
  separator: {
    borderTop: "1px solid #99e4e8",
    margin: "18px auto 24px",
    maxWidth: "210px",
  },
  operatorImageWrap: {
    width: "154px",
    height: "154px",
    margin: "0 auto 8px",
    border: "2px solid #10b5c1",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#fff",
  },
  operatorImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  qrFrame: {
    width: "220px",
    height: "220px",
    margin: "0 auto",
    border: "1px solid #88dfe7",
    borderRadius: "8px",
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
    color: "#18243e",
    fontSize: "14px",
    textAlign: "center",
    padding: "1rem",
  },
  logoutBtn: {
    margin: "18px auto 0",
    width: "220px",
    padding: "10px 14px",
    border: "1px solid #10a7b4",
    borderRadius: "10px",
    background: "#fff",
    color: "#10a7b4",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 600,
  },
  workspace: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #b7edf1",
    padding: "6px 10px 0",
    boxShadow: "0 4px 20px rgba(14, 165, 177, 0.06)",
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
    color: "#16233d",
    fontSize: "18px",
    fontWeight: 500,
  },
  addFolderBtn: {
    background: "transparent",
    border: "none",
    color: "#10a7b4",
    fontSize: "17px",
    cursor: "pointer",
    padding: 0,
  },
  sectionBody: {
    border: "1px solid #bfeef2",
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
    border: "1px solid #aee9ee",
    borderRadius: "12px",
    padding: "20px 22px",
    background: "#fff",
    textDecoration: "none",
    color: "#13213d",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 3px 10px rgba(13, 167, 179, 0.05)",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  folderCardHighlight: {
    background: "linear-gradient(180deg, rgba(210,248,250,0.95), rgba(234,251,252,0.92))",
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
    background: "#12aab7",
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

function FolderOutlineIcon() {
  return (
    <svg width="28" height="24" viewBox="0 0 28 24" fill="none" aria-hidden="true">
      <path d="M2 7.5h8l2.5-3H26v3" stroke="#10a7b4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 7.5h24v11.8a2.2 2.2 0 0 1-2.2 2.2H4.2A2.2 2.2 0 0 1 2 19.3V7.5Z" stroke="#10a7b4" strokeWidth="2.2" strokeLinejoin="round" />
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
