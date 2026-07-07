import { Card } from "../../components/ui/Card";
import { PortalSwitcher } from "../../components/navigation/PortalSwitcher";

export function CustomerComingSoonPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-3xl p-10 text-center">
        <PortalSwitcher />
        <p className="mt-10 text-xs uppercase tracking-[0.35em] text-orange-500">Customer Portal</p>
        <h1 className="mt-4 text-4xl font-semibold text-blue-900">Coming Soon</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600">
          The customer module is coming soon.
        </p>
      </Card>
    </div>
  );
}
