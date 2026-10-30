"use client";

import React, { useState, useRef } from "react";
import { Sparkles, Check, X, Volume2, Mic } from "lucide-react";
import { generateCode, getErrorMessage } from "../lib/api";
import { audioCue, speakText } from "../lib/audioEngine";
import { CodeGenResponse } from "../lib/types";
import { useModalFocus, isTypingTarget } from "../lib/useModalFocus";
import { toDisplayText } from "../lib/codeSpeech";

interface VoiceCodeGenModalProps {
  currentCode: string;
  cursorLine: number;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  /** Inserts the snippet after `afterLine` and resolves to the first inserted line. */
  onInsertCode: (newCodeSnippet: string, afterLine: number) => Promise<number>;
}

const SAMPLE_PROMPTS = [
  "Create a function that takes a list of integers and returns prime numbers",
  "Add a promotional coupon discount function that gives 10 percent off",
  "Write an order validation check that verifies customer age is over 18",
];

export const VoiceCodeGenModal: React.FC<VoiceCodeGenModalProps> = ({
  currentCode,
  cursorLine,
  fileName,
  isOpen,
  onClose,
  onInsertCode,
}) => {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [result, setResult] = useState<CodeGenResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  const startVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakText("Speech recognition not available in your browser. Try typing the prompt instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      audioCue.playStartChime?.();
      speakText("Listening for your prompt...");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setPrompt(transcript);
      speakText(`Prompt set: ${transcript}`);
    };

    recognition.onerror = (event: any) => {
      speakText(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await generateCode(prompt.trim(), currentCode, fileName, cursorLine);
      setResult(res);
      audioCue.playSuccessChime();
      speakText(res.audio_diff_summary);
    } catch (err: unknown) {
      speakText(`Code generation failed: ${getErrorMessage(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!result) return;
    const firstLine = await onInsertCode(result.generated_code, result.target_line);
    audioCue.playSuccessChime();
    speakText(`Inserted ${result.lines_added} lines into ${fileName}. Cursor is on line ${firstLine}.`);
    setResult(null);
    onClose();
  };

  const handleReject = () => {
    setResult(null);
    speakText("Generated code rejected.");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && result && !isTypingTarget(e.target)) {
      e.preventDefault();
      handleAccept();
    }
    if (e.altKey && (e.key === "M" || e.key === "m")) {
      e.preventDefault();
      startVoiceInput();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="codegen-title"
        aria-describedby="codegen-desc"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="glass-panel-deep border-4 border-cyan-400/90 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-white glow-cyan"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-700 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950 text-cyan-300 border-2 border-cyan-300 rounded-lg" aria-hidden="true">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 id="codegen-title" className="text-2xl font-bold text-cyan-300 font-mono">
                Voice Code Generator
              </h2>
              <p id="codegen-desc" className="text-base text-zinc-200">
                Describe the code you want. You will hear a summary of the change before anything is inserted after line{" "}
                {cursorLine}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close code generator"
            aria-keyshortcuts="Escape"
            className="min-h-12 min-w-12 flex items-center justify-center text-white rounded-lg border-2 border-zinc-400 hover:border-white"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label htmlFor="codegen-prompt" className="block text-base font-mono font-bold text-zinc-100">
              What should the code do?
            </label>
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={isListening || isGenerating}
              aria-label="Dictate prompt using microphone (Alt+M)"
              aria-keyshortcuts="Alt+M"
              className={`min-h-10 min-w-10 flex items-center justify-center rounded-lg border-2 transition-all ${
                isListening
                  ? "bg-red-500 border-red-300 text-white"
                  : "bg-cyan-950 border-cyan-400 text-cyan-300 hover:bg-cyan-900"
              }`}
              title="Dictate your prompt"
            >
              <Mic className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <textarea
            id="codegen-prompt"
            data-autofocus
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-black border-2 border-zinc-500 focus:border-cyan-300 text-cyan-50 font-mono text-base p-3 rounded-lg"
            placeholder="Type or use the microphone button to dictate..."
          />
        </div>

        <fieldset className="mb-4">
          <legend className="text-base font-mono text-zinc-200 mb-2">Example prompts</legend>
          <div className="flex flex-col gap-2">
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPrompt(p);
                  speakText(`Prompt set: ${p}`);
                }}
                aria-pressed={prompt === p}
                className={`min-h-11 text-left px-3 py-2 border-2 rounded text-base font-mono transition-colors ${
                  prompt === p
                    ? "bg-cyan-950 border-cyan-300 text-cyan-50"
                    : "bg-zinc-900 border-zinc-600 hover:border-cyan-300 text-zinc-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full min-h-12 py-3 bg-cyan-300 hover:bg-cyan-200 text-black font-mono font-bold rounded-lg border-2 border-cyan-100 flex items-center justify-center gap-2 text-base mb-6 disabled:bg-zinc-800 disabled:text-zinc-300 disabled:border-zinc-600"
        >
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          <span>{isGenerating ? "Generating..." : "Generate & Read Summary"}</span>
        </button>

        {result && (
          <section aria-labelledby="codegen-result-heading" className="bg-black border-2 border-cyan-300 rounded-xl p-5 mb-2">
            <h3 id="codegen-result-heading" className="sr-only">
              Generated code
            </h3>
            <div className="flex items-start gap-2 mb-3 bg-cyan-950 border-2 border-cyan-400 p-3 rounded-lg">
              <Volume2 className="w-6 h-6 text-cyan-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p role="status" className="text-lg font-mono text-cyan-50 font-semibold">
                {toDisplayText(result.audio_diff_summary)}
              </p>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-mono font-bold text-zinc-100">Lines to add</h4>
              <button
                type="button"
                onClick={() => speakText(`Code to add: ${result.generated_code}`)}
                className="min-h-9 px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 text-sm font-mono rounded flex items-center gap-2"
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
                className="min-h-12 px-5 py-3 bg-cyan-300 hover:bg-cyan-200 text-black font-mono font-bold rounded-lg border-2 border-cyan-100 flex items-center gap-2 text-base"
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
