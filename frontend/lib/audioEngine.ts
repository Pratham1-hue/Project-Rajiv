// High-fidelity Web Audio API Sound Cue Engine & Web Speech Interface
// Designed for Visually Impaired and Blind Developers

import { toSpeech } from "./codeSpeech";
import { getSymbolLevel, getTTSEngine, TTSEngine } from "./preferences";

class AudioCueEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** Create/resume the AudioContext. Must run inside a user gesture (keypress or click). */
  public unlock() {
    if (typeof window === "undefined") return;
    try {
      this.getContext();
    } catch {
      // AudioContext unavailable
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a smooth sine tone whose frequency corresponds to indentation depth.
   * Eliminates ear fatigue with a gentle 0.08s exponential envelope.
   */
  public playIndentationTone(frequency: number = 220, depth: number = 0) {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Slightly increase brightness for deeper scopes
      osc.type = depth > 2 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Volume envelope: rapid attack, smooth exponential decay
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // AudioContext policy fallback
    }
  }

  /**
   * Affirmative structural jump chime (two rising harmonious tones)
   */
  public playJumpChime() {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      [330, 440].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.05 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.13);
      });
    } catch {}
  }

  /**
   * Alert tone for intercepted exceptions & stack traces
   */
  public playErrorAlert() {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
    } catch {}
  }

  /**
   * Success chime when patch is applied or code is generated
   */
  public playSuccessChime() {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      [440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    } catch {}
  }

  /**
   * Mic state change cue
   */
  public playMicCue(active: boolean) {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      if (active) {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      } else {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      }

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }
}

export const audioCue = new AudioCueEngine();

let currentEngine: TTSEngine = "web_speech";

export function setEngine(engine: TTSEngine | string) {
  currentEngine = engine as TTSEngine;
}

export function getActiveEngine(): TTSEngine {
  return currentEngine;
}

/**
 * High-reliability Web Speech API Speech Synthesis (TTS) Helper
 */
export function speakText(text: string, cancelPrevious = true, rate = 1.05) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  if (cancelPrevious) {
    window.speechSynthesis.cancel();
  }

  const engine = getTTSEngine();
  const utterance = new SpeechSynthesisUtterance(toSpeech(text, getSymbolLevel()));
  utterance.rate = rate;
  utterance.pitch = engine === "eleven_labs" ? 0.95 : engine === "whisper" ? 1.05 : 1.0;

  // Pick voice based on engine selection if voices are loaded
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    if (engine === "eleven_labs") {
      const natural = voices.find((v) => v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"));
      if (natural) utterance.voice = natural;
    } else if (engine === "whisper") {
      const sharp = voices.find((v) => v.name.includes("David") || v.name.includes("Daniel") || v.name.includes("Alex"));
      if (sharp) utterance.voice = sharp;
    }
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
