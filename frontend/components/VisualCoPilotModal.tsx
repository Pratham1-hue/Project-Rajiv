"use client";

import React, { useRef, useState } from "react";
import { Eye, Volume2, Camera, X, CheckCircle2 } from "lucide-react";
import { runVisionAudit, getErrorMessage } from "../lib/api";
import { audioCue, speakText } from "../lib/audioEngine";
import { VisionAuditResponse } from "../lib/types";
import { useModalFocus } from "../lib/useModalFocus";

interface VisualCoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisualCoPilotModal: React.FC<VisualCoPilotModalProps> = ({ isOpen, onClose }) => {
  const [auditResult, setAuditResult] = useState<VisionAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [targetUrl, setTargetUrl] = useState("http://localhost:3000");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  const handleScreenshotChange = (file: File | undefined) => {
    if (!file) {
      setScreenshot(null);
      setScreenshotName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      speakText("That screenshot is larger than 5 megabytes. Please choose a smaller image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(typeof reader.result === "string" ? reader.result : null);
      setScreenshotName(file.name);
      speakText(`Screenshot attached: ${file.name}. Press Run Audit when ready.`);
    };
    reader.onerror = () => speakText("Could not read that screenshot. Please try another image.");
    reader.readAsDataURL(file);
  };

  const handleRunAudit = async () => {
    setIsLoading(true);
    audioCue.playSuccessChime();
    try {
      const res = await runVisionAudit(screenshot ?? undefined, targetUrl);
      setAuditResult(res);
      speakText(res.full_spoken_announcement);
    } catch (err: unknown) {
      speakText(`Visual audit failed: ${getErrorMessage(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vision-title"
        aria-describedby="vision-desc"
        tabIndex={-1}
        className="glass-panel-deep border-4 border-emerald-400/90 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-white"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-700 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 text-emerald-300 border-2 border-emerald-300 rounded-lg" aria-hidden="true">
              <Eye className="w-7 h-7" />
            </div>
            <div>
              <h2 id="vision-title" className="text-2xl font-bold text-emerald-300 font-mono">
                Visual Co-Pilot
              </h2>
              <p id="vision-desc" className="text-base text-zinc-200">
                Hear a top-left to bottom-right description of a page layout plus an accessibility (WCAG) check.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close visual co-pilot"
            aria-keyshortcuts="Escape"
            className="min-h-12 min-w-12 flex items-center justify-center text-white rounded-lg border-2 border-zinc-400 hover:border-white"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <form
          className="flex flex-col sm:flex-row gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRunAudit();
          }}
        >
          <label htmlFor="audit-url" className="sr-only">
            Page URL to audit
          </label>
          <input
            id="audit-url"
            data-autofocus
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="flex-1 min-h-12 bg-black border-2 border-zinc-500 text-emerald-50 px-4 py-2 rounded-lg font-mono text-base"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-12 px-5 py-3 bg-emerald-300 hover:bg-emerald-200 text-black font-mono font-bold rounded-lg border-2 border-emerald-100 flex items-center justify-center gap-2 text-base disabled:opacity-70"
          >
            <Camera className="w-5 h-5" aria-hidden="true" />
            <span>{isLoading ? "Auditing..." : "Run Audit"}</span>
          </button>
        </form>

        <div className="mb-4">
          <label htmlFor="audit-image" className="block text-base font-mono font-bold text-emerald-100 mb-2">
            Screenshot for visual audit (optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileInputRef}
              id="audit-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-describedby="audit-image-help"
              onChange={(e) => handleScreenshotChange(e.target.files?.[0])}
              className="flex-1 min-h-12 bg-black border-2 border-zinc-500 text-emerald-50 px-4 py-2 rounded-lg text-base file:mr-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:bg-emerald-300 file:text-black file:font-bold"
            />
            {screenshot && (
              <button
                type="button"
                onClick={() => handleScreenshotChange(undefined)}
                className="min-h-12 px-4 py-2 bg-zinc-900 border-2 border-zinc-400 text-white rounded-lg text-base font-mono hover:border-white"
              >
                Remove
              </button>
            )}
          </div>
          <p id="audit-image-help" className="mt-2 text-sm text-zinc-300">
            {screenshot
              ? `Attached: ${screenshotName}`
              : "Attach a PNG, JPG, or WebP screenshot for a real Claude vision audit. Without one, Tech Netra returns its built-in layout check."}
          </p>
        </div>

        {auditResult && (
          <section aria-labelledby="audit-results-heading" className="space-y-4">
            <h3 id="audit-results-heading" className="sr-only">
              Audit results
            </h3>
            <div className="bg-emerald-950 border-2 border-emerald-400 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-300" aria-hidden="true" />
                <p className="font-mono font-bold text-emerald-100 text-lg">
                  Accessibility score: {auditResult.score} out of 100
                </p>
              </div>
              <button
                type="button"
                onClick={() => speakText(auditResult.full_spoken_announcement)}
                className="min-h-12 px-4 py-2 bg-zinc-900 border-2 border-emerald-300 text-emerald-100 rounded-md text-base font-mono flex items-center gap-2 hover:bg-emerald-900"
              >
                <Volume2 className="w-5 h-5" aria-hidden="true" />
                <span>Read Aloud</span>
              </button>
            </div>

            <div className="bg-black border-2 border-zinc-700 p-4 rounded-xl">
              <h4 className="text-lg font-mono font-bold text-yellow-300 mb-2">Layout, top-left to bottom-right</h4>
              <p className="text-base text-white leading-relaxed">{auditResult.spatial_summary}</p>
            </div>

            <div className="bg-black border-2 border-zinc-700 p-4 rounded-xl">
              <h4 className="text-lg font-mono font-bold text-emerald-300 mb-2">WCAG findings</h4>
              <p className="text-base text-white leading-relaxed mb-3">{auditResult.wcag_audit}</p>
              {auditResult.recommendations.length > 0 && (
                <>
                  <h5 className="text-base font-mono font-bold text-zinc-100 mb-1">Recommendations</h5>
                  <ul className="list-disc list-inside space-y-1 text-base text-zinc-100">
                    {auditResult.recommendations.map((rec) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
