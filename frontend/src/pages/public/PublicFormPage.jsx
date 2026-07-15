import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicService } from "../../services/publicService";

export function PublicFormPage() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadForm() {
      try {
        const res = await publicService.getForm(formId);
        setForm(res.data.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Form not found");
      }
    }
    loadForm();
  }, [formId]);

  const handleChange = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await publicService.submitForm(formId, {
        entityId: form.entity_id,
        data: answers,
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !form) {
    return (
      <div style="padding:2rem;text-align:center;color:#dc2626">
        <h1>Form Unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!form) {
    return <div style="padding:2rem;text-align:center">Loading...</div>;
  }

  if (result) {
    return (
      <div style="padding:2rem;max-width:400px;margin:auto;text-align:center">
        <h1 style="color:#16a34a">Submitted Successfully</h1>
        <p>Your Unique ID: <strong>{result.unique_id}</strong></p>
        <button
          onClick={() => navigator.clipboard.writeText(result.unique_id)}
          style="margin-top:1rem;padding:0.5rem 1rem;background:#1e3a8a;color:white;border:none;border-radius:4px;cursor:pointer"
        >
          Copy ID
        </button>
      </div>
    );
  }

  return (
    <div style="padding:2rem;max-width:600px;margin:auto;font-family:system-ui">
      <h1>{form.title}</h1>
      {form.description && <p style="color:#666;margin-bottom:1rem">{form.description}</p>}
      <form onSubmit={handleSubmit}>
        {form.fields?.map((field) => (
          <div key={field.field_id} style="margin-bottom:1rem">
            <label style="display:block;margin-bottom:0.5rem;font-weight:500">
              {field.label} {field.is_required && <span style="color:#dc2626">*</span>}
            </label>
            {field.type === "SELECT" ? (
              <select
                value={answers[field.field_id] || ""}
                onChange={(e) => handleChange(field.field_id, e.target.value)}
                style="width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px"
              >
                <option value="">Select...</option>
                {(typeof field.options === "string" ? JSON.parse(field.options) : field.options || []).map(
                  (opt) => <option key={opt} value={opt}>{opt}</option>
                )}
              </select>
            ) : field.type === "CHECKBOX" ? (
              <div>
                {(typeof field.options === "string" ? JSON.parse(field.options) : field.options || []).map(
                  (opt) => (
                    <label key={opt} style="display:block;margin:0.25rem 0">
                      <input
                        type="checkbox"
                        value={opt}
                        checked={Array.isArray(answers[field.field_id]) && answers[field.field_id].includes(opt)}
                        onChange={(e) => {
                          const current = answers[field.field_id] || [];
                          handleChange(
                            field.field_id,
                            e.target.checked ? [...current, opt] : current.filter((o) => o !== opt)
                          );
                        }}
                      />
                      {opt}
                    </label>
                  )
                )}
              </div>
            ) : (
              <input
                type={field.type === "EMAIL" ? "email" : field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
                value={answers[field.field_id] || ""}
                onChange={(e) => handleChange(field.field_id, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                style="width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;box-sizing:border-box"
              />
            )}
          </div>
        ))}
        {error && <p style="color:#dc2626;margin-bottom:1rem">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          style="width:100%;padding:0.75rem;background:#1e3a8a;color:white;border:none;border-radius:4px;cursor:pointer;font-size:1rem"
        >
          {submitting ? "Submitting..." : "Submit Form"}
        </button>
      </form>
    </div>
  );
}