import { ShieldCheckIcon } from "@heroicons/react/24/outline";

import { PortalSwitcher } from "../components/navigation/PortalSwitcher";

export function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col gap-8 lg:flex-row">
        <div className="enterprise-shell flex flex-1 flex-col justify-between rounded-[32px] border border-slate-200 p-8">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-blue-900 p-3 text-white shadow-lg shadow-orange-200">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Certificate Management System</p>
                <p className="text-sm text-slate-600">Enterprise registration and verification control room</p>
              </div>
            </div>
            <PortalSwitcher />
          </div>

          <div className="space-y-6 py-10">
            <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Security-first operations</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-blue-900 lg:text-6xl">
              Trusted onboarding, QR-linked verification, and audit-ready business workflows.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Built for administrators and entities to manage registration, verification, and certificates through a
              controlled, audit-friendly interface.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Admin Workflow", "Register entities, review operations, and monitor audit trails."],
              ["Entity Workspace", "OTP-secured access to assigned forms, QR, and delivery workflows."],
              ["Customer Module", "Reserved for Phase 2 with a dedicated public experience."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white/80 p-5">
                <p className="text-sm font-semibold text-blue-900">{title}</p>
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
