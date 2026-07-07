import { useEffect, useState } from "react";
import { ArrowDownTrayIcon, EyeIcon, LinkIcon, QrCodeIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { EmptyState } from "../../components/ui/EmptyState";
import { adminService } from "../../services/adminService";
import { entityService } from "../../services/entityService";
import { useToast } from "../../context/ToastContext";

export function AdminQrManagementPage() {
  const { showToast } = useToast();
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  // Forms & QR state
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [qrResult, setQrResult] = useState(null);
  const [loadingForms, setLoadingForms] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load all entities
  async function loadEntities() {
    try {
      const response = await adminService.listEntities();
      const list = response.data.data || [];
      setEntities(list);
      if (list[0]) {
        setSelectedEntity(list[0]);
      }
    } catch (error) {
      showToast({ title: "Failed to load entities", description: error.message });
      setEntities([]);
    }
  }

  useEffect(() => {
    loadEntities();
  }, [showToast]);

  // Load forms for selected entity
  useEffect(() => {
    if (!selectedEntity) {
      setForms([]);
      setSelectedFormId("");
      return;
    }

    async function loadEntityForms() {
      setLoadingForms(true);
      try {
        const response = await entityService.getForms(selectedEntity.entity_id);
        const existingForms = response.data.data?.existingForms || [];
        setForms(existingForms);
        if (existingForms[0]) {
          setSelectedFormId(existingForms[0].form_id);
        } else {
          setSelectedFormId("");
        }
      } catch (error) {
        showToast({ title: "Failed to load entity forms", description: error.message });
        setForms([]);
        setSelectedFormId("");
      } finally {
        setLoadingForms(false);
      }
    }

    loadEntityForms();
  }, [selectedEntity, showToast]);

  // Fetch QR when form changes
  useEffect(() => {
    if (!selectedFormId) {
      setQrResult(null);
      return;
    }

    async function loadQr() {
      try {
        const response = await entityService.getQr(selectedFormId);
        const data = response.data.data;
        if (data?.qrImageUrl) {
          setQrResult(data);
        } else {
          setQrResult(null);
        }
      } catch {
        setQrResult(null);
      }
    }

    loadQr();
  }, [selectedFormId]);

  // Generate QR
  async function handleGenerateQr() {
    if (!selectedFormId) return;
    setGenerating(true);
    try {
      const response = await entityService.generateQr(selectedFormId);
      setQrResult(response.data.data);
      showToast({ title: "QR code generated", description: "QR code generated successfully." });
      loadEntities(); // Refresh metrics just in case
    } catch (error) {
      showToast({ title: "Generation failed", description: error.message });
    } finally {
      setGenerating(false);
    }
  }

  // Download QR
  function handleDownloadQr() {
    if (!qrResult?.qrImageUrl) return;
    const link = document.createElement("a");
    link.href = qrResult.qrImageUrl;
    link.download = `qr-${selectedEntity?.name || "entity"}-${selectedFormId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copy Form URL
  function handleCopyUrl() {
    if (!qrResult?.qrCodeData) return;
    navigator.clipboard.writeText(qrResult.qrCodeData).then(() => {
      showToast({ title: "Link Copied", description: "Registration form URL copied to clipboard." });
    });
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin Portal"
        title="QR Management"
        description="Monitor, generate, preview, and download registration QR codes for onboarded entities."
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left panel: Entities list */}
        <Card className="p-6 flex flex-col h-[650px]">
          <h2 className="text-lg font-semibold text-blue-900">Organizations</h2>
          <p className="text-xs text-slate-400 mt-1">Select an onboarded entity to manage its QR code forms.</p>

          <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-2">
            {entities.length > 0 ? (
              entities.map((entity) => {
                const isSelected = selectedEntity?.entity_id === entity.entity_id;
                return (
                  <div
                    key={entity.entity_id}
                    onClick={() => setSelectedEntity(entity)}
                    className={`cursor-pointer rounded-2xl border p-4 text-left transition duration-200 ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wider text-orange-500 font-semibold">Entity</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{entity.name}</h3>
                    <p className="mt-2 text-xs text-slate-500">GST: {entity.gstNo || "N/A"}</p>
                    <p className="mt-1 text-xs text-slate-500">Registered Customers: {entity.customerCount ?? 0}</p>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No entities onboarded" description="Add new entities first to manage their registration forms." />
            )}
          </div>
        </Card>

        {/* Right panel: Active workspace */}
        <Card className="p-6 h-[650px] flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">QR Workspace</h2>
              <p className="text-xs text-slate-400 mt-1">Manage registration forms and QR code links on behalf of the selected entity.</p>
            </div>

            {selectedEntity ? (
              <div className="space-y-6">
                {/* Active Entity Info */}
                <div className="rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs text-slate-400">Managing Entity</span>
                  <p className="text-base font-semibold text-slate-800 mt-1">{selectedEntity.name}</p>
                </div>

                {/* Form selection */}
                {loadingForms ? (
                  <p className="text-sm text-slate-500">Loading forms...</p>
                ) : forms.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Registration Form</label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      value={selectedFormId}
                      onChange={(e) => setSelectedFormId(e.target.value)}
                    >
                      {forms.map((form) => (
                        <option key={form.form_id} value={form.form_id}>
                          {form.title}
                        </option>
                      ))}
                    </select>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={handleGenerateQr} disabled={!selectedFormId || generating} size="sm">
                        {generating ? "Generating..." : qrResult ? "Regenerate QR" : "Generate QR"}
                      </Button>
                      <Button variant="secondary" onClick={handleDownloadQr} disabled={!qrResult?.qrImageUrl} size="sm">
                        <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" />
                        Download QR
                      </Button>
                      <Button variant="secondary" onClick={handleCopyUrl} disabled={!qrResult?.qrCodeData} size="sm">
                        <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" />
                        Copy URL
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-sm text-slate-500">This entity has no custom forms configured.</p>
                    <p className="text-xs text-slate-400 mt-2">Go to Forms Management to create a form first.</p>
                  </div>
                )}

                {/* QR Preview Block */}
                {selectedFormId && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                    {qrResult?.qrImageUrl ? (
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={qrResult.qrImageUrl}
                          alt="Form QR"
                          className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                        />
                        <div className="w-full">
                          <p className="text-xs font-semibold text-slate-400">Target Registration URL</p>
                          <p className="break-all rounded-xl bg-white border border-slate-100 px-3 py-2 font-mono text-xs text-slate-600 mt-1">
                            {qrResult.qrCodeData}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8">
                        <QrCodeIcon className="mx-auto h-12 w-12 text-slate-300" />
                        <p className="text-xs text-slate-500 mt-2">Click "Generate QR" above to create and preview the scannable code.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">
                Please select an organization from the left panel to begin.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
