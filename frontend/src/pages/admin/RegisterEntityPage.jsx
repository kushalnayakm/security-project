import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useToast } from "../../context/ToastContext";
import { adminService } from "../../services/adminService";

const defaultValues = {
  name: "",
  gstNo: "",
  businessType: "",
  address: "",
  contactPerson: "",
  phone: "",
  email: "",
};

export function RegisterEntityPage() {
  const { showToast } = useToast();
  const [createdEntityId, setCreatedEntityId] = useState(null);
  const form = useForm({ defaultValues });

  async function handleSubmit(values) {
    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => {
        if (typeof value !== "string") {
          return [key, value];
        }
        const trimmed = value.trim();
        return [key, key === "name" ? trimmed : trimmed || null];
      }),
    );
    const response = await adminService.createEntity(payload);
    setCreatedEntityId(response.data.data.entity_id);
    form.reset(defaultValues);
    showToast({
      title: "Entity registered",
      description: "The entity has been added successfully.",
    });
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin Portal"
        title="Register new entity"
        description="Create a new entity record and move it into the registration, form setup, and QR assignment journey."
      />

      <Card className="p-6">
        <form className="grid gap-5 md:grid-cols-2" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Entity Name</label>
            <Input {...form.register("name", { required: true })} placeholder="Enter company or entity name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">GST Number</label>
            <Input {...form.register("gstNo")} placeholder="Registered GST number" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Business Type</label>
            <Input {...form.register("businessType")} placeholder="Retail, Services, Manufacturing..." />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
            <Input {...form.register("address")} placeholder="Registered business address" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Contact Person</label>
            <Input {...form.register("contactPerson")} placeholder="Primary contact name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
            <Input {...form.register("phone")} placeholder="Registered mobile number" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <Input {...form.register("email")} placeholder="Official email address" />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Registering..." : "Register Entity"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => form.reset(defaultValues)}>
              Reset Form
            </Button>
          </div>
        </form>
      </Card>

      {createdEntityId ? (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Backend Response</p>
          <h2 className="mt-3 text-xl font-semibold text-blue-900">Entity created successfully</h2>
          <p className="mt-2 text-sm text-slate-600">Reference ID</p>
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700">{createdEntityId}</p>
        </Card>
      ) : null}
    </div>
  );
}
