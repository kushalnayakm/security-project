import { ShieldCheckIcon } from "@heroicons/react/24/outline";

import { PortalSwitcher } from "../components/navigation/PortalSwitcher";

export function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-8">
      <div className="aurora aurora-one left-[-8rem] top-20 h-72 w-72" />
      <div className="aurora aurora-two right-[-6rem] top-10 h-80 w-80" />
      <div className="aurora aurora-three bottom-0 left-1/3 h-64 w-64" />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col gap-8 lg:flex-row">
        <div className="enterprise-shell grid-fade relative flex flex-1 flex-col justify-between overflow-hidden rounded-[32px] border border-slate-200 p-8">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-[#0F4C81] p-3 text-white shadow-lg shadow-cyan-100">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Certificate Management System</p>
                <p className="text-sm text-slate-600">Enterprise registration and verification control room</p>
              </div>
            </div>
            <PortalSwitcher />
          </div>

          <div className="space-y-8 py-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              Security-first operations
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-blue-950 lg:text-6xl">
                Premium onboarding for entities, QR registration, and certificate operations.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                The frontend stays aligned with the existing FastAPI backend: entity registration, GST and phone-based OTP access,
                dynamic forms, QR issuance, and customer verification.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Entity Registration", "Start with the existing registration API, then move directly into OTP-based sign-in."],
                ["Entity Access", "Use GST number, phone number, and OTP to reach forms, QR, customers, and certificates."],
                ["Customer Experience", "Public forms and unique ID follow-up keep onboarding simple and traceable."],
              ].map(([title, copy]) => (
                <div key={title} className="glass-card rounded-3xl p-5">
                  <p className="text-sm font-semibold text-blue-950">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Live backend contract", "No fake APIs. Missing integrations are surfaced clearly in the UI."],
              ["Role-aware sessions", "Entity JWT sessions stay isolated from customer unique ID access."],
              ["Branch-ready model", "The schema already supports main entities, branches, forms, customers, and certificates."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#0F4C81]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full max-w-xl items-center justify-center">{children}</div>
      </div>
    </div>
  );
}
