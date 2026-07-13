import { BuildingOffice2Icon, LockClosedIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { EntityLoginPage } from "./EntityLoginPage";
import { RegisterEntityWizard } from "./RegisterEntityWizard";

export function EntityLandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [prefilledIdentity, setPrefilledIdentity] = useState(null);

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-8">
      <div className="aurora aurora-one left-[-8rem] top-16 h-72 w-72" />
      <div className="aurora aurora-two right-[-8rem] top-8 h-80 w-80" />
      <div className="aurora aurora-three bottom-0 left-1/3 h-64 w-64" />

      <div className="mx-auto max-w-7xl">
        <div className="glass-card flex items-center justify-between rounded-[30px] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-[#0F4C81] p-3 text-white shadow-lg shadow-cyan-100">
              <QrCodeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-950">Certificate Management System</p>
              <p className="text-xs text-slate-500">Secure Registration Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/auth/entity/login" className="rounded-full bg-[#0F4C81] px-4 py-2 text-sm font-medium text-white shadow-sm">
              Entity
            </Link>
            <Link to="/customer/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0F4C81]">
              Customer
            </Link>
          </div>
        </div>

        <div className="pt-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button className="px-6 py-3" onClick={() => setRegisterOpen(true)}>
              <BuildingOffice2Icon className="mr-2 h-5 w-5" />
              Register Entity
            </Button>
            <Button variant="secondary" className="px-6 py-3" onClick={() => setLoginOpen(true)}>
              <LockClosedIcon className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {loginOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <EntityLoginPage isModal onClose={() => setLoginOpen(false)} initialIdentity={prefilledIdentity} />
        </div>
      ) : null}

      {registerOpen ? (
        <RegisterEntityWizard
          mode="public"
          isModal
          onClose={() => setRegisterOpen(false)}
          onSuccess={(identity) => {
            setRegisterOpen(false);
            setPrefilledIdentity(identity);
            setLoginOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}
