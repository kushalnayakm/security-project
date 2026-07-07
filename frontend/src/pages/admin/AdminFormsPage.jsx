import { useEffect, useState } from "react";
import { ArrowLeftIcon, EyeIcon, PlusIcon, TrashIcon, Bars3Icon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useToast } from "../../context/ToastContext";
import { adminService } from "../../services/adminService";
import { entityService } from "../../services/entityService";
import { publicService } from "../../services/publicService";

function createEmptyField(order = 0) {
  return {
    label: "",
    type: "TEXT",
    isRequired: false,
    options: [],
    order,
  };
}

export function AdminFormsPage() {
  const { showToast } = useToast();
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null); // { entity_id, name }
  
  // Workspace states
  const [formsData, setFormsData] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    fields: [createEmptyField(0)],
  });
  const [selectedFormId, setSelectedFormId] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);

  async function handleEdit(formId) {
    try {
      showToast({ title: "Loading form...", description: "Fetching form structure." });
      const response = await publicService.getForm(formId);
      const data = response.data.data;
      setEditingFormId(formId);
      setDraft({
        title: data.title,
        description: data.description || "",
        fields: (data.fields || []).map((f) => ({
          label: f.label,
          type: f.type,
          isRequired: f.is_required,
          options: typeof f.options === "string" ? JSON.parse(f.options) : (f.options || []),
          order: f.field_order,
        })),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      showToast({ title: "Unable to load form details", description: error.message });
    }
  }

  // Load entities
  useEffect(() => {
    async function loadEntities() {
      try {
        const response = await adminService.listEntities();
        setEntities(response.data.data || []);
      } catch {
        setEntities([]);
      }
    }
    loadEntities();
  }, []);

  // Load forms for selected entity
  async function loadForms(entityId) {
    try {
      const response = await entityService.getForms(entityId);
      const data = response.data.data;
      setFormsData(data);
      if (data?.existingForms?.[0]) {
        setSelectedFormId(data.existingForms[0].form_id);
      } else {
        setSelectedFormId("");
      }
    } catch (error) {
      showToast({
        title: "Unable to load forms",
        description: error.message,
      });
    }
  }

  async function handleDelete(formId) {
    const confirmDelete = window.confirm(
      "WARNING: Are you sure you want to permanently delete this form? This action is irreversible. All associated QR codes, customer submissions, and certificates will be deleted from the database."
    );
    if (!confirmDelete) return;

    try {
      showToast({ title: "Deleting form...", description: "Removing form from database." });
      await entityService.deleteForm(formId);
      showToast({ title: "Form Deleted", description: "Form and all database relationships successfully deleted." });
      
      if (editingFormId === formId) {
        setEditingFormId(null);
        setDraft({ title: "", description: "", fields: [createEmptyField(0)] });
      }
      if (selectedFormId === formId) {
        setSelectedFormId("");
      }
      loadForms(selectedEntity.entity_id);
    } catch (error) {
      showToast({ title: "Failed to delete form", description: error.message });
    }
  }

  function handleSelectEntity(entity) {
    setSelectedEntity(entity);
    loadForms(entity.entity_id);
    setDraft({ title: "", description: "", fields: [createEmptyField(0)] });
  }

  function handleBack() {
    setSelectedEntity(null);
    setFormsData(null);
    setSelectedFormId("");
  }

  // Builder handlers
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

  // Drag and Drop handlers
  function handleDragStart(e, index) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
  }

  // Realtime drag reordering
  function handleDragOver(e, index) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updatedFields = [...draft.fields];
    const draggedItem = updatedFields[draggedIndex];
    
    updatedFields.splice(draggedIndex, 1);
    updatedFields.splice(index, 0, draggedItem);
    
    const reorderedFields = updatedFields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    
    setDraft((current) => ({
      ...current,
      fields: reorderedFields,
    }));
    
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function handleDrop(e, index) {
    e.preventDefault();
    setDraggedIndex(null);
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
    try {
      if (editingFormId) {
        await entityService.updateForm(editingFormId, payload);
        showToast({
          title: "Form updated",
          description: "The form has been updated successfully.",
        });
        setEditingFormId(null);
      } else {
        const response = await entityService.createForm(payload, selectedEntity.entity_id);
        showToast({
          title: "Form saved",
          description: `Created form ${response.data.data.form_id}.`,
        });
      }
      setDraft({ title: "", description: "", fields: [createEmptyField(0)] });
      await loadForms(selectedEntity.entity_id);
    } catch (error) {
      showToast({
        title: "Error saving form",
        description: error.message,
      });
    }
  }

  async function handlePublish(isActive) {
    if (!selectedFormId) {
      return;
    }
    try {
      await entityService.publishForm(selectedFormId, { isActive });
      showToast({
        title: isActive ? "Form published" : "Form unpublished",
        description: "The form status has been updated successfully.",
      });
      await loadForms(selectedEntity.entity_id);
    } catch (error) {
      showToast({
        title: "Publish failed",
        description: error.message,
      });
    }
  }

  const selectedForm = formsData?.existingForms?.find((form) => form.form_id === selectedFormId);

  // If no entity is selected, render the entity list workspace
  if (!selectedEntity) {
    return (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Admin Portal"
          title="Dynamic registration forms"
          description="Organize registration form work for approved entities and keep the onboarding journey ready for rollout."
        />

        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Register entities before preparing their onboarding setup.",
              "Review which entities are ready for registration form activation.",
              "Move approved entities into the next stage of the onboarding journey.",
              "Keep the experience consistent across registration, QR, and customer operations.",
            ].map((item) => (
              <div key={item} className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-blue-900">Entities in form preparation</h2>
              <p className="mt-2 text-sm text-slate-600">Track which entities are ready for registration form setup and follow-up.</p>
            </div>
            <Button variant="secondary" onClick={() => window.location.assign("/admin/register-entity")}>
              Register Entity
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {entities.map((entity) => (
              <div key={entity.entity_id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-blue-900">{entity.name}</p>
                  <p className="mt-1 text-sm text-slate-600">GST: {entity.gstNo || "Not provided"}</p>
                  <p className="mt-1 text-sm text-slate-500">Status: {entity.status}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" onClick={() => handleSelectEntity(entity)}>
                    Manage Forms
                  </Button>
                </div>
              </div>
            ))}
            {entities.length === 0 ? <p className="text-sm text-slate-500">No entities found yet.</p> : null}
          </div>
        </Card>
      </div>
    );
  }

  // Render the workspace builder for the selected entity
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={handleBack} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition">
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <SectionHeading
          eyebrow="Admin Workspace"
          title={`Forms for ${selectedEntity.name}`}
          description="View, customize, reorder, save, and publish dynamic registration forms for this entity."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-blue-900">
                {editingFormId ? "Modify form" : "Create new form"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {editingFormId ? "Modify fields, names, parameter order, and options." : "Drag to reorder fields, preview, save, and publish forms."}
              </p>
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
                <div
                  key={`${field.type}-${index}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`rounded-[28px] border border-slate-200 bg-slate-50 p-5 transition-all duration-200 ${
                    draggedIndex === index ? "opacity-40 scale-[0.98] border-orange-400 border-dashed" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab text-slate-400 hover:text-slate-600 transition" title="Drag to reorder">
                        <Bars3Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Field {index + 1}</p>
                        <p className="mt-1 text-xs text-slate-500">{fieldMeta?.label || field.type}</p>
                      </div>
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
            <Button onClick={handleCreateForm}>{editingFormId ? "Update Form" : "Save Form"}</Button>
            <Button variant="secondary" onClick={() => addField("TEXT")}>Add Text Field</Button>
            {editingFormId ? (
              <Button variant="ghost" onClick={() => { setEditingFormId(null); setDraft({ title: "", description: "", fields: [createEmptyField(0)] }); }}>
                Cancel Edit
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setDraft({ title: "", description: "", fields: [createEmptyField(0)] })}>
                Reset Draft
              </Button>
            )}
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
                  <div key={form.form_id} className="flex items-center justify-between rounded-3xl border border-slate-200 p-4">
                    <div>
                      <p className="font-medium text-blue-900">{form.title}</p>
                      <p className="mt-2 text-sm text-slate-600">Status: {form.isActive ? "Published" : "Draft"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" className="px-3 py-1.5 text-xs font-medium" onClick={() => handleEdit(form.form_id)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="p-1.5" onClick={() => handleDelete(form.form_id)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
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
