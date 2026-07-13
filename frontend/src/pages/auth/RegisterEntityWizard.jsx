import { useMemo, useState } from "react";
import {
  BuildingOffice2Icon,
  CheckBadgeIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  KeyIcon,
  MapPinIcon,
  PhoneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useToast } from "../../context/ToastContext";
import { adminService } from "../../services/adminService";
import { entityService } from "../../services/entityService";

const defaultValues = {
  name: "",
  branchName: "",
  gstNo: "",
  businessType: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  googleMapsLocation: "",
};

const steps = [
  { id: 1, title: "Business Information", icon: BuildingOffice2Icon },
  { id: 2, title: "Contact Information", icon: PhoneIcon },
  { id: 3, title: "Documents", icon: DocumentTextIcon },
  { id: 4, title: "Review", icon: CheckBadgeIcon },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function RegisterEntityWizard({ mode = "public", isModal = false, onClose, onSuccess }) {
  const { showToast } = useToast();
  const form = useForm({ defaultValues });
  const [step, setStep] = useState(1);
  const [createdEntityId, setCreatedEntityId] = useState(null);
  const [gstDocument, setGstDocument] = useState(null);
  const [addressProofName, setAddressProofName] = useState("");
  const [logoName, setLogoName] = useState("");
  const values = form.watch();

  const completion = useMemo(() => {
    const required = mode === "public"
      ? ["name", "gstNo", "contactPerson", "phone", "email", "address"]
      : ["name", "gstNo", "contactPerson", "phone", "email", "address"];
    const count = required.filter((key) => String(values[key] || "").trim()).length;
    return Math.round((count / required.length) * 100);
  }, [mode, values]);

  async function handleGstUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setGstDocument({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        value: dataUrl,
      });
      showToast({
        title: "GST document added",
        description: "This file will be sent through the existing gstDocUrl backend field.",
      });
    } catch {
      showToast({
        title: "Upload failed",
        description: "The GST document could not be processed.",
      });
    }
  }

  function validateStep(targetStep = step) {
    if (targetStep === 1) {
      return form.trigger(["name", "gstNo", "businessType"]);
    }
    if (targetStep === 2) {
      const fields = ["contactPerson", "phone", "email", "address"];
      if (mode === "public") {

      }
      return form.trigger(fields);
    }
    return Promise.resolve(true);
  }

  async function goNext() {
    const valid = await validateStep(step);
    if (!valid) {
      return;
    }

    if (mode === "public" && step === 2 && values.password !== values.confirmPassword) {
      form.setError("confirmPassword", { type: "manual", message: "Passwords do not match" });
      return;
    }

    setStep((current) => Math.min(4, current + 1));
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit(formValues) {
    try {
      if (mode === "public") {
        const response = await entityService.register({
          name: formValues.name.trim(),
          gstNo: formValues.gstNo.trim(),
          gstDocUrl: gstDocument?.value || null,
          businessType: formValues.businessType.trim() || null,
          address: formValues.address.trim() || null,
          contactPerson: formValues.contactPerson.trim() || null,
          phone: formValues.phone.trim(),
          email: formValues.email.trim(),
          password: formValues.password,
        });
        setCreatedEntityId(response.data.data.entity_id);
        showToast({
          title: "Entity registered",
          description: "Your organization has been created using the existing entity registration API.",
        });
        if (onSuccess) {
          onSuccess({
            gst_no: formValues.gstNo.trim(),
            phone: formValues.phone.trim(),
          });
        }
      } else {
        const response = await adminService.createEntity({
          name: formValues.name.trim(),
          gstNo: formValues.gstNo.trim(),
          gstDocUrl: gstDocument?.value || null,
          businessType: formValues.businessType.trim() || null,
          address: formValues.address.trim() || null,
          contactPerson: formValues.contactPerson.trim() || null,
          phone: formValues.phone.trim() || null,
          email: formValues.email.trim() || null,
        });
        setCreatedEntityId(response.data.data.entity_id);
        showToast({
          title: "Entity registered",
          description: "The onboarding record has been created with the admin entity endpoint.",
        });
        if (onSuccess) {
          onSuccess({
            gst_no: formValues.gstNo.trim(),
            phone: formValues.phone.trim(),
          });
        }
      }

      form.reset(defaultValues);
      setGstDocument(null);
      setAddressProofName("");
      setLogoName("");
      setStep(1);
    } catch (error) {
      showToast({
        title: "Registration failed",
        description: error.message,
      });
    }
  }

  const body = (
    <div className="space-y-8">
      {isModal ? null : (
        <SectionHeading
          eyebrow={mode === "public" ? "Entity Portal" : "Admin Portal"}
          title="Entity onboarding wizard"
          description={
            mode === "public"
              ? "A premium onboarding flow mapped to the existing public entity registration API."
              : "A premium onboarding flow mapped to the current admin entity management backend."
          }
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Card className="metric-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-teal-700">Workflow progress</p>
              <h2 className="mt-3 text-2xl font-semibold text-blue-950">
                {mode === "public" ? "Secure entity onboarding" : "Admin to entity handoff"}
              </h2>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Completion</p>
              <p className="mt-1 text-2xl font-semibold text-blue-950">{completion}%</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {steps.map((item) => {
              const Icon = item.icon;
              const isCurrent = item.id === step;
              const isComplete = item.id < step;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={`flex w-full items-center gap-4 rounded-[24px] border p-4 text-left transition ${
                    isCurrent
                      ? "border-teal-200 bg-white shadow-sm"
                      : isComplete
                        ? "border-emerald-100 bg-emerald-50/70"
                        : "border-slate-200 bg-white/70"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      isCurrent
                        ? "step-dot bg-teal-500 text-white"
                        : isComplete
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Step {item.id}</p>
                    <p className="mt-1 text-sm font-semibold text-blue-950">{item.title}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-[24px] border border-slate-200 bg-white/80 p-5">
            <p className="text-sm font-semibold text-blue-950">Backend alignment</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {mode === "public"
                ? "This wizard uses the existing POST /entity/register API, which requires email and password in addition to business details."
                : "This wizard uses the existing POST /admin/entities API and only submits fields accepted by that route."}
            </p>
          </div>
        </Card>

        <Card className="enterprise-shell p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-teal-700">{steps[step - 1].title}</p>
              <h2 className="mt-3 text-3xl font-semibold text-blue-950">Create a production-ready entity record</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Follow the backend-first workflow: register the organization, verify OTP login, then continue into forms, QR, customers, and certificates.
              </p>
            </div>
            {isModal ? null : (
              <div className="hidden rounded-[24px] border border-slate-200 bg-white px-5 py-4 md:block">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Workflow</p>
                <p className="mt-2 text-sm font-medium text-blue-950">Register → OTP Login → Dashboard → Forms → QR</p>
              </div>
            )}
          </div>

          <form className="mt-8 space-y-8" onSubmit={form.handleSubmit(handleSubmit)}>
            {step === 1 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Entity Name</label>
                  <Input {...form.register("name", { required: "Entity name is required" })} placeholder="Acme Security Services Pvt Ltd" />
                  <p className="mt-2 text-xs text-rose-500">{form.formState.errors.name?.message}</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Branch Name</label>
                  <Input {...form.register("branchName")} placeholder="Main branch or head office" />
                  <p className="mt-2 text-xs text-slate-400">Backend Integration Pending</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">GST Number</label>
                  <Input {...form.register("gstNo", { required: "GST number is required" })} placeholder="29ABCDE1234F1Z5" />
                  <p className="mt-2 text-xs text-rose-500">{form.formState.errors.gstNo?.message}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Business Type</label>
                  <Input {...form.register("businessType")} placeholder="Manufacturer, Distributor, Retail, Services" />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Contact Person</label>
                  <Input {...form.register("contactPerson", { required: "Contact person is required" })} placeholder="Primary owner or authorized contact" />
                  <p className="mt-2 text-xs text-rose-500">{form.formState.errors.contactPerson?.message}</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Phone Number</label>
                  <Input {...form.register("phone", { required: "Phone number is required" })} placeholder="9876543210" />
                  <p className="mt-2 text-xs text-rose-500">{form.formState.errors.phone?.message}</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Official Email</label>
                  <Input
                    type="email"
                    {...form.register("email", {
                      required: "Email is required",
                      pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email address" },
                    })}
                    placeholder="ops@company.com"
                  />
                  <p className="mt-2 text-xs text-rose-500">{form.formState.errors.email?.message}</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Google Maps Location</label>
                  <Input {...form.register("googleMapsLocation")} placeholder="Paste location link" />
                  <p className="mt-2 text-xs text-slate-400">Backend Integration Pending</p>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Registered Address</label>
                  <textarea
                    {...form.register("address", { required: "Address is required" })}
                    rows={4}
                    className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-300"
                    placeholder="Registered office address"
                  />
                  <p className="mt-2 text-xs text-rose-500">{form.formState.errors.address?.message}</p>
                </div>

                {mode === "public" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                      <div className="relative">
                        <KeyIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="password"
                          className="pl-11"
                          {...form.register("password", {
                            required: "Password is required",
                            minLength: { value: 6, message: "Password must be at least 6 characters" },
                          })}
                          placeholder="Create account password"
                        />
                      </div>
                      <p className="mt-2 text-xs text-rose-500">{form.formState.errors.password?.message}</p>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                      <Input
                        type="password"
                        {...form.register("confirmPassword", {
                          required: "Please confirm your password",
                        })}
                        placeholder="Repeat password"
                      />
                      <p className="mt-2 text-xs text-rose-500">{form.formState.errors.confirmPassword?.message}</p>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                      <CloudArrowUpIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-950">GST Certificate</p>
                      <p className="text-xs text-slate-500">Supported via `gstDocUrl`</p>
                    </div>
                  </div>
                  <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition hover:border-teal-300">
                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleGstUpload} />
                    <p className="text-sm font-medium text-slate-700">{gstDocument ? gstDocument.name : "Upload GST certificate"}</p>
                    <p className="mt-1 text-xs text-slate-400">{gstDocument ? gstDocument.size : "PDF, PNG, JPG supported"}</p>
                  </label>
                </div>

                <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-3 text-amber-600">
                      <DocumentTextIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-950">Address Proof</p>
                      <p className="text-xs text-amber-700">Backend Integration Pending</p>
                    </div>
                  </div>
                  <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-amber-200 bg-white px-4 py-8 text-center">
                    <input type="file" className="hidden" onChange={(event) => setAddressProofName(event.target.files?.[0]?.name || "")} />
                    <p className="text-sm font-medium text-slate-700">{addressProofName || "Select address proof"}</p>
                    <p className="mt-1 text-xs text-slate-400">The current backend has no storage field for this document.</p>
                  </label>
                </div>

                <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-3 text-amber-600">
                      <MapPinIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-950">Company Logo</p>
                      <p className="text-xs text-amber-700">Backend Integration Pending</p>
                    </div>
                  </div>
                  <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-amber-200 bg-white px-4 py-8 text-center">
                    <input type="file" className="hidden" onChange={(event) => setLogoName(event.target.files?.[0]?.name || "")} />
                    <p className="text-sm font-medium text-slate-700">{logoName || "Select brand logo"}</p>
                    <p className="mt-1 text-xs text-slate-400">Logo storage is not defined in the existing backend contract.</p>
                  </label>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Entity Name", values.name || "Not provided"],
                    ["Branch Name", values.branchName || "Backend Integration Pending"],
                    ["GST Number", values.gstNo || "Not provided"],
                    ["Business Type", values.businessType || "Not provided"],
                    ["Contact Person", values.contactPerson || "Not provided"],
                    ["Phone", values.phone || "Not provided"],
                    ["Email", values.email || "Not provided"],
                    ["Google Maps", values.googleMapsLocation || "Backend Integration Pending"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-blue-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Address</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{values.address || "Not provided"}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold text-blue-950">GST Certificate</p>
                    <p className="mt-2 text-sm text-slate-600">{gstDocument?.name || "Not uploaded"}</p>
                  </div>
                  <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-5">
                    <p className="text-sm font-semibold text-blue-950">Address Proof</p>
                    <p className="mt-2 text-sm text-amber-700">Backend Integration Pending</p>
                  </div>
                  <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-5">
                    <p className="text-sm font-semibold text-blue-950">Company Logo</p>
                    <p className="mt-2 text-sm text-amber-700">Backend Integration Pending</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t soft-divider pt-6">
              <div className="text-sm text-slate-500">
                Step {step} of {steps.length}
              </div>
              <div className="flex flex-wrap gap-3">
                {step > 1 ? (
                  <Button type="button" variant="secondary" onClick={goBack}>
                    Back
                  </Button>
                ) : null}
                {step < 4 ? (
                  <Button type="button" onClick={goNext}>
                    Continue
                  </Button>
                ) : (
                  <Button disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Creating Entity..." : "Submit Entity Record"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
      </div>

      {createdEntityId ? (
        <Card className="glass-card p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-teal-700">Backend response</p>
          <h2 className="mt-3 text-2xl font-semibold text-blue-950">Entity created successfully</h2>
          <p className="mt-2 text-sm text-slate-600">Reference ID returned by the existing backend</p>
          <p className="mt-4 rounded-[22px] bg-slate-950 px-4 py-4 font-mono text-sm text-cyan-100">{createdEntityId}</p>
        </Card>
      ) : null}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
        <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-[#F5F7FA] p-4 shadow-2xl md:p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          {body}
        </div>
      </div>
    );
  }

  return body;
}
