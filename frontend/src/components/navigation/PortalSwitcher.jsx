import { NavLink } from "react-router-dom";

const portals = [
  { label: "Admin", to: "/auth/admin/login" },
  { label: "Entity", to: "/auth/entity/login" },
  { label: "Customer", to: "/customer" },
];

export function PortalSwitcher() {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {portals.map((portal) => (
        <NavLink
          key={portal.to}
          to={portal.to}
          className={({ isActive }) =>
            `rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive ? "bg-blue-900 text-white" : "text-slate-600 hover:text-blue-900"
            }`
          }
        >
          {portal.label}
        </NavLink>
      ))}
    </div>
  );
}
