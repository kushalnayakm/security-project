import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircleIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { publicService } from "../../services/publicService";

const FIELD_RENDERERS = {
  TEXT: ({ field, value, onChange }) => (
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} />
  ),
  NUMBER: ({ field, value, onChange }) => (
    <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} />
  ),
  DATE: ({ field, value, onChange }) => (
    <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  EMAIL: ({ field, value, onChange }) => (
    <Input type="email" value={value} onChange={(e) => onChange(e.target.value)} placeholder="name@example.com" />
  ),
  PHONE: ({ field, value, onChange }) => (
    <Input type="tel" value={value} onChange={(e) => onChange(e.target.value)} placeholder="9876543210" />
  ),
  SELECT: ({ field, value, onChange }) => {
    const options = typeof field.options === "string" ? JSON.parse(field.options) : field.options || [];
    return (
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  },
  RADIO: ({ field, value, onChange }) => {
    const options = typeof field.options === "string" ? JSON.parse(field.options) : field.options || [];
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 text-sm text-slate-700">
            <input type="radio" name={field.field_id} checked={value === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    );
  },
  CHECKBOX: ({ field, value, onChange }) => {
    const options = typeof field.options === "string" ? JSON.parse(field.options) : field.options || [];
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, opt]);
                } else {
                  onChange(selected.filter((s) => s !== opt));
                }
              }}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  },
};

export function PublicFormPage() {
  const { formId } = useParams();
  const [formData, setFormData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadForm() {
      try {
        const response = await publicService.getForm(formId);
        const data = response.data.data;
        setFormData(data);
        // Initialize answers
        const initial = {};
        (data.fields || []).forEach((field) => {
          initial[field.field_id] = field.type === "CHECKBOX" ? [] : "";
        });
        setAnswers(initial);
      } catch (err) {
        const msg = err.response?.data?.detail || "This form could not be found or is no longer available.";
        setError(msg);
      }
    }
    loadForm();
  }, [formId]);

  function updateAnswer(fieldId, value) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate required fields
    const missing = (formData.fields || []).filter(
      (f) => f.is_required && (!answers[f.field_id] || (Array.isArray(answers[f.field_id]) && answers[f.field_id].length === 0))
    );
    if (missing.length > 0) {
      setError(`Please fill in required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await publicService.submitForm(formId, {
        entityId: formData.entity_id,
        data: answers,
      });
      setResult(response.data.data);
    } catch (err) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyId() {
    if (!result?.unique_id) return;
    navigator.clipboard.writeText(result.unique_id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Error state
  if (error && !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <Card className="w-full max-w-lg p-10 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-rose-500">Form Unavailable</p>
          <h1 className="mt-4 text-2xl font-semibold text-blue-900">Oops!</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  // Loading state
  if (!formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <p className="text-sm text-slate-500">Loading form...</p>
      </div>
    );
  }

  // Success state — show unique ID
  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <Card className="w-full max-w-lg p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-blue-900">Submission Successful!</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Your form has been submitted successfully. Please save your unique ID below — you will need it to check your certificate status.
          </p>

          <div className="mt-8 rounded-[28px] border-2 border-dashed border-orange-300 bg-orange-50 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Your Unique ID</p>
            <p className="mt-3 text-3xl font-bold tracking-wider text-blue-900">{result.unique_id}</p>
            <button
              onClick={handleCopyId}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-left">
            <p className="text-sm font-medium text-slate-700">What's next?</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>• Save your unique ID securely</li>
              <li>• Visit the <a href="/customer/login" className="font-medium text-blue-900 underline">Customer Portal</a> to check your certificate status</li>
              <li>• Use your unique ID to log in</li>
            </ul>
          </div>
        </Card>
      </div>
    );
  }

  // Form fill state
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Registration Form</p>
          <h1 className="mt-4 text-2xl font-semibold text-blue-900">{formData.title}</h1>
          {formData.description ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{formData.description}</p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {(formData.fields || []).map((field) => {
              const Renderer = FIELD_RENDERERS[field.type] || FIELD_RENDERERS.TEXT;
              return (
                <div key={field.field_id}>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {field.label}
                    {field.is_required ? <span className="ml-1 text-rose-500">*</span> : null}
                  </label>
                  <Renderer field={field} value={answers[field.field_id] || ""} onChange={(val) => updateAnswer(field.field_id, val)} />
                </div>
              );
            })}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Form"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
