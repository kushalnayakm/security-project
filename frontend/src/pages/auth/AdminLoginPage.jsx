import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowPathIcon, KeyIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authService } from "../../services/authService";

const loginSchema = z.object({
  admin_code: z.string().min(1, "Admin code is required"),
  password: z.string().min(1, "Password is required"),
});

const forgotSchema = z.object({
  phone: z.string().min(10, "Phone number is required"),
});

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [forgotResult, setForgotResult] = useState(null);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { admin_code: "", password: "" },
  });

  const forgotForm = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { phone: "" },
  });

  async function handleLogin(values) {
    try {
      const response = await authService.adminLogin(values);
      const data = response.data.data;
      login({
        token: data.token,
        role: data.role,
        portal: "admin",
        profile: data.admin ?? null,
      });
      showToast({
        title: "Admin authenticated",
        description: "Your console is ready.",
      });
      navigate("/admin/dashboard");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Invalid credentials";
      showToast({
        title: "Login Failed",
        description: errorMessage,
      });
    }
  }

  async function handleForgot(values) {
    try {
      const response = await authService.forgotAdminCode(values);
      const data = response.data.data;
      setForgotResult(data);
      showToast({
        title: "Admin Code Found",
        description: `Welcome back, ${data.admin_name}!`,
      });
    } catch (error) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.detail || error.message || "Failed to retrieve admin code.";

      if (status === 404) {
        forgotForm.setError("phone", {
          type: "manual",
          message: errorMessage,
        });
      } else {
        showToast({
          title: "Request Failed",
          description: errorMessage,
        });
      }
      setForgotResult(null);
    }
  }

  return (
    <Card className="w-full max-w-xl p-8">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-blue-900 p-3 text-white shadow-lg shadow-orange-200">
          <KeyIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-blue-900">Admin Portal</h2>
          <p className="text-sm text-slate-500">Access platform controls using admin code and password.</p>
        </div>
      </div>

      <form className="mt-8 space-y-4" onSubmit={loginForm.handleSubmit(handleLogin)}>
        <div>
          <label className="mb-2 block text-sm text-slate-700">Admin Code</label>
          <Input {...loginForm.register("admin_code")} placeholder="ADM20260001" />
          <p className="mt-2 text-xs text-rose-400">{loginForm.formState.errors.admin_code?.message}</p>
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-700">Password</label>
          <Input {...loginForm.register("password")} type="password" placeholder="Enter your password" />
          <p className="mt-2 text-xs text-rose-400">{loginForm.formState.errors.password?.message}</p>
        </div>
        <Button className="w-full" disabled={loginForm.formState.isSubmitting}>
          {loginForm.formState.isSubmitting ? "Signing in..." : "Sign in to Dashboard"}
        </Button>
      </form>

      <div className="my-8 h-px bg-slate-200" />

      <form className="space-y-4" onSubmit={forgotForm.handleSubmit(handleForgot)}>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <ArrowPathIcon className="h-4 w-4" />
          Forgot admin code
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-700">Phone Number</label>
          <Input {...forgotForm.register("phone")} placeholder="Enter registered phone number" />
          <p className="mt-2 text-xs text-rose-400">{forgotForm.formState.errors.phone?.message}</p>
        </div>
        <Button variant="secondary" className="w-full" disabled={forgotForm.formState.isSubmitting}>
          {forgotForm.formState.isSubmitting ? "Finding code..." : "Find Admin Code"}
        </Button>
      </form>

      {/* Only show success message when admin is found */}
      {forgotResult && forgotResult.admin_name ? (
        <div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-medium text-orange-700">Admin Code Found</p>
          <p className="mt-3 text-base text-blue-900">
            {forgotResult.admin_name}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
