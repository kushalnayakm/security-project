import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircleIcon, ClockIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { apiClient } from "../../services/api/client";
import { downloadBase64File } from "../../utils/download";

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [fields, setFields] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("customer_session");
    if (!stored) {
      navigate("/customer/login");
      return;
    }

    const parsed = JSON.parse(stored);
    setSession(parsed);

    async function loadData() {
      try {
        const headers = { Authorization: `Bearer ${parsed.token}` };

        const [subRes, certRes] = await Promise.all([
          apiClient.get("/customer/me/submission", { headers }),
          apiClient.get("/customer/me/certificate", { headers }),
        ]);

        setSubmission(subRes.data.data?.submission || null);
        setFields(subRes.data.data?.fields || []);
        setCertificate(certRes.data.data || null);
      } catch (err) {
        if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
          sessionStorage.removeItem("customer_session");
          navigate("/customer/login");
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [navigate]);

  function handleLogout() {
    sessionStorage.removeItem("customer_session");
    navigate("/customer/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <p className="text-sm text-slate-500">Loading your dashboard...</p>
      </div>
    );
  }

  const customerId = session?.customer?.unique_id || session?.customer?.customer_id || "Unknown";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Customer Portal</p>
            <h1 className="mt-2 text-2xl font-semibold text-blue-900">Your Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">ID: <span className="font-mono font-medium">{customerId}</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Logout
          </button>
        </div>

        {error ? (
          <Card className="p-6">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          </Card>
        ) : null}

        {/* Submission Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-blue-900">Submission Details</h2>
          {submission ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Submitted At</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "N/A"}
                </p>
              </div>
              {submission.data ? (() => {
                const answersObj = typeof submission.data === "string" ? JSON.parse(submission.data) : (submission.data || {});
                return (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Your Answers</p>
                    <div className="mt-3 space-y-2">
                      {Object.entries(answersObj).map(([key, value], index) => {
                        const fieldObj = fields.find((f) => f.field_id === key);
                        const labelName = fieldObj ? fieldObj.label : (fields[index] ? fields[index].label : `Field ${index + 1}`);
                        return (
                          <div key={key} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
                            <span className="text-sm text-slate-500 truncate max-w-[40%]" title={labelName}>
                              {labelName}
                            </span>
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[55%]" title={Array.isArray(value) ? value.join(", ") : String(value)}>
                              {Array.isArray(value) ? value.join(", ") : String(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No submission data found.</p>
          )}
        </Card>

        {/* Certificate Status */}
        {certificate?.available ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-blue-900">Certificate Status</h2>
            <div className="mt-4">
              <div className="flex items-center gap-4 rounded-[28px] border-2 border-green-200 bg-green-50 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircleIcon className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Certificate Issued</p>
                  <p className="mt-1 text-sm text-green-600">
                    Issued on: {certificate.certificate?.issue_date ? new Date(certificate.certificate.issue_date).toLocaleDateString() : "N/A"}
                  </p>
                  {certificate.certificate?.pdf_url ? (
                    <button
                      onClick={() => downloadBase64File(certificate.certificate.pdf_url, "certificate.pdf")}
                      className="mt-2 inline-block text-sm font-medium text-blue-900 underline bg-transparent border-0 p-0 cursor-pointer"
                    >
                      Download Certificate
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
