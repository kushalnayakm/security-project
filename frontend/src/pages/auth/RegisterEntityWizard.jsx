import { useMemo, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  IdentificationIcon,
  KeyIcon,
  MapPinIcon,
  PhoneIcon,
  PhotoIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../context/ToastContext";
import { adminService } from "../../services/adminService";
import { entityService } from "../../services/entityService";
import { cn } from "../../utils/cn";

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
  gender: "",
  password: "",
  confirmPassword: "",
};

const businessTypeOptions = [
  { value: "Manufacturing", icon: BuildingOffice2Icon },
  { value: "Education", icon: DocumentTextIcon },
  { value: "Hospital", icon: CheckBadgeIcon },
  { value: "Retail", icon: BuildingStorefrontIcon },
  { value: "IT Company", icon: IdentificationIcon },
  { value: "Government", icon: BuildingOffice2Icon },
];

const genderOptions = ["Male", "Female", "Other"];

const businessFields = [
  { key: "name", label: "Entity Name", icon: BuildingOffice2Icon, required: true, placeholder: " " },
  { key: "branchName", label: "Branch Name", icon: BuildingStorefrontIcon, placeholder: " " },
  { key: "gstNo", label: "GST Number", icon: IdentificationIcon, required: true, placeholder: " " },
  { key: "phone", label: "Phone Number", icon: PhoneIcon, required: true, placeholder: " " },
];

const contactFields = [
  { key: "contactPerson", label: "Contact Person", icon: UserIcon, required: true, placeholder: " " },
  { key: "email", label: "Email", icon: EnvelopeIcon, required: true, placeholder: " ", type: "email" },
];

const documentConfigs = [
  {
    key: "gst",
    title: "GST Certificate",
    description: "Official GST registration document for verification.",
    helper: "Stored through the existing gstDocUrl field.",
    accept: ".pdf,image/*",
    icon: DocumentTextIcon,
    required: true,
    accent: "teal",
  },
  {
    key: "addressProof",
    title: "Address Proof",
    description: "Utility bill, lease agreement, or registered proof of address.",
    helper: "Captured in the UI only to preserve the current backend contract.",
    accept: ".pdf,image/*",
    icon: BuildingStorefrontIcon,
    required: true,
    accent: "blue",
  },
  {
    key: "logo",
    title: "Company Logo",
    description: "Upload a square or transparent logo for branding preview.",
    helper: "Preview only. No backend field exists in the current API.",
    accept: "image/*",
    icon: PhotoIcon,
    required: true,
    accent: "amber",
  },
];

const summarySections = [
  { title: "Business Information", fields: ["name", "branchName", "gstNo", "businessType", "address"] },
  { title: "Contact Information", fields: ["contactPerson", "email", "phone", "gender"] },
  { title: "Location", fields: ["googleMapsLocation"] },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(size) {
  if (!size) return "";
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${(size / 1024).toFixed(1)} KB`;
}

function FieldShell({ icon: Icon, label, required, error, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-[#0F4C81]">
          <Icon className="h-4 w-4" />
        </span>
        <span>{label}</span>
        {required ? <span className="text-xs font-medium text-[#00C2B8]">Required</span> : null}
      </div>
      {children}
      <p className={cn("min-h-[1.25rem] text-xs", error ? "text-rose-500" : "text-slate-400")}>{error || " "}</p>
    </div>
  );
}

function FloatingInput({ icon: Icon, label, error, required, className, ...props }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-[#0F4C81]">
          <Icon className="h-4 w-4" />
        </span>
        <span>{label}</span>
        {required ? <span className="text-xs font-medium text-[#00C2B8]">Required</span> : null}
      </label>
      <div className="group relative">
        <Input
          {...props}
          placeholder=" "
          className={cn(
            "peer h-14 rounded-[22px] border-slate-200 bg-white px-4 pt-6 text-sm shadow-[0_12px_28px_-20px_rgba(15,76,129,0.45)] transition focus:border-[#00C2B8] focus:bg-white",
            Icon ? "pl-12" : "",
            error ? "border-rose-300 bg-rose-50/40 focus:border-rose-400" : "",
            className,
          )}
        />
        {Icon ? (
          <Icon className={cn("pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition", error ? "text-rose-400" : "peer-focus:text-[#00C2B8]")} />
        ) : null}
        <span
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white px-1 text-sm text-slate-400 transition-all peer-focus:top-3 peer-focus:text-xs peer-focus:text-[#0F4C81] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs",
            Icon ? "left-11" : "",
          )}
        >
          {label}
        </span>
      </div>
      <p className={cn("min-h-[1.25rem] text-xs", error ? "text-rose-500" : "text-slate-400")}>{error || " "}</p>
    </div>
  );
}

function FloatingTextarea({ icon: Icon, label, error, required, ...props }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-[#0F4C81]">
          <Icon className="h-4 w-4" />
        </span>
        <span>{label}</span>
        {required ? <span className="text-xs font-medium text-[#00C2B8]">Required</span> : null}
      </label>
      <div className="relative">
        <textarea
          {...props}
          placeholder=" "
          className={cn(
            "peer min-h-[132px] w-full rounded-[22px] border border-slate-200 bg-white px-4 pb-4 pt-7 text-sm text-slate-900 shadow-[0_12px_28px_-20px_rgba(15,76,129,0.45)] outline-none transition focus:border-[#00C2B8]",
            error ? "border-rose-300 bg-rose-50/40 focus:border-rose-400" : "",
          )}
        />
        <Icon className={cn("pointer-events-none absolute left-4 top-5 h-4 w-4 text-slate-400", error ? "text-rose-400" : "")} />
        <span className="pointer-events-none absolute left-11 top-5 rounded-full bg-white px-1 text-xs text-[#0F4C81]">
          {label}
        </span>
      </div>
      <p className={cn("min-h-[1.25rem] text-xs", error ? "text-rose-500" : "text-slate-400")}>{error || " "}</p>
    </div>
  );
}

function UploadCard({ config, fileState, onSelect, onDrop, error }) {
  const Icon = config.icon;
  const preview = fileState?.preview || fileState?.value || "";
  const isImage = fileState?.type?.startsWith("image/");

  return (
    <div className={cn("rounded-[28px] border bg-white p-5 shadow-[0_18px_44px_-28px_rgba(15,76,129,0.35)] transition", error ? "border-rose-200" : "border-slate-200 hover:-translate-y-1")}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-[20px]",
            config.accent === "teal" && "bg-[#00C2B8]/10 text-[#00C2B8]",
            config.accent === "blue" && "bg-[#0F4C81]/10 text-[#0F4C81]",
            config.accent === "amber" && "bg-[#FFB300]/15 text-[#FFB300]",
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{config.title}</h3>
            {config.required ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Required</span> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{config.description}</p>
          <p className="mt-2 text-xs text-slate-400">{config.helper}</p>
        </div>
      </div>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => onDrop(event, config.key)}
        className={cn(
          "mt-5 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-5 py-6 text-center transition",
          error ? "border-rose-300 bg-rose-50/40" : "border-slate-200 bg-slate-50 hover:border-[#00C2B8] hover:bg-[#00C2B8]/[0.04]",
        )}
      >
        <input type="file" accept={config.accept} className="hidden" onChange={(event) => onSelect(event.target.files?.[0], config.key)} />
        {fileState ? (
          <>
            {isImage ? (
              <img src={preview} alt={config.title} className="h-24 w-24 rounded-2xl border border-slate-200 object-cover shadow-sm" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-[#0F4C81] shadow-sm">
                <DocumentTextIcon className="h-10 w-10" />
              </div>
            )}
            <p className="mt-4 line-clamp-1 text-sm font-semibold text-slate-800">{fileState.name}</p>
            <p className="mt-1 text-xs text-slate-500">{fileState.size}</p>
            <span className="mt-4 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Preview ready</span>
          </>
        ) : (
          <>
            <CloudArrowUpIcon className="h-10 w-10 text-slate-400" />
            <p className="mt-4 text-sm font-semibold text-slate-800">Drag and drop or click to upload</p>
            <p className="mt-1 text-xs text-slate-500">Supports PDF, PNG, JPG based on the current field.</p>
          </>
        )}
      </label>

      <p className={cn("mt-3 min-h-[1.25rem] text-xs", error ? "text-rose-500" : "text-slate-400")}>{error || " "}</p>
    </div>
  );
}

function SectionCard({ title, description, children, right }) {
  return (
    <Card className="overflow-hidden rounded-[32px] border-white/80 bg-white/95 p-6 shadow-[0_30px_80px_-44px_rgba(15,76,129,0.45)] md:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {right}
      </div>
      <div className="pt-6">{children}</div>
    </Card>
  );
}

export function RegisterEntityWizard({ mode = "public", isModal = false, onClose, onSuccess }) {
  const { showToast } = useToast();
  const form = useForm({ defaultValues, mode: "onChange" });
  const [createdEntityId, setCreatedEntityId] = useState(null);
  const [documents, setDocuments] = useState({
    gst: null,
    addressProof: null,
    logo: null,
  });
  const values = form.watch();

  const progress = useMemo(() => {
    const checkpoints = [
      Boolean(values.name.trim()),
      Boolean(values.gstNo.trim()),
      Boolean(values.phone.trim()),
      Boolean(values.address.trim()),
      Boolean(values.businessType),
      Boolean(values.contactPerson.trim()),
      Boolean(values.email.trim()),
      Boolean(values.gender),
      Boolean(documents.gst),
      Boolean(documents.addressProof),
      Boolean(documents.logo),
    ];
    return Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
  }, [documents, values]);

  const reviewFields = useMemo(
    () => ({
      name: values.name || "Not provided",
      branchName: values.branchName || "Not provided",
      gstNo: values.gstNo || "Not provided",
      businessType: values.businessType || "Not selected",
      address: values.address || "Not provided",
      contactPerson: values.contactPerson || "Not provided",
      email: values.email || "Not provided",
      phone: values.phone || "Not provided",
      gender: values.gender || "Not selected",
      googleMapsLocation: values.googleMapsLocation || "Not provided",
    }),
    [values],
  );

  async function processFile(file, key) {
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setDocuments((current) => ({
        ...current,
        [key]: {
          name: file.name,
          size: formatFileSize(file.size),
          value: key === "gst" ? dataUrl : null,
          preview: dataUrl,
          type: file.type,
        },
      }));
      form.clearErrors(`documents.${key}`);
    } catch {
      form.setError(`documents.${key}`, { type: "manual", message: "The file could not be processed." });
    }
  }

  function handleDrop(event, key) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    processFile(file, key);
  }

  function handleBusinessTypeSelect(type) {
    form.setValue("businessType", type, { shouldValidate: true, shouldDirty: true });
    form.clearErrors("businessType");
  }

  function handleGenderSelect(gender) {
    form.setValue("gender", gender, { shouldValidate: true, shouldDirty: true });
    form.clearErrors("gender");
  }

  function openMapsPicker() {
    const target = values.googleMapsLocation || values.address || values.name || "business location";
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`, "_blank", "noopener,noreferrer");
  }

  async function validateBeforeSubmit() {
    const valid = await form.trigger([
      "name",
      "gstNo",
      "phone",
      "address",
      "contactPerson",
      "email",
      "businessType",
      "gender",
      ...(mode === "public" ? ["password", "confirmPassword"] : []),
    ]);

    let docsValid = true;
    for (const config of documentConfigs) {
      if (!documents[config.key]) {
        form.setError(`documents.${config.key}`, { type: "manual", message: `${config.title} is required.` });
        docsValid = false;
      }
    }

    if (mode === "public" && values.password !== values.confirmPassword) {
      form.setError("confirmPassword", { type: "manual", message: "Passwords do not match." });
      return false;
    }

    return valid && docsValid;
  }

  async function handleSubmit(formValues) {
    const valid = await validateBeforeSubmit();
    if (!valid) {
      showToast({
        title: "Review required",
        description: "Please fix the highlighted fields before submitting the registration.",
      });
      return;
    }

    try {
      if (mode === "public") {
        const response = await entityService.register({
          name: formValues.name.trim(),
          gstNo: formValues.gstNo.trim(),
          gstDocUrl: documents.gst?.value || null,
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
        onSuccess?.({
          gst_no: formValues.gstNo.trim(),
          phone: formValues.phone.trim(),
        });
      } else {
        const response = await adminService.createEntity({
          name: formValues.name.trim(),
          gstNo: formValues.gstNo.trim(),
          gstDocUrl: documents.gst?.value || null,
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
        onSuccess?.({
          gst_no: formValues.gstNo.trim(),
          phone: formValues.phone.trim(),
        });
      }

      form.reset(defaultValues);
      setDocuments({ gst: null, addressProof: null, logo: null });
    } catch (error) {
      showToast({
        title: "Registration failed",
        description: error.message,
      });
    }
  }

  const body = (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="aurora aurora-one left-[-4rem] top-20 h-56 w-56" />
      <div className="aurora aurora-two right-[-5rem] top-24 h-64 w-64" />
      <div className="aurora aurora-three bottom-12 left-1/3 h-48 w-48" />

      <div className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00C2B8]/20 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#0F4C81] shadow-sm">
            <CheckCircleIcon className="h-4 w-4 text-[#00C2B8]" />
            Secure Enterprise Onboarding
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">🏢 Register New Entity</h1>
          <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
            Complete your business information to register your organization securely.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-[30px] border border-white/80 bg-white/80 p-5 shadow-[0_26px_70px_-44px_rgba(15,76,129,0.45)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#00C2B8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0F4C81]">
              Progress
            </span>
            <span className="text-sm font-medium text-slate-600">Single-page guided registration</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-3 w-48 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00C2B8] to-[#0F4C81] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-900">{progress}%</span>
          </div>
        </div>

        <form className="mt-8 space-y-8" onSubmit={form.handleSubmit(handleSubmit)}>
          <SectionCard
            title="Business Information"
            description="Capture your organization identity, address, and location in a clean onboarding flow."
            right={<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section 1</div>}
          >
            <div className="grid gap-6 md:grid-cols-2">
              {businessFields.map((field) => (
                <FloatingInput
                  key={field.key}
                  icon={field.icon}
                  label={field.label}
                  required={field.required}
                  error={form.formState.errors[field.key]?.message}
                  {...form.register(field.key, {
                    required: field.required ? `${field.label} is required.` : false,
                    pattern:
                      field.key === "gstNo"
                        ? { value: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, message: "Enter a valid GST number." }
                        : field.key === "phone"
                          ? { value: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit phone number." }
                          : undefined,
                  })}
                />
              ))}

              <FloatingTextarea
                icon={MapPinIcon}
                label="Business Address"
                required
                error={form.formState.errors.address?.message}
                {...form.register("address", { required: "Business address is required." })}
              />

              <FieldShell icon={MapPinIcon} label="Location" required error={form.formState.errors.googleMapsLocation?.message}>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-[0_16px_40px_-28px_rgba(15,76,129,0.35)]">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" className="h-14 flex-1 rounded-[20px] bg-[#0F4C81] px-5 hover:bg-[#0c3b64]" onClick={openMapsPicker}>
                      <MapPinIcon className="mr-2 h-5 w-5" />
                      Pick Location
                    </Button>
                    <div className="flex-1">
                      <Input
                        placeholder="Paste Google Maps link or landmark"
                        className="h-14 rounded-[20px] border-slate-200 bg-white focus:border-[#00C2B8]"
                        {...form.register("googleMapsLocation", { required: "Location is required." })}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    The picker opens Google Maps in a new tab. The existing UI field is still preserved for the current backend integration.
                  </p>
                </div>
              </FieldShell>
            </div>
          </SectionCard>

          <SectionCard
            title="Business Type"
            description="Select the business category that best represents your entity."
            right={<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section 2</div>}
          >
            <input
              type="hidden"
              {...form.register("businessType", { required: "Please select a business type." })}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {businessTypeOptions.map((option) => {
                const Icon = option.icon;
                const active = values.businessType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleBusinessTypeSelect(option.value)}
                    className={cn(
                      "group rounded-[26px] border p-5 text-left transition duration-200",
                      active
                        ? "border-[#00C2B8] bg-[#00C2B8]/[0.08] shadow-[0_24px_45px_-32px_rgba(0,194,184,0.7)]"
                        : "border-slate-200 bg-white hover:-translate-y-1 hover:border-[#0F4C81]/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("flex h-12 w-12 items-center justify-center rounded-[18px]", active ? "bg-[#00C2B8] text-white" : "bg-slate-100 text-[#0F4C81]")}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs", active ? "border-[#00C2B8] bg-[#00C2B8] text-white" : "border-slate-300 text-transparent")}>
                        •
                      </span>
                    </div>
                    <p className="mt-6 text-base font-semibold text-slate-900">{option.value}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-rose-500">{form.formState.errors.businessType?.message}</p>
          </SectionCard>

          <SectionCard
            title="Documents"
            description="Upload verification assets with drag-and-drop cards and instant previews."
            right={<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section 3</div>}
          >
            <div className="grid gap-6 xl:grid-cols-3">
              {documentConfigs.map((config) => (
                <UploadCard
                  key={config.key}
                  config={config}
                  fileState={documents[config.key]}
                  onSelect={processFile}
                  onDrop={handleDrop}
                  error={form.formState.errors.documents?.[config.key]?.message}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Contact Person"
            description="Register the authorized point of contact for communication and verification."
            right={<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section 4</div>}
          >
            <div className="grid gap-6 md:grid-cols-2">
              {contactFields.map((field) => (
                <FloatingInput
                  key={field.key}
                  icon={field.icon}
                  label={field.label}
                  type={field.type}
                  required={field.required}
                  error={form.formState.errors[field.key]?.message}
                  {...form.register(field.key, {
                    required: `${field.label} is required.`,
                    pattern:
                      field.key === "email"
                        ? { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." }
                        : undefined,
                  })}
                />
              ))}
            </div>

            {mode === "public" ? (
              <div className="mt-2 grid gap-6 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 md:grid-cols-2">
                <FloatingInput
                  icon={KeyIcon}
                  label="Password"
                  type="password"
                  required
                  error={form.formState.errors.password?.message}
                  {...form.register("password", {
                    required: "Password is required.",
                    minLength: { value: 6, message: "Password must be at least 6 characters." },
                  })}
                />
                <FloatingInput
                  icon={KeyIcon}
                  label="Confirm Password"
                  type="password"
                  required
                  error={form.formState.errors.confirmPassword?.message}
                  {...form.register("confirmPassword", {
                    required: "Please confirm your password.",
                  })}
                />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Gender"
            description="Choose one contact gender option using enterprise-style pill selectors."
            right={<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section 5</div>}
          >
            <input type="hidden" {...form.register("gender", { required: "Please select a gender." })} />
            <div className="flex flex-wrap gap-4">
              {genderOptions.map((option) => {
                const active = values.gender === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleGenderSelect(option)}
                    className={cn(
                      "rounded-full border px-6 py-3 text-sm font-semibold transition",
                      active
                        ? "border-[#00C2B8] bg-[#00C2B8] text-white shadow-[0_18px_35px_-24px_rgba(0,194,184,0.8)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#0F4C81]/30 hover:text-[#0F4C81]",
                    )}
                  >
                    {active ? "● " : "○ "}
                    {option}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-rose-500">{form.formState.errors.gender?.message}</p>
          </SectionCard>

          <SectionCard
            title="Review"
            description="Confirm the summary before you register the entity. Use edit shortcuts to jump back to any section."
            right={<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section 6</div>}
          >
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                {summarySections.map((section, index) => (
                  <div key={section.title} className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                      <button
                        type="button"
                        onClick={() => window.scrollTo({ top: Math.max(0, index * 520), behavior: "smooth" })}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0F4C81] shadow-sm transition hover:bg-slate-100"
                      >
                        Edit
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <div key={field} className="rounded-[20px] bg-white p-4 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {field === "gstNo"
                              ? "GST Number"
                              : field === "googleMapsLocation"
                                ? "Location"
                                : field === "contactPerson"
                                  ? "Contact Person"
                                  : field === "businessType"
                                    ? "Business Type"
                                    : field === "branchName"
                                      ? "Branch Name"
                                      : field.charAt(0).toUpperCase() + field.slice(1)}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-800">{reviewFields[field]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_44px_-32px_rgba(15,76,129,0.32)]">
                <h3 className="text-base font-semibold text-slate-900">Documents</h3>
                <div className="mt-4 space-y-3">
                  {documentConfigs.map((config) => (
                    <div key={config.key} className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{config.title}</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {documents[config.key]?.name || "Not uploaded"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[22px] bg-gradient-to-br from-[#00C2B8]/10 via-white to-[#0F4C81]/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Integration note</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Submission still uses the existing backend registration API and payload. UI-only fields are kept on the frontend experience without changing backend behavior.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-center">
            <Button
              className="h-16 min-w-[280px] rounded-full bg-gradient-to-r from-[#00C2B8] via-[#00B8C3] to-[#0F4C81] px-10 text-base shadow-[0_28px_60px_-28px_rgba(15,76,129,0.6)] hover:-translate-y-0.5 hover:shadow-[0_32px_70px_-28px_rgba(15,76,129,0.72)]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Registering..." : "Register Entity"}
            </Button>
          </div>
        </form>

        {createdEntityId ? (
          <Card className="mt-8 rounded-[30px] border-emerald-100 bg-emerald-50/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Registration complete</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Entity created successfully</h2>
            <p className="mt-2 text-sm text-slate-600">Reference ID returned by the existing backend:</p>
            <div className="mt-4 rounded-[20px] bg-slate-950 px-4 py-4 font-mono text-sm text-cyan-100">{createdEntityId}</div>
          </Card>
        ) : null}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
        <div className="relative max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-[36px] bg-[#F8FAFC] p-4 shadow-2xl md:p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          {body}
        </div>
      </div>
    );
  }

  return <div className="px-4 py-8 md:px-8 md:py-10">{body}</div>;
}
