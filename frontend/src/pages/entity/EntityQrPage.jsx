import { useEffect, useState } from "react";
import { CloudArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useToast } from "../../context/ToastContext";
import { entityService } from "../../services/entityService";

export function EntityQrPage() {
  const { showToast } = useToast();
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [qrResult, setQrResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Welcome settings states
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeTitle, setWelcomeTitle] = useState("Welcome");
  const [welcomeMessage, setWelcomeMessage] = useState("Please fill out this form to complete your registration.");
  const [welcomeLogo, setWelcomeLogo] = useState(null);
  const [savingWelcome, setSavingWelcome] = useState(false);

  useEffect(() => {
    async function loadForms() {
      try {
        const response = await entityService.getForms();
        const existingForms = response.data.data?.existingForms || [];
        setForms(existingForms);
        if (existingForms[0]) {
          setSelectedFormId(existingForms[0].form_id);
        }
      } catch (error) {
        showToast({ title: "Unable to load forms", description: error.message });
      }
    }

    loadForms();
  }, [showToast]);

  // Load existing QR and welcome settings when form selection changes
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
          setShowWelcome(data.showWelcome ?? true);
          setWelcomeTitle(data.welcomeTitle ?? "Welcome");
          setWelcomeMessage(data.welcomeMessage ?? "Please fill out this form to complete your registration.");
          setWelcomeLogo(data.welcomeLogo ?? null);
        } else {
          setQrResult(null);
        }
      } catch {
        setQrResult(null);
      }
    }
    loadQr();
  }, [selectedFormId]);

  async function handleGenerateQr() {
    if (!selectedFormId) return;
    setLoading(true);
    try {
      const response = await entityService.generateQr(selectedFormId);
      const data = response.data.data;
      setQrResult(data);
      setShowWelcome(data.showWelcome ?? true);
      setWelcomeTitle(data.welcomeTitle ?? "Welcome");
      setWelcomeMessage(data.welcomeMessage ?? "Please fill out this form to complete your registration.");
      setWelcomeLogo(data.welcomeLogo ?? null);
      showToast({ title: "QR code generated", description: "Your QR code is ready for download." });
    } catch (error) {
      showToast({ title: "QR generation failed", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadQr() {
    if (!qrResult?.qrImageUrl) return;
    const link = document.createElement("a");
    link.href = qrResult.qrImageUrl;
    link.download = `qr-${selectedFormId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopyUrl() {
    if (!qrResult?.qrCodeData) return;
    navigator.clipboard.writeText(qrResult.qrCodeData).then(() => {
      showToast({ title: "URL copied", description: "Form URL copied to clipboard." });
    });
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast({ title: "Invalid file type", description: "Please select an image file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setWelcomeLogo(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveWelcome() {
    if (!selectedFormId) return;
    setSavingWelcome(true);
    try {
      await entityService.updateWelcomeSettings(selectedFormId, {
        showWelcome,
        welcomeTitle,
        welcomeMessage,
        welcomeLogo,
      });
      showToast({ title: "Settings Saved", description: "Welcome greeting screen settings updated successfully." });
    } catch (error) {
      showToast({ title: "Failed to save settings", description: error.message });
    } finally {
      setSavingWelcome(false);
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity"
        title="My QR code"
        description="Generate a QR code for your registration form. Customers scan it to fill out and submit their details."
      />

      <Card className="p-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">Choose Form</label>
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          value={selectedFormId}
          onChange={(event) => setSelectedFormId(event.target.value)}
        >
          <option value="">Select a form</option>
          {forms.map((form) => (
            <option key={form.form_id} value={form.form_id}>
              {form.title}
            </option>
          ))}
        </select>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleGenerateQr} disabled={!selectedFormId || loading}>
            {loading ? "Generating..." : qrResult ? "Regenerate QR" : "Generate QR"}
          </Button>
          <Button variant="secondary" onClick={handleDownloadQr} disabled={!qrResult?.qrImageUrl}>
            Download QR
          </Button>
          <Button variant="secondary" onClick={handleCopyUrl} disabled={!qrResult?.qrCodeData}>
            Copy Form URL
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Card: QR Preview */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">QR Preview</p>
            <h2 className="mt-3 text-xl font-semibold text-blue-900">
              {qrResult ? "Your QR code is ready" : "Generate a QR code to preview"}
            </h2>
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              {qrResult?.qrImageUrl ? (
                <div className="flex flex-col items-center gap-6">
                  <img
                    src={qrResult.qrImageUrl}
                    alt="QR Code"
                    className="mx-auto h-64 w-64 rounded-2xl"
                  />
                  <div className="w-full space-y-2 text-left">
                    <p className="text-sm font-medium text-slate-700">Form URL</p>
                    <p className="break-all rounded-2xl bg-white px-4 py-3 font-mono text-sm text-slate-600 border border-slate-100">
                      {qrResult.qrCodeData}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12">
                  <p className="text-sm text-slate-500">Select a form and click "Generate QR" to create a scannable QR code.</p>
                  <p className="mt-3 text-sm text-slate-400">The QR will encode a URL that redirects customers to your registration form.</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Right Card: Welcome Settings */}
        {qrResult && (
          <Card className="p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Welcome Screen Settings</p>
                <h2 className="mt-3 text-xl font-semibold text-blue-900">Greeting Screen</h2>
                <p className="text-xs text-slate-400 mt-1">Configure what the customer sees immediately after scanning before the form loads.</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="show-welcome"
                  type="checkbox"
                  checked={showWelcome}
                  onChange={(e) => setShowWelcome(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                <label htmlFor="show-welcome" className="text-sm font-medium text-slate-700">
                  Enable welcome greeting screen
                </label>
              </div>

              {showWelcome && (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Title</label>
                    <input
                      type="text"
                      value={welcomeTitle}
                      onChange={(e) => setWelcomeTitle(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-blue-300"
                      placeholder="Welcome to Registration"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-blue-300"
                      placeholder="Configure greeting instructions here."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Logo / Image</label>
                    {welcomeLogo ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                        <img src={welcomeLogo} alt="Welcome Logo" className="h-12 w-12 object-contain rounded" />
                        <Button variant="secondary" className="p-2 border-red-200 hover:bg-red-50 text-red-600" onClick={() => setWelcomeLogo(null)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center hover:border-orange-300 transition">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="absolute inset-0 cursor-pointer opacity-0 w-full h-full"
                        />
                        <CloudArrowUpIcon className="h-8 w-8 text-slate-400 mb-1" />
                        <p className="text-xs text-slate-500">Upload welcome logo / logo image</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <Button onClick={handleSaveWelcome} disabled={savingWelcome} className="w-full">
                {savingWelcome ? "Saving..." : "Save Welcome Settings"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
