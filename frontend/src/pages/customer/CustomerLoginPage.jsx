import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PortalSwitcher } from "../../components/navigation/PortalSwitcher";
import { customerService } from "../../services/customerService";

export function CustomerLoginPage() {
  const navigate = useNavigate();
  const [uniqueId, setUniqueId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!uniqueId.trim()) {
      setError("Please enter your unique ID.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await customerService.login(uniqueId.trim());
      const data = response.data.data;
      // Store customer session separately from admin/entity
      sessionStorage.setItem("customer_session", JSON.stringify({
        token: data.token,
        customer: data.customer,
        role: "CUSTOMER",
      }));
      navigate("/customer/dashboard");
    } catch (err) {
      setError("Invalid unique ID. Please check and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <Card className="w-full max-w-md p-10">
        <PortalSwitcher />
        <div className="mt-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Customer Portal</p>
          <h1 className="mt-4 text-2xl font-semibold text-blue-900">Check Your Status</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter the unique ID you received after submitting your registration form.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Your Unique ID</label>
            <Input
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              placeholder="CUST-XXXXXX"
              className="text-center font-mono text-lg tracking-wider"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Verifying..." : "View My Status"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          You received this ID after submitting a registration form via QR code scan.
        </p>
      </Card>
    </div>
  );
}
