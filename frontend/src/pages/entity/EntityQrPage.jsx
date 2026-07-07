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

  async function handlePreviewQr() {
    if (!selectedFormId) {
      return;
    }
    const response = await entityService.getQr(selectedFormId);
    setQrResult(response.data.data);
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity"
        title="My QR code"
        description="View the QR assigned to your registration process and keep it ready for customer onboarding."
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
          <Button onClick={handlePreviewQr} disabled={!selectedFormId}>
            Preview QR
          </Button>
          <Button variant="secondary" disabled>
            Download QR
          </Button>
          <Button variant="secondary" disabled>
            Print QR
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">QR Preview</p>
        <h2 className="mt-3 text-xl font-semibold text-blue-900">Assigned QR payload</h2>
        <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">QR preview</p>
          <p className="mt-3 break-all text-sm text-slate-700">{qrResult?.qrImageUrl || "QR preview will appear here when available."}</p>
          <p className="mt-6 text-sm text-slate-500">Assigned reference</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-700">{qrResult?.form_id || selectedFormId || "No assignment selected"}</p>
        </div>
      </Card>
    </div>
  );
}
