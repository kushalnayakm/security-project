import { useEffect, useState } from "react";
import { EyeIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useToast } from "../../context/ToastContext";
import { entityService } from "../../services/entityService";

function createEmptyField(order = 0) {
  return {
    label: "",
    type: "TEXT",
    isRequired: false,
    options: [],
    order,
  };
}

export function EntityFormsPage() {
  const { showToast } = useToast();
  const [formsData, setFormsData] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    fields: [createEmptyField(0)],
  });
  const [selectedFormId, setSelectedFormId] = useState("");

  async function loadForms() {
    try {
      const response = await entityService.getForms();
      const data = response.data.data;
      setFormsData(data);
      if (!selectedFormId && data?.existingForms?.[0]) {
        setSelectedFormId(data.existingForms[0].form_id);
      }
    } catch (error) {
      showToast({
        title: "Unable to load forms",
        description: error.message,
      });
    }
  }

  useEffect(() => {
    loadForms();
  }, []);

  function updateField(index, updates) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...updates } : field,
      ),
    }));
  }

  function addField(type = "TEXT") {
    setDraft((current) => ({
      ...current,
      fields: [...current.fields, { ...createEmptyField(current.fields.length), type }],
    }));
  }

  function removeField(index) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index).map((field, order) => ({ ...field, order })),
    }));
  }

  async function handleCreateForm() {
    if (!draft.title.trim()) {
      showToast({
        title: "Form title required",
        description: "Enter a title before saving the form.",
      });
      return;
    }
    if (draft.fields.some((field) => !field.label.trim())) {
      showToast({
        title: "Field label required",
        description: "Every field needs a label before the form can be saved.",
      });
      return;
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      fields: draft.fields.map((field, order) => ({
        label: field.label.trim(),
        type: field.type,
        isRequired: field.isRequired,
        options: field.options?.length ? field.options : null,
        order,
      })),
    };
    const response = await entityService.createForm(payload);
    showToast({
      title: "Form saved",
      description: `Created form ${response.data.data.form_id}.`,
    });
    setDraft({ title: "", description: "", fields: [createEmptyField(0)] });
    await loadForms();
  }

  async function handlePublish(isActive) {
    if (!selectedFormId) {
      return;
    }
    await entityService.publishForm(selectedFormId, { isActive });
    showToast({
      title: isActive ? "Form published" : "Form unpublished",
      description: "The form status has been updated successfully.",
    });
    await loadForms();
  }

  const selectedForm = formsData?.existingForms?.find((form) => form.form_id === selectedFormId);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity"
        title="Form workspace"
        description="Review registration forms and preview active form structure for the current workspace."
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-blue-900">Create new form</h2>
              <p className="mt-2 text-sm text-slate-600">Create, preview, save, and publish registration forms.</p>
            </div>
            <Button variant="secondary" onClick={() => addField()}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Form Title</label>
              <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Customer Registration Form" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
              <Input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Collect customer registration details" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {draft.fields.map((field, index) => {
              const fieldMeta = formsData?.availableFieldTypes?.find((item) => item.type === field.type);
              return (
                <div key={`${field.type}-${index}`} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Field {index + 1}</p>
                      <p className="mt-1 text-xs text-slate-500">{fieldMeta?.label || field.type}</p>
                    </div>
                    <button type="button" onClick={() => removeField(index)} className="text-slate-400 transition hover:text-rose-500">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Label</label>
                      <Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} placeholder="Customer Name" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Field Type</label>
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                        value={field.type}
                        onChange={(event) => updateField(index, { type: event.target.value, options: [] })}
                      >
                        {(formsData?.availableFieldTypes || []).map((typeOption) => (
                          <option key={typeOption.type} value={typeOption.type}>
                            {typeOption.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <input
                      id={`required-${index}`}
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={(event) => updateField(index, { isRequired: event.target.checked })}
                    />
                    <label htmlFor={`required-${index}`} className="text-sm text-slate-700">Required field</label>
                  </div>

                  {["SELECT", "RADIO", "CHECKBOX"].includes(field.type) ? (
                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">Options</label>
                      <Input
                        value={field.options.join(", ")}
                        onChange={(event) =>
                          updateField(index, {
                            options: event.target.value
                              .split(",")
                              .map((option) => option.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleCreateForm}>Save Form</Button>
            <Button variant="secondary" onClick={() => addField("TEXT")}>Add Text Field</Button>
            <Button variant="ghost" onClick={() => setDraft({ title: "", description: "", fields: [createEmptyField(0)] })}>
              Reset Draft
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <EyeIcon className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-blue-900">Preview</h2>
            </div>
            <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-lg font-semibold text-slate-800">{draft.title || "Untitled form"}</p>
              <p className="mt-2 text-sm text-slate-500">{draft.description || "Draft description will appear here."}</p>
              <div className="mt-5 space-y-3">
                {draft.fields.map((field, index) => (
                  <div key={`preview-${index}`} className="rounded-2xl bg-white p-4">
                    <p className="font-medium text-slate-800">
                      {field.label || `Field ${index + 1}`}
                      {field.isRequired ? " *" : ""}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{field.type}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-blue-900">Existing forms</h2>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                value={selectedFormId}
                onChange={(event) => setSelectedFormId(event.target.value)}
              >
                <option value="">Select form</option>
                {(formsData?.existingForms || []).map((form) => (
                  <option key={form.form_id} value={form.form_id}>
                    {form.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-3">
              {formsData?.existingForms?.length ? (
                formsData.existingForms.map((form) => (
                  <div key={form.form_id} className="rounded-3xl border border-slate-200 p-4">
                    <p className="font-medium text-blue-900">{form.title}</p>
                    <p className="mt-2 text-sm text-slate-600">Status: {form.isActive ? "Published" : "Draft"}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No forms created yet" description="Create your first form using the builder on this page." />
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => handlePublish(true)} disabled={!selectedFormId || selectedForm?.isActive}>
                Publish
              </Button>
              <Button variant="secondary" onClick={() => handlePublish(false)} disabled={!selectedFormId || !selectedForm?.isActive}>
                Unpublish
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
