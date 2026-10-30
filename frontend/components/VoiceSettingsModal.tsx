"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Volume2, Check } from "lucide-react";
import { useModalFocus } from "../lib/useModalFocus";
import { getTTSEngine, setTTSEngine, subscribeTTSEngine, TTS_ENGINES, type TTSEngine } from "../lib/preferences";
import { setEngine, speakText } from "../lib/audioEngine";

interface VoiceSettingsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function VoiceSettingsModal({ open, setOpen }: VoiceSettingsModalProps) {
  const containerRef = useModalFocus<HTMLDivElement>(open);
  const [selectedEngine, setSelectedEngine] = useState<TTSEngine>(getTTSEngine());
  const isInitialRef = useRef(true);

  useEffect(() => {
    if (isInitialRef.current) {
      isInitialRef.current = false;
    }
    return subscribeTTSEngine(() => {
      setSelectedEngine(getTTSEngine());
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  const handleSelect = (engineId: TTSEngine) => {
    setSelectedEngine(engineId);
    setTTSEngine(engineId);
    setEngine(engineId);
    speakText(`Voice engine changed to ${TTS_ENGINES.find((e) => e.id === engineId)?.label ?? engineId}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass-panel-deep w-full max-w-lg p-6 rounded-2xl shadow-2xl border-2 border-yellow-400/80 text-white focus:outline-none"
      >
        <div className="flex items-center justify-between pb-4 border-b border-yellow-400/30">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            <h2 id="voice-settings-title" className="text-xl font-bold font-mono text-yellow-300">
              Voice Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close voice settings"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-300">
          Select your preferred Text-to-Speech (TTS) synthesizer engine. Settings persist automatically across sessions.
        </p>

        <div role="radiogroup" aria-label="Available TTS Engines" className="mt-5 space-y-3">
          {TTS_ENGINES.map((eng) => {
            const isSelected = selectedEngine === eng.id;
            return (
              <button
                key={eng.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(eng.id)}
                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between text-left transition-all ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]"
                    : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800/60"
                }`}
              >
                <div>
                  <div className="font-semibold text-base font-mono text-white flex items-center gap-2">
                    {eng.label}
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-400 text-black font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{eng.description}</div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-yellow-400 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-yellow-400/20">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
