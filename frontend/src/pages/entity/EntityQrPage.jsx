import { useEffect, useState } from "react";

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

  // Load existing QR when form selection changes
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

  async function handleGenerateQr() {
    if (!selectedFormId) return;
    setLoading(true);
    try {
      const response = await entityService.generateQr(selectedFormId);
      setQrResult(response.data.data);
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

      <Card className="p-6">
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
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Form URL</p>
                <p className="break-all rounded-2xl bg-white px-4 py-3 font-mono text-sm text-slate-600">
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
      </Card>
    </div>
  );
}
