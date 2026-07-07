import { useEffect, useState } from "react";
import { UserIcon, MagnifyingGlassIcon, CloudArrowUpIcon, DocumentCheckIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useToast } from "../../context/ToastContext";
import { entityService } from "../../services/entityService";
import { apiClient } from "../../services/api/client";
import { downloadBase64File } from "../../utils/download";

export function EntityCertificatesPage() {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Upload states
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [uploading, setUploading] = useState(false);

  // Load submissions across all entity forms
  async function loadData() {
    try {
      const formsRes = await entityService.getForms();
      const forms = formsRes.data.data?.existingForms || [];
      
      const allSubmissions = [];
      for (const form of forms) {
        try {
          const subRes = await entityService.getSubmissions(form.form_id);
          const subs = subRes.data.data || [];
          for (const s of subs) {
            allSubmissions.push({ ...s, formTitle: form.title });
          }
        } catch {
          // Skip form submissions that fail to load
        }
      }
      
      // Sort by submitted_at descending
      allSubmissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      setSubmissions(allSubmissions);
      if (allSubmissions[0]) {
        setSelectedSub(allSubmissions[0]);
      }
    } catch (error) {
      showToast({ title: "Unable to load data", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [showToast]);

  const filteredSubmissions = submissions.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.customer_name?.toLowerCase().includes(q) ||
      s.unique_id?.toLowerCase().includes(q) ||
      s.formTitle?.toLowerCase().includes(q)
    );
  });

  // Handle PDF file upload
  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast({ title: "Invalid File Type", description: "Only PDF documents are supported." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result);
      setFileName(file.name);
      setFileSize((file.size / 1024).toFixed(1) + " KB");
    };
    reader.readAsDataURL(file);
  }

  // Submit certificate to backend
  async function handleSubmitCertificate(e) {
    e.preventDefault();
    if (!selectedSub || !fileBase64) return;

    setUploading(true);
    try {
      await entityService.generateCertificate(selectedSub.submission_id, {
        pdfUrl: fileBase64,
      });
      showToast({ title: "Certificate Sent", description: `Successfully issued certificate to ${selectedSub.customer_name || "customer"}` });
      // Reset upload inputs
      setFileBase64("");
      setFileName("");
      setFileSize("");
      loadData();
    } catch (error) {
      showToast({ title: "Issuance Failed", description: error.message });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading certificate workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity"
        title="Certificate Issuance"
        description="Select a registered customer, upload their certificate from your local drive, and submit to issue it directly."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left Column: Customer list */}
        <Card className="p-6 flex flex-col h-[650px]">
          <h2 className="text-lg font-semibold text-blue-900">Choose Customer</h2>
          <p className="text-xs text-slate-400 mt-1">Search and select the customer card to issue certificate.</p>
          
          <div className="relative mt-4 flex-shrink-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </span>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="pl-12"
            />
          </div>

          <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((sub) => {
                const isSelected = selectedSub?.submission_id === sub.submission_id;
                return (
                  <div
                    key={sub.submission_id}
                    onClick={() => {
                      setSelectedSub(sub);
                      setFileBase64("");
                      setFileName("");
                      setFileSize("");
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 text-left transition duration-200 ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        {sub.unique_id || "N/A"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                    {sub.certificate ? (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">
                          Certificate Issued
                        </span>
                      </div>
                    ) : null}
                    <p className="mt-2 font-medium text-slate-900">
                      {sub.customer_name || "Unnamed Customer"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{sub.formTitle}</p>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No submissions found" description="Customers will appear here once they scan the QR and submit a form." />
            )}
          </div>
        </Card>

        {/* Right Column: Issuance panel */}
        <Card className="p-6 h-[650px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Send Certificate</h2>
            <p className="text-xs text-slate-400 mt-1">Upload a PDF certificate to attach to the customer profile.</p>

            {selectedSub ? (
              <div className="mt-6 space-y-6">
                {/* Selected customer card details */}
                <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-400">Selected Customer</span>
                    <span className="font-mono text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedSub.unique_id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Name</p>
                      <p className="font-medium text-slate-800">{selectedSub.customer_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Form Submitted</p>
                      <p className="font-medium text-slate-800">{selectedSub.formTitle}</p>
                    </div>
                  </div>
                </div>

                {/* Previously uploaded certificate section */}
                {selectedSub.certificate ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-green-800">Previously Uploaded Certificate</p>
                      <p className="text-xs text-green-600 mt-1">
                        Issued on: {new Date(selectedSub.certificate.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadBase64File(selectedSub.certificate.pdf_url, `certificate-${selectedSub.unique_id}.pdf`)}
                      className="border-green-200 bg-white text-green-800 hover:bg-green-50 hover:border-green-300"
                    >
                      Download
                    </Button>
                  </div>
                ) : null}

                {/* Local file upload zone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Upload Document</label>
                  <div className="relative flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition hover:border-orange-300">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 cursor-pointer opacity-0 w-full h-full"
                    />
                    
                    {fileBase64 ? (
                      <div className="space-y-3">
                        <DocumentCheckIcon className="mx-auto h-12 w-12 text-green-500 animate-bounce" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{fileName}</p>
                          <p className="text-xs text-slate-400">{fileSize}</p>
                        </div>
                        <Button variant="secondary" onClick={() => { setFileBase64(""); setFileName(""); setFileSize(""); }}>
                          Replace File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">Click to select PDF or drag it here</p>
                        <p className="text-xs text-slate-400">Supports PDF documents only</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-20 text-center">
                <p className="text-slate-500">Please select a customer from the left list to issue a certificate.</p>
              </div>
            )}
          </div>

          {selectedSub && (
            <div className="pt-4 border-t border-slate-100">
              <Button
                disabled={!fileBase64 || uploading}
                onClick={handleSubmitCertificate}
                className="w-full flex items-center justify-center gap-2"
              >
                {uploading ? (
                  "Sending Certificate..."
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-5 w-5" />
                    Send Certificate to Customer
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
