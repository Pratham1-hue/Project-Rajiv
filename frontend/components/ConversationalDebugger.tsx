"use client";

import React, { useState } from "react";
import { Bug, Play, Check, X, Search, Volume2 } from "lucide-react";
import { explainStackTrace, queryVariable, applyPatch, getErrorMessage } from "../lib/api";
import { audioCue, speakText } from "../lib/audioEngine";
import { DebugExplainResponse } from "../lib/types";
import { useModalFocus, isTypingTarget } from "../lib/useModalFocus";
import { toDisplayText } from "../lib/codeSpeech";

interface ConversationalDebuggerProps {
  currentCode: string;
  onCodePatched: (updatedCode: string, targetLine: number) => void;
  onFocusLine: (line: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_STACK_TRACE = `Traceback (most recent call last):
  File "sample_code.py", line 97, in process_order
    total_with_tax = subtotal + raw_tax_fee
TypeError: unsupported operand type(s) for +: 'float' and 'str'`;

export const ConversationalDebugger: React.FC<ConversationalDebuggerProps> = ({
  currentCode,
  onCodePatched,
  onFocusLine,
  isOpen,
  onClose,
}) => {
  const [stackTrace, setStackTrace] = useState(SAMPLE_STACK_TRACE);
  const [debugResult, setDebugResult] = useState<DebugExplainResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [variableQuery, setVariableQuery] = useState("raw_tax_fee");
  const [varResult, setVarResult] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  const handleExplain = async () => {
    setIsAnalyzing(true);
    audioCue.playErrorAlert();
    try {
      const res = await explainStackTrace(stackTrace, currentCode);
      setDebugResult(res);
      setStatusMsg("");
      onFocusLine(res.error_line);
      speakText(res.spoken_announcement);
    } catch (err: unknown) {
      speakText(`Debugging service error: ${getErrorMessage(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!debugResult || !debugResult.auto_patch_available) return;
    try {
      const res = await applyPatch(currentCode, debugResult.error_line, debugResult.patched_line);
      if (res.success) {
        audioCue.playSuccessChime();
        speakText(res.speech_announcement);
        setStatusMsg(toDisplayText(res.speech_announcement));
        onCodePatched(res.updated_code, res.line_number);
        setDebugResult(null);
      }
    } catch (err: unknown) {
      speakText(`Failed to apply patch: ${getErrorMessage(err)}`);
    }
  };

  const handleQueryVariable = async () => {
    if (!variableQuery.trim()) return;
    try {
      const targetLine = debugResult?.error_line || 97;
      const res = await queryVariable(currentCode, targetLine, variableQuery.trim());
      setVarResult(toDisplayText(res.speech_announcement));
      speakText(res.speech_announcement);
    } catch (err: unknown) {
      speakText(`Variable inspection failed: ${getErrorMessage(err)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isTypingTarget(e.target) && debugResult?.auto_patch_available) {
      e.preventDefault();
      handleApplyPatch();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="debugger-title"
        aria-describedby="debugger-desc"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="glass-panel-deep border-4 border-rose-400/90 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-white"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-700 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-950 text-rose-300 border-2 border-rose-400 rounded-lg" aria-hidden="true">
              <Bug className="w-7 h-7" />
            </div>
            <div>
              <h2 id="debugger-title" className="text-2xl font-bold text-rose-300 font-mono">
                Conversational Debugger
              </h2>
              <p id="debugger-desc" className="text-base text-zinc-200">
                Paste a stack trace to hear a short explanation, jump to the failing line, and apply a one-line fix.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close debugger"
            aria-keyshortcuts="Escape"
            className="min-h-12 min-w-12 flex items-center justify-center text-white rounded-lg border-2 border-zinc-400 hover:border-white"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="stack-trace-input" className="block text-base font-mono font-bold text-zinc-100 mb-2">
            Stack trace or error log
          </label>
          <textarea
            id="stack-trace-input"
            data-autofocus
            rows={5}
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            className="w-full bg-black border-2 border-zinc-500 focus:border-rose-300 text-rose-100 font-mono text-base p-3 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={handleExplain}
            disabled={isAnalyzing}
            className="min-h-12 px-5 py-3 bg-rose-500 hover:bg-rose-400 text-black font-mono font-bold rounded-lg border-2 border-rose-200 flex items-center gap-2 text-base disabled:opacity-70"
          >
            <Play className="w-5 h-5" aria-hidden="true" />
            <span>{isAnalyzing ? "Analyzing..." : "Explain Error"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStackTrace(SAMPLE_STACK_TRACE);
              speakText("Loaded sample TypeError stack trace.");
            }}
            className="min-h-12 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-mono rounded-lg border-2 border-zinc-500 text-base"
          >
            Load Sample TypeError
          </button>
        </div>

        <p role="status" className="sr-only">
          {statusMsg}
        </p>

        {debugResult && (
          <section
            aria-labelledby="debug-findings-heading"
            className="bg-black border-2 border-rose-400 rounded-xl p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-6 h-6 text-rose-300" aria-hidden="true" />
              <h3 id="debug-findings-heading" className="text-lg font-bold text-rose-300 font-mono">
                Summary for line {debugResult.error_line}
              </h3>
            </div>
            <p className="text-lg text-white bg-zinc-900 p-4 rounded border-2 border-zinc-700 mb-4 leading-relaxed">
              {toDisplayText(debugResult.tldr_summary)}
            </p>

            <h4 className="text-base font-mono font-bold text-zinc-100 mb-1">Suggested change</h4>
            <pre className="bg-zinc-950 border-2 border-zinc-700 p-3 rounded font-mono text-base overflow-x-auto mb-4">
              <span className="text-rose-300 block">
                <span className="sr-only">Remove: </span>- {debugResult.original_line.trim()}
              </span>
              <span className="text-emerald-300 block">
                <span className="sr-only">Add: </span>+ {debugResult.patched_line.trim()}
              </span>
            </pre>

            {debugResult.auto_patch_available && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleApplyPatch}
                  aria-keyshortcuts="Enter"
                  className="min-h-12 px-5 py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-bold rounded-lg border-2 border-emerald-100 flex items-center gap-2 text-base"
                >
                  <Check className="w-5 h-5" aria-hidden="true" />
                  <span>Apply Fix (Enter)</span>
                </button>
                <span className="text-base text-zinc-200">{toDisplayText(debugResult.patch_spoken)}</span>
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="var-inspect-heading" className="border-t-2 border-zinc-700 pt-4">
          <h3 id="var-inspect-heading" className="text-lg font-bold text-yellow-300 font-mono mb-2 flex items-center gap-2">
            <Search className="w-5 h-5" aria-hidden="true" />
            Where was a variable last changed?
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <label htmlFor="variable-query" className="sr-only">
              Variable name
            </label>
            <input
              id="variable-query"
              type="text"
              value={variableQuery}
              onChange={(e) => setVariableQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQueryVariable();
                }
              }}
              placeholder="Variable name, e.g. subtotal"
              className="flex-1 min-h-12 bg-black border-2 border-zinc-500 text-white px-3 py-2 rounded font-mono text-base"
            />
            <button
              type="button"
              onClick={handleQueryVariable}
              className="min-h-12 px-4 py-2 bg-yellow-400 text-black font-mono font-bold text-base rounded hover:bg-yellow-300"
            >
              Find Last Change
            </button>
          </div>
          {varResult && (
            <p role="status" className="text-base font-mono text-yellow-100 bg-zinc-900 p-3 rounded border-2 border-yellow-400">
              {varResult}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
