// Persisted display, motion, and speech preferences, shared via useSyncExternalStore.

import { SYMBOL_LEVELS, type SymbolLevel } from "./codeSpeech";

const SYMBOL_KEY = "tech-netra:symbol-level";
const SYMBOL_EVENT = "tech-netra:symbol-level-change";
export const DEFAULT_SYMBOL_LEVEL: SymbolLevel = "most";

export function getSymbolLevel(): SymbolLevel {
  if (typeof window === "undefined") return DEFAULT_SYMBOL_LEVEL;
  const stored = window.localStorage.getItem(SYMBOL_KEY) as SymbolLevel | null;
  return stored && SYMBOL_LEVELS.includes(stored) ? stored : DEFAULT_SYMBOL_LEVEL;
}

export function getServerSymbolLevel(): SymbolLevel {
  return DEFAULT_SYMBOL_LEVEL;
}

export function setSymbolLevel(level: SymbolLevel) {
  window.localStorage.setItem(SYMBOL_KEY, level);
  window.dispatchEvent(new Event(SYMBOL_EVENT));
}

export function subscribeSymbolLevel(callback: () => void) {
  window.addEventListener(SYMBOL_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SYMBOL_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function nextSymbolLevel(current: SymbolLevel): SymbolLevel {
  return SYMBOL_LEVELS[(SYMBOL_LEVELS.indexOf(current) + 1) % SYMBOL_LEVELS.length];
}

export const TEXT_SCALES = [1, 1.125, 1.25, 1.5, 1.75] as const;
export const DEFAULT_TEXT_SCALE = 1.125;

const STORAGE_KEY = "tech-netra:text-scale";
const CHANGE_EVENT = "tech-netra:text-scale-change";

export function getTextScale(): number {
  if (typeof window === "undefined") return DEFAULT_TEXT_SCALE;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return (TEXT_SCALES as readonly number[]).includes(stored) ? stored : DEFAULT_TEXT_SCALE;
}

export function getServerTextScale(): number {
  return DEFAULT_TEXT_SCALE;
}

export function setTextScale(scale: number) {
  window.localStorage.setItem(STORAGE_KEY, String(scale));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeTextScale(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function stepTextScale(current: number, direction: 1 | -1): number {
  const idx = TEXT_SCALES.findIndex((s) => s === current);
  const next = Math.min(TEXT_SCALES.length - 1, Math.max(0, (idx === -1 ? 1 : idx) + direction));
  return TEXT_SCALES[next];
}

export type MotionMode = "ambient" | "frozen";
const MOTION_KEY = "tech-netra:motion-mode";
const MOTION_EVENT = "tech-netra:motion-mode-change";
export const DEFAULT_MOTION_MODE: MotionMode = "ambient";

export function getMotionMode(): MotionMode {
  if (typeof window === "undefined") return DEFAULT_MOTION_MODE;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return "frozen";
  const stored = window.localStorage.getItem(MOTION_KEY) as MotionMode | null;
  return stored === "frozen" || stored === "ambient" ? stored : DEFAULT_MOTION_MODE;
}

export function getServerMotionMode(): MotionMode {
  return DEFAULT_MOTION_MODE;
}

export function setMotionMode(mode: MotionMode) {
  window.localStorage.setItem(MOTION_KEY, mode);
  window.dispatchEvent(new Event(MOTION_EVENT));
}

export function subscribeMotionMode(callback: () => void) {
  window.addEventListener(MOTION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MOTION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// -------------------------------------------------------------
// TTS Engine Preferences
// -------------------------------------------------------------
export type TTSEngine = "web_speech" | "whisper" | "eleven_labs";

export const TTS_ENGINES: { id: TTSEngine; label: string; description: string }[] = [
  {
    id: "web_speech",
    label: "Web Speech API (Built-in)",
    description: "Instant, ultra low-latency client synthesizer with natural OS voices.",
  },
  {
    id: "whisper",
    label: "Whisper Voice Relay",
    description: "Enhanced auditory clarity optimized for rapid code symbols & variable dictation.",
  },
  {
    id: "eleven_labs",
    label: "ElevenLabs Studio Model",
    description: "Warm, human-grade conversational voice for deep tutoring & audio explanations.",
  },
];

const TTS_ENGINE_KEY = "tech-netra:tts-engine";
const TTS_ENGINE_EVENT = "tech-netra:tts-engine-change";
export const DEFAULT_TTS_ENGINE: TTSEngine = "web_speech";

export function getTTSEngine(): TTSEngine {
  if (typeof window === "undefined") return DEFAULT_TTS_ENGINE;
  const stored = window.localStorage.getItem(TTS_ENGINE_KEY) as TTSEngine | null;
  if (stored && (stored === "web_speech" || stored === "whisper" || stored === "eleven_labs")) {
    return stored;
  }
  return DEFAULT_TTS_ENGINE;
}

export function setTTSEngine(engine: TTSEngine) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TTS_ENGINE_KEY, engine);
  window.dispatchEvent(new Event(TTS_ENGINE_EVENT));
}

export function subscribeTTSEngine(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(TTS_ENGINE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(TTS_ENGINE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
