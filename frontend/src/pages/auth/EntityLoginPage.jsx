import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DevicePhoneMobileIcon,
  IdentificationIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);

  function setDigit(index, digit) {
    const chars = value.split("");
    chars[index] = digit;
    onChange(chars.join("").slice(0, 6));
  }

  function handleInput(index, nextValue) {
    const clean = nextValue.replace(/\D/g, "");
    if (!clean) {
      setDigit(index, "");
      return;
    }

    const chars = value.padEnd(6, " ").split("");
    clean.split("").forEach((digit, offset) => {
      const target = index + offset;
      if (target < 6) {
        chars[target] = digit;
      }
    });
    onChange(chars.join("").replace(/\s/g, "").slice(0, 6));

    const nextIndex = Math.min(index + clean.length, 5);
    refs.current[nextIndex]?.focus();
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) {
      return;
    }
    onChange(pasted);
    refs.current[Math.min(pasted.length - 1, 5)]?.focus();
  }

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={value[index] || ""}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          maxLength={1}
          inputMode="numeric"
          className="h-14 rounded-[20px] border border-slate-200 bg-white text-center text-lg font-semibold text-blue-950 outline-none transition focus:border-teal-300"
        />
      ))}
    </div>
  );
}

export function EntityLoginPage({ isModal = false, onClose, initialIdentity = null }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [identity, setIdentity] = useState(initialIdentity || { gst_no: "", phone: "" });
  const [otpValue, setOtpValue] = useState("");
  const [countdown, setCountdown] = useState(30);

  const requestForm = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: initialIdentity || { gst_no: "", phone: "" },
  });

  const verifyForm = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    verifyForm.setValue("otp", otpValue, { shouldValidate: true });
  }, [otpValue, verifyForm]);

  useEffect(() => {
    if (!initialIdentity) {
      return;
    }
    setIdentity(initialIdentity);
    requestForm.reset(initialIdentity);
  }, [initialIdentity, requestForm]);

  useEffect(() => {
    if (step !== 2 || countdown <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, step]);

  async function requestOtp(values, isResend = false) {
    const response = await authService.requestEntityOtp(values);
    const data = response.data.data;
    setIdentity(values);
    setStep(2);
    setCountdown(30);
    setOtpValue("");
    showToast({
      title: isResend ? "OTP resent" : "OTP requested",
      description: data.masked_phone
        ? `Verification code sent to ${data.masked_phone}.`
        : "Enter the OTP sent to your registered mobile number.",
    });
  }

  async function handleRequestOtp(values) {
    try {
      await requestOtp(values, false);
    } catch (error) {
      showToast({
        title: "OTP request failed",
        description: error.message,
      });
    }
  }

  async function handleVerifyOtp(values) {
    try {
      const response = await authService.verifyEntityOtp({ ...identity, ...values });
      const data = response.data.data;
      login({
        token: data.token,
        role: data.role,
        portal: "entity",
        profile: data.entity ?? null,
      });
      showToast({
        title: "Entity authenticated",
        description: "Your entity workspace is ready.",
      });
      navigate("/entity/dashboard");
    } catch (error) {
      showToast({
        title: "Verification failed",
        description: error.message,
      });
    }
  }

  async function handleResend() {
    try {
      await requestOtp(identity, true);
    } catch (error) {
      showToast({
        title: "Resend failed",
        description: error.message,
      });
    }
  }

  const card = (
    <Card className={`${isModal ? "glass-card" : "glass-card"} w-full max-w-xl overflow-hidden p-8`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-[#0F4C81] p-3 text-white shadow-lg shadow-cyan-100">
            <QrCodeIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-blue-950">Entity Sign In</h2>
            <p className="text-sm text-slate-500">GST number, phone number, and OTP verification</p>
          </div>
        </div>
        {isModal ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Access type</p>
            <p className="mt-1 text-sm font-semibold text-blue-950">OTP session</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3">
        {[1, 2].map((value) => (
          <div key={value} className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold ${
                step >= value
                  ? "step-dot border-teal-300 bg-teal-500 text-white"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {value}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Step {value}</p>
              <p className="text-sm font-medium text-slate-600">
                {value === 1 ? "Verify Identity" : "Enter OTP"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="entity-step-one"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="mt-8 space-y-5"
            onSubmit={requestForm.handleSubmit(handleRequestOtp)}
          >
            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <IdentificationIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-950">Business identity</p>
                  <p className="text-xs text-slate-500">Use the GST number attached to the main entity or branch tree.</p>
                </div>
              </div>
              <label className="mb-2 block text-sm text-slate-700">GST Number</label>
              <Input {...requestForm.register("gst_no")} placeholder="29ABCDE1234F1Z5" />
              <p className="mt-2 text-xs text-rose-400">{requestForm.formState.errors.gst_no?.message}</p>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-[#0F4C81]">
                  <DevicePhoneMobileIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-950">Registered phone</p>
                  <p className="text-xs text-slate-500">The backend accepts the user phone or owner-level entity phone.</p>
                </div>
              </div>
              <label className="mb-2 block text-sm text-slate-700">Phone Number</label>
              <Input {...requestForm.register("phone")} placeholder="9876543210" />
              <p className="mt-2 text-xs text-rose-400">{requestForm.formState.errors.phone?.message}</p>
            </div>

            <Button className="w-full" disabled={requestForm.formState.isSubmitting}>
              {requestForm.formState.isSubmitting ? "Requesting OTP..." : "Send OTP"}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="entity-step-two"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="mt-8 space-y-5"
            onSubmit={verifyForm.handleSubmit(handleVerifyOtp)}
          >
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-teal-700">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-950">Verification snapshot</p>
                  <p className="text-xs text-slate-500">Review the values being sent to the OTP verification route.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">GST</p>
                  <p className="mt-2 text-sm font-semibold text-blue-950">{identity.gst_no}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</p>
                  <p className="mt-2 text-sm font-semibold text-blue-950">{identity.phone}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="block text-sm text-slate-700">One-Time Password</label>
                <span className="text-xs text-slate-400">{countdown > 0 ? `Resend in ${countdown}s` : "OTP expired? Resend now"}</span>
              </div>
              <OtpBoxes value={otpValue} onChange={setOtpValue} />
              <p className="mt-2 text-xs text-rose-400">{verifyForm.formState.errors.otp?.message}</p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={handleResend} disabled={countdown > 0}>
                Resend OTP
              </Button>
              <Button className="flex-1" disabled={verifyForm.formState.isSubmitting}>
                {verifyForm.formState.isSubmitting ? "Verifying..." : "Open Dashboard"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );

  if (isModal) {
    return <div className="w-full max-w-xl">{card}</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-10">
      {card}
    </div>
  );
}
