"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Terminal,
  Eye,
  Sparkles,
  AArrowDown,
  AArrowUp,
  Braces,
  Pause,
  Play,
  Sliders,
  Upload,
} from "lucide-react";
import { audioCue, speakText } from "../lib/audioEngine";
import VoiceSettingsModal from "./VoiceSettingsModal";
import { AudioPulseWave } from "./AudioPulseWave";
import type { SymbolLevel } from "../lib/codeSpeech";

interface AccessibleHeaderProps {
  currentScope: string;
  currentDepth: number;
  currentPitch: number;
  isMuted: boolean;
  isMotionFrozen?: boolean;
  onToggleMotion?: () => void;
  textScale: number;
  symbolLevel: SymbolLevel;
  onCycleSymbolLevel: () => void;
  canDecreaseText: boolean;
  canIncreaseText: boolean;
  onDecreaseText: () => void;
  onIncreaseText: () => void;
  onToggleMute: () => void;
  onOpenHelp: () => void;
  onOpenVision: () => void;
  onOpenCodeGen: () => void;
  onOpenDebugger: () => void;
  onOpenFileUpload?: () => void;
}

const toolButton =
  "min-h-12 min-w-12 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-md backdrop-blur-sm";

export const AccessibleHeader: React.FC<AccessibleHeaderProps> = ({
  currentScope,
  currentDepth,
  currentPitch,
  isMuted,
  isMotionFrozen = false,
  onToggleMotion,
  textScale,
  symbolLevel,
  onCycleSymbolLevel,
  canDecreaseText,
  canIncreaseText,
  onDecreaseText,
  onIncreaseText,
  onToggleMute,
  onOpenHelp,
  onOpenVision,
  onOpenCodeGen,
  onOpenDebugger,
  onOpenFileUpload,
}) => {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Keyboard shortcut Alt + Shift + V for Voice Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "V" || e.key === "v")) {
        e.preventDefault();
        setVoiceModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAnnounceScope = () => {
    const text = `Current Scope: ${currentScope}. Indentation depth ${currentDepth}, tone frequency ${currentPitch} Hertz.`;
    speakText(text);
    audioCue.playIndentationTone(currentPitch, currentDepth);
  };

  return (
    <header className="sticky top-0 z-40 glass-header px-4 md:px-6 py-3 text-white transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3">
          <Image
            src="/tech-netra-logo.svg"
            alt="Tech Netra logo"
            width={300}
            height={120}
            priority
            unoptimized
            className="h-12 w-auto"
          />
          <h1 className="text-2xl font-bold tracking-wide text-cyan-300 font-mono drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]">
            TECH NETRA
          </h1>
          <span className="hidden lg:inline-block px-2.5 py-1 rounded text-sm font-semibold bg-slate-900/90 text-yellow-300 border border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
            Voice-First Codebase Assistant
          </span>
        </div>

        {/* Current Scope button */}
        <button
          type="button"
          onClick={handleAnnounceScope}
          aria-label={`Current scope: ${currentScope}, depth ${currentDepth}. Press to hear it aloud.`}
          className="min-h-12 px-4 py-2 bg-slate-900/90 border-2 border-yellow-400/90 rounded-lg text-base font-mono text-white hover:bg-slate-800/90 flex items-center gap-3 max-w-full shadow-lg shadow-black/40 hover:border-yellow-300"
        >
          <span className="text-yellow-400 font-bold">Scope:</span>
          <span className="truncate max-w-[16rem] md:max-w-md">{currentScope}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm bg-yellow-400 text-black px-2 py-0.5 rounded font-bold whitespace-nowrap">
              Depth {currentDepth} · {currentPitch}Hz
            </span>
            <AudioPulseWave isActive={true} frequency={currentPitch} color="yellow" />
          </div>
        </button>

        {/* Navigation Tools */}
        <nav aria-label="Tools" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenDebugger}
            aria-keyshortcuts="Alt+D"
            className={`${toolButton} border-rose-400/80 text-rose-200 hover:bg-rose-950/80 hover:border-rose-400`}
          >
            <Terminal className="w-5 h-5" aria-hidden="true" />
            <span>Debugger</span>
            <kbd className="hidden md:inline text-xs font-mono opacity-90">Alt+D</kbd>
          </button>

          <button
            type="button"
            onClick={onOpenCodeGen}
            aria-keyshortcuts="Alt+G"
            className={`${toolButton} border-cyan-400/80 text-cyan-200 hover:bg-cyan-950/80 hover:border-cyan-300`}
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            <span>Generate</span>
            <kbd className="hidden md:inline text-xs font-mono opacity-90">Alt+G</kbd>
          </button>

          <button
            type="button"
            onClick={onOpenVision}
            aria-keyshortcuts="Alt+A"
            className={`${toolButton} border-emerald-400/80 text-emerald-200 hover:bg-emerald-950/80 hover:border-emerald-300`}
          >
            <Eye className="w-5 h-5" aria-hidden="true" />
            <span>Visual Audit</span>
            <kbd className="hidden md:inline text-xs font-mono opacity-90">Alt+A</kbd>
          </button>

          {/* File Upload button */}
          {onOpenFileUpload && (
            <button
              type="button"
              onClick={onOpenFileUpload}
              aria-keyshortcuts="Alt+U"
              className={`${toolButton} border-emerald-400/80 text-emerald-200 hover:bg-emerald-950/80 hover:border-emerald-300`}
            >
              <Upload className="w-5 h-5" aria-hidden="true" />
              <span>Upload</span>
              <kbd className="hidden md:inline text-xs font-mono opacity-90">Alt+U</kbd>
            </button>
          )}



          {/* Voice Settings button */}
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            aria-label="Voice settings (Alt+Shift+V)"
            aria-keyshortcuts="Alt+Shift+V"
            title="Voice Synthesizer Settings (Alt+Shift+V)"
            className={`${toolButton} border-violet-400/80 text-violet-200 hover:bg-violet-950/80 hover:border-violet-300`}
          >
            <Sliders className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">Voice</span>
            <kbd className="hidden lg:inline text-xs font-mono opacity-90">Alt+⇧+V</kbd>
          </button>



          {/* Text size controls */}
          <div
            role="group"
            aria-label={`Text size ${Math.round(textScale * 100)} percent`}
            className="flex items-center gap-1"
          >
            <button
              type="button"
              onClick={onDecreaseText}
              disabled={!canDecreaseText}
              aria-label="Decrease text size"
              aria-keyshortcuts="Alt+Minus"
              className={`${toolButton} border-yellow-400/80 text-yellow-300 hover:bg-slate-800 disabled:border-slate-700 disabled:text-slate-600`}
            >
              <AArrowDown className="w-5 h-5" aria-hidden="true" />
            </button>
            <span className="font-mono text-sm text-yellow-200 w-12 text-center" aria-hidden="true">
              {Math.round(textScale * 100)}%
            </span>
            <button
              type="button"
              onClick={onIncreaseText}
              disabled={!canIncreaseText}
              aria-label="Increase text size"
              aria-keyshortcuts="Alt+Equal"
              className={`${toolButton} border-yellow-400/80 text-yellow-300 hover:bg-slate-800 disabled:border-slate-700 disabled:text-slate-600`}
            >
              <AArrowUp className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Spoken symbols toggle */}
          <button
            type="button"
            onClick={onCycleSymbolLevel}
            aria-label={`Spoken symbols: ${symbolLevel}. Press to change.`}
            aria-keyshortcuts="Alt+P"
            className={`${toolButton} border-yellow-400/80 text-yellow-300 hover:bg-slate-800 font-mono`}
          >
            <Braces className="w-5 h-5" aria-hidden="true" />
            <span className="capitalize">Symbols: {symbolLevel}</span>
          </button>

          {/* Mute audio cues */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={isMuted}
            aria-label="Mute audio cues"
            className={`${toolButton} ${
              isMuted ? "border-slate-500 text-slate-300 bg-slate-800/90" : "border-yellow-400/80 text-yellow-300"
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Volume2 className="w-5 h-5" aria-hidden="true" />
            )}
          </button>

          {/* Help Modal trigger */}
          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Keyboard shortcuts and voice help"
            aria-keyshortcuts="Alt+H"
            className={`${toolButton} border-yellow-400/80 text-yellow-300 hover:bg-slate-800`}
          >
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </button>
        </nav>

        {/* Voice Settings Modal */}
        <VoiceSettingsModal open={voiceModalOpen} setOpen={setVoiceModalOpen} />
      </div>
    </header>
  );
};
