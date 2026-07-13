import {
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  ChartBarSquareIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderPlusIcon,
  QrCodeIcon,
  RectangleStackIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const navigationByRole = {
  admin: [
    { icon: Squares2X2Icon, label: "Dashboard", to: "/admin/dashboard" },
    { icon: FolderPlusIcon, label: "Register Entity", to: "/admin/register-entity" },
    { icon: UserGroupIcon, label: "Entity Management", to: "/admin/entities" },
    { icon: RectangleStackIcon, label: "Dynamic Forms", to: "/admin/forms" },
    { icon: QrCodeIcon, label: "QR Management", to: "/admin/qr" },
    { icon: ShieldCheckIcon, label: "Audit Logs", to: "/admin/audit-logs" },
    { icon: ChartBarSquareIcon, label: "Reports", to: "/admin/reports" },
    { icon: Cog6ToothIcon, label: "Settings", to: "/admin/settings" },
  ],
  entity: [
    { icon: Squares2X2Icon, label: "Dashboard", to: "/entity/dashboard" },
    { icon: QrCodeIcon, label: "My QR Code", to: "/entity/qr" },
    { icon: UserGroupIcon, label: "Customers", to: "/entity/customers" },
    { icon: DocumentTextIcon, label: "Certificates", to: "/entity/certificates" },
    { icon: BuildingOffice2Icon, label: "Profile", to: "/entity/profile" },
  ],
};

export function AppShell() {
  const { session, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const navigation = navigationByRole[session?.portal] || [];
  const portalLabel = session?.portal === "admin" ? "Admin Portal" : "Entity Portal";
  const profileName =
    session?.profile?.name ||
    session?.profile?.contact_person ||
    session?.profile?.contactPerson ||
    "Workspace";

  function renderNavigation() {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-[#0F4C81] p-3 text-white shadow-lg shadow-cyan-100">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-950">CMS Console</p>
            <p className="text-xs text-slate-500">{portalLabel}</p>
          </div>
        </div>

        <div className="metric-card mt-8 rounded-[28px] border border-slate-200 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-teal-700">Authenticated</p>
          <p className="mt-3 text-lg font-semibold text-blue-950">{profileName}</p>
          <p className="mt-1 text-sm text-slate-500">
            {session?.profile?.email || session?.profile?.phone || "Authenticated workspace access"}
          </p>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workflow</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {session?.portal === "admin"
              ? "Register entities, move them into forms and QR setup, then review audits and reports."
              : "Use OTP access to manage forms, QR, customers, certificates, and organization profile details."}
          </p>
        </div>

        <nav className="mt-8 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#0F4C81] text-white shadow-lg shadow-blue-100"
                      : "text-slate-600 hover:bg-teal-50 hover:text-[#0F4C81]"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
          Logout
        </button>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-transparent xl:flex">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-sm xl:hidden">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-[#0F4C81] p-3 text-white">
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-950">CMS Console</p>
            <p className="text-xs text-slate-500">{portalLabel}</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600"
          onClick={() => setNavOpen((current) => !current)}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
      </div>

      {navOpen ? (
        <aside className="glass-card mb-4 flex flex-col rounded-[28px] p-6 xl:hidden">
          {renderNavigation()}
        </aside>
      ) : null}

      <aside className="glass-card hidden w-80 flex-col p-6 xl:flex">
        {renderNavigation()}
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <div className="enterprise-shell rounded-[32px] border border-slate-200 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
