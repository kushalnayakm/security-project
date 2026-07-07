import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authService } from "../../services/authService";

const requestSchema = z.object({
  gst_no: z.string().min(1, "GST number is required"),
  phone: z.string().min(10, "Phone number is required"),
});

const verifySchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export function EntityLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [identity, setIdentity] = useState({ gst_no: "", phone: "" });

  const requestForm = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: identity,
  });

  const verifyForm = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp: "" },
  });

  async function handleRequestOtp(values) {
    await authService.requestEntityOtp(values);
    setIdentity(values);
    setStep(2);
    showToast({
      title: "OTP requested",
      description: "Enter the OTP sent to your registered mobile number.",
    });
  }

  async function handleVerifyOtp(values) {
    const response = await authService.verifyEntityOtp({ ...identity, ...values });
    const data = response.data.data;
    login({
      token: data.token,
      role: data.role,
      portal: "entity",
      profile: data.entity ?? null,
    });
    navigate("/entity/dashboard");
  }

  return (
    <Card className="w-full max-w-xl overflow-hidden p-8">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-green-600 p-3 text-white shadow-lg shadow-orange-200">
          <QrCodeIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-blue-900">Entity Portal</h2>
          <p className="text-sm text-slate-500">Authenticate with GST number, phone number, and one-time password.</p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        {[1, 2].map((value) => (
          <div key={value} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
                step >= value
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {value}
            </div>
            {value === 1 ? <span className="text-sm text-slate-500">Verify identity</span> : null}
            {value === 2 ? <span className="text-sm text-slate-500">Enter OTP</span> : null}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="step-1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="mt-8 space-y-4"
            onSubmit={requestForm.handleSubmit(handleRequestOtp)}
          >
            <div>
              <label className="mb-2 block text-sm text-slate-700">GST Number</label>
              <Input {...requestForm.register("gst_no")} placeholder="Enter registered GST number" />
              <p className="mt-2 text-xs text-rose-400">{requestForm.formState.errors.gst_no?.message}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-700">Phone Number</label>
              <Input {...requestForm.register("phone")} placeholder="Enter registered phone number" />
              <p className="mt-2 text-xs text-rose-400">{requestForm.formState.errors.phone?.message}</p>
            </div>
            <Button className="w-full" disabled={requestForm.formState.isSubmitting}>
              {requestForm.formState.isSubmitting ? "Requesting OTP..." : "Request OTP"}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="step-2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="mt-8 space-y-4"
            onSubmit={verifyForm.handleSubmit(handleVerifyOtp)}
          >
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>GST Number: {identity.gst_no}</p>
              <p className="mt-1">Phone Number: {identity.phone}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-700">One-Time Password</label>
              <Input {...verifyForm.register("otp")} maxLength={6} placeholder="Enter 6-digit OTP" />
              <p className="mt-2 text-xs text-rose-400">{verifyForm.formState.errors.otp?.message}</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" disabled={verifyForm.formState.isSubmitting}>
                {verifyForm.formState.isSubmitting ? "Verifying..." : "Verify and continue"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );
}
