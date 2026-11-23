import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import CustomAlert from "../components/CustomAlert";
import { useAlert } from "../hooks/useAlert";

export default function UploadSchedule() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { alertState, triggerAlert, closeAlert } = useAlert();

  useEffect(() => {
    document.title = "Upload Schedule | RA Scheduler";
  }, []);

  // Handle file selection
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      setFile(null);
      setPreview(null);
      return;
    }
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    const raId = localStorage.getItem("raId");
    if (!raId) {
      triggerAlert("Not Logged In", "Please log in again.", "error");
      navigate("/");
      return;
    }

    try {
      // 1. Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${raId}-${Date.now()}.${fileExt}`;

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("schedule")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 3. Get the Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("schedule").getPublicUrl(fileName);

      // 4. Save the URL to the 'ras' table
      const { error: dbError } = await supabase
        .from("ras")
        .update({ schedule_url: publicUrl })
        .eq("id", raId);

      if (dbError) throw dbError;

      triggerAlert("Uploaded!", "Your schedule has been saved successfully.", "success");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      console.error("Upload error:", error);
      triggerAlert(
        "Upload Failed",
        "Could not upload your file. Make sure your 'schedule' storage bucket is set to Public.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 p-5 sm:p-8 font-sans">
      <CustomAlert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
      />

      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Upload Class Schedule
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Upload a screenshot so your admin can see your class times.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors shrink-0 mt-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Drop Zone */}
          <div className="p-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="block cursor-pointer">
              <div
                className={`w-full rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
                  preview
                    ? "border-amber-300 bg-amber-50/30"
                    : "border-slate-200 bg-slate-50/50 hover:border-amber-300 hover:bg-amber-50/20"
                }`}
              >
                {preview ? (
                  <div className="relative p-3">
                    <img
                      src={preview}
                      alt="Schedule preview"
                      className="w-full max-h-72 object-contain rounded-lg"
                    />
                    <div className="absolute inset-3 flex items-end justify-center pb-3 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/30 to-transparent rounded-lg">
                      <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                        Click to change image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        <span className="text-amber-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP · up to 10 MB</p>
                    </div>
                  </div>
                )}
              </div>
            </label>

            {file && (
              <div className="mt-3 flex items-center gap-2 px-1">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-slate-600 font-medium truncate">{file.name}</span>
                <span className="text-xs text-slate-400 shrink-0">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-150 border border-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 active:scale-[0.97] transition-all duration-150 shadow-md shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Uploading…
                </span>
              ) : (
                "Save Schedule"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
