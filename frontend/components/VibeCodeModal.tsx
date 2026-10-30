"use client";

import React, { useState } from "react";
import { Sparkles, Check, X, Volume2 } from "lucide-react";
import { getErrorMessage } from "../lib/api";
import { audioCue, speakText } from "../lib/audioEngine";
import { useModalFocus, isTypingTarget } from "../lib/useModalFocus";
import { toDisplayText } from "../lib/codeSpeech";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

interface VibeCodeModalProps {
  currentCode: string;
  cursorLine: number;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onInsertCode: (newCodeSnippet: string, afterLine: number) => Promise<number>;
}

interface VibeCodeResponse {
  generated_code: string;
  audio_diff_summary: string;
  lines_added: number;
  target_line: number;
}

const VIBE_PRESETS = [
  { label: "Optimistic", description: "Generate code that's clean, positive, and forward-thinking" },
  { label: "Minimalist", description: "Generate minimal, elegant code with just essentials" },
  { label: "Pragmatic", description: "Generate practical, production-ready code" },
  { label: "Experimental", description: "Generate creative, cutting-edge code patterns" },
];

export const VibeCodeModal: React.FC<VibeCodeModalProps> = ({
  currentCode,
  cursorLine,
  fileName,
  isOpen,
  onClose,
  onInsertCode,
}) => {
  const [vibe, setVibe] = useState("pragmatic");
  const [customVibe, setCustomVibe] = useState("");
  const [result, setResult] = useState<VibeCodeResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const vibeToUse = customVibe.trim() || vibe;
    if (!vibeToUse) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/vibe-code/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibe: vibeToUse,
          current_code: currentCode,
          file_name: fileName,
          cursor_line: cursorLine,
        }),
      });

      if (!res.ok) throw new Error(`Vibe code generation failed: ${res.statusText}`);

      const data: VibeCodeResponse = await res.json();
      setResult(data);
      audioCue.playSuccessChime?.();
      speakText(data.audio_diff_summary);
    } catch (err: unknown) {
      speakText(`Vibe code generation failed: ${getErrorMessage(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!result) return;
    const firstLine = await onInsertCode(result.generated_code, result.target_line);
    audioCue.playSuccessChime?.();
    speakText(`Inserted ${result.lines_added} lines with the ${vibe} vibe into ${fileName}. Cursor is on line ${firstLine}.`);
    setResult(null);
    onClose();
  };

  const handleReject = () => {
    setResult(null);
    speakText("Vibe code rejected.");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && result && !isTypingTarget(e.target)) {
      e.preventDefault();
      handleAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vibe-title"
        aria-describedby="vibe-desc"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="glass-panel-deep border-4 border-purple-400/90 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-white glow-purple"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-700 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-950 text-purple-300 border-2 border-purple-300 rounded-lg" aria-hidden="true">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 id="vibe-title" className="text-2xl font-bold text-purple-300 font-mono">
                Vibe Code Generator
              </h2>
              <p id="vibe-desc" className="text-base text-zinc-200">
                Generate code with a specific vibe or personality after line {cursorLine}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close vibe code generator"
            aria-keyshortcuts="Escape"
            className="min-h-12 min-w-12 flex items-center justify-center text-white rounded-lg border-2 border-zinc-400 hover:border-white"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <fieldset className="mb-6">
          <legend className="text-base font-mono font-bold text-zinc-100 mb-3">Choose a vibe</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {VIBE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setVibe(preset.label.toLowerCase());
                  setCustomVibe("");
                  speakText(`Vibe set to ${preset.label}. ${preset.description}`);
                }}
                aria-pressed={vibe === preset.label.toLowerCase() && !customVibe}
                className={`min-h-20 text-left px-4 py-3 border-2 rounded-lg transition-all ${
                  vibe === preset.label.toLowerCase() && !customVibe
                    ? "bg-purple-950 border-purple-300 text-purple-50"
                    : "bg-zinc-900 border-zinc-600 hover:border-purple-300 text-zinc-100"
                }`}
              >
                <div className="font-bold text-base">{preset.label}</div>
                <div className="text-sm text-zinc-300 mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mb-6">
          <label htmlFor="custom-vibe" className="block text-base font-mono font-bold text-zinc-100 mb-2">
            Or describe a custom vibe
          </label>
          <textarea
            id="custom-vibe"
            rows={2}
            value={customVibe}
            onChange={(e) => setCustomVibe(e.target.value)}
            placeholder="e.g., 'bubbly and colorful', 'strict and formal', 'playful and dynamic'"
            className="w-full bg-black border-2 border-zinc-500 focus:border-purple-300 text-purple-50 font-mono text-base p-3 rounded-lg"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full min-h-12 py-3 bg-purple-300 hover:bg-purple-200 text-black font-mono font-bold rounded-lg border-2 border-purple-100 flex items-center justify-center gap-2 text-base mb-6 disabled:bg-zinc-800 disabled:text-zinc-300 disabled:border-zinc-600"
        >
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          <span>{isGenerating ? "Generating..." : "Generate Code With This Vibe"}</span>
        </button>

        {result && (
          <section aria-labelledby="vibe-result-heading" className="bg-black border-2 border-purple-300 rounded-xl p-5 mb-2">
            <h3 id="vibe-result-heading" className="sr-only">
              Generated code
            </h3>
            <div className="flex items-start gap-2 mb-3 bg-purple-950 border-2 border-purple-400 p-3 rounded-lg">
              <Volume2 className="w-6 h-6 text-purple-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p role="status" className="text-lg font-mono text-purple-50 font-semibold">
                {toDisplayText(result.audio_diff_summary)}
              </p>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-mono font-bold text-zinc-100">Lines to add</h4>
              <button
                type="button"
                onClick={() => speakText(`Code to add: ${result.generated_code}`)}
                className="min-h-9 px-3 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-400 text-purple-300 text-sm font-mono rounded flex items-center gap-2"
                aria-label="Read generated code aloud"
                title="Click to hear the code read aloud"
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>Read Code</span>
              </button>
            </div>
            <pre
              tabIndex={0}
              aria-label="Generated code preview"
              className="bg-zinc-950 border-2 border-zinc-700 p-3 rounded font-mono text-base overflow-auto text-emerald-200 mb-4 max-h-64"
            >
              {result.generated_code}
            </pre>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAccept}
                aria-keyshortcuts="Enter"
                className="min-h-12 px-5 py-3 bg-purple-300 hover:bg-purple-200 text-black font-mono font-bold rounded-lg border-2 border-purple-100 flex items-center gap-2 text-base"
              >
                <Check className="w-5 h-5" aria-hidden="true" />
                <span>Accept & Insert (Enter)</span>
              </button>
              <button
                type="button"
                onClick={handleReject}
                aria-keyshortcuts="Escape"
                className="min-h-12 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-mono rounded-lg border-2 border-zinc-400 flex items-center gap-2 text-base"
              >
                <X className="w-5 h-5" aria-hidden="true" />
                <span>Reject (Escape)</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
