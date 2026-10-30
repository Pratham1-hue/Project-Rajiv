"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Send, Volume2, ArrowRight } from "lucide-react";
import { audioCue, speakText } from "../lib/audioEngine";

/** Dispatched on window by the global Alt+V shortcut. */
export const VOICE_TOGGLE_EVENT = "tech-netra:toggle-voice";

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
}

interface VoiceControllerProps {
  onCommandSubmit: (transcript: string) => void;
  isProcessing: boolean;
  lastAnnouncement: string;
}

const SAMPLE_VOICE_COMMANDS = [
  "Move to calculate_total function",
  "Skip to next if statement",
  "Go to where verify_token is imported",
  "Next class",
  "Next loop",
  "Next function",
  "Where was this variable last modified?",
];

export const VoiceController: React.FC<VoiceControllerProps> = ({
  onCommandSubmit,
  isProcessing,
  lastAnnouncement,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const win = window as SpeechWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        audioCue.playMicCue(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputVal(currentTranscript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        audioCue.playMicCue(false);
        const reason =
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Microphone access is blocked. Allow microphone permission in your browser settings."
            : event.error === "no-speech"
              ? "No speech was heard."
              : event.error === "audio-capture"
                ? "No microphone was found."
                : "Voice dictation stopped because of an error.";
        // "aborted" happens on a normal manual stop, so stay quiet for it
        if (event.error !== "aborted") {
          speakText(`${reason} You can type your command instead.`);
          document.getElementById("voice-command-input")?.focus();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        audioCue.playMicCue(false);
      };

      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      speakText("Voice dictation is not supported in this browser. Type your command in the command box instead.");
      document.getElementById("voice-command-input")?.focus();
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      audioCue.playMicCue(false);
      if (inputVal.trim()) {
        onCommandSubmit(inputVal.trim());
      }
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        // Recognition already started
      }
    }
  }, [isListening, inputVal, onCommandSubmit]);

  useEffect(() => {
    window.addEventListener(VOICE_TOGGLE_EVENT, toggleListening);
    return () => window.removeEventListener(VOICE_TOGGLE_EVENT, toggleListening);
  }, [toggleListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onCommandSubmit(inputVal.trim());
  };

  const handleChipClick = (cmd: string) => {
    setInputVal(cmd);
    onCommandSubmit(cmd);
  };

  return (
    <section
      aria-labelledby="voice-controller-heading"
      className="glass-panel border-2 border-yellow-400/80 rounded-xl p-5 shadow-2xl text-white transition-all glow-yellow"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className={`p-3 rounded-full border-2 transition-all shadow-md ${
              isListening
                ? "bg-rose-950/90 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)] text-rose-300"
                : "bg-slate-900/90 border-yellow-400/80 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.15)]"
            }`}
          >
            {isListening ? <Mic className="w-7 h-7 motion-safe:animate-bounce" /> : <MicOff className="w-7 h-7" />}
          </div>
          <div>
            <h2 id="voice-controller-heading" className="text-xl font-bold text-yellow-400 font-mono tracking-wide drop-shadow-[0_0_10px_rgba(250,204,21,0.25)]">
              VOICE &amp; INTENT CONTROLLER
            </h2>
            <p className="text-sm text-slate-300" aria-live="polite">
              {isListening
                ? "Listening... Speak your command, then press Alt+V again to run it."
                : "Press Alt+V to dictate, or type a command below and press Enter."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleListening}
          aria-pressed={isListening}
          aria-keyshortcuts="Alt+V"
          className={`min-h-12 px-5 py-3 rounded-lg font-mono font-bold text-base border-2 transition-all shadow-lg flex items-center gap-2 ${
            isListening
              ? "bg-rose-600 border-rose-300 text-white shadow-[0_0_16px_rgba(244,63,94,0.4)]"
              : "bg-yellow-400 border-yellow-200 text-black hover:bg-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.2)]"
          }`}
        >
          <Mic className="w-5 h-5" aria-hidden="true" />
          {isListening ? "Stop Listening (Alt+V)" : "Voice Dictate (Alt+V)"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
        <label htmlFor="voice-command-input" className="sr-only">
          Voice or text command
        </label>
        <input
          id="voice-command-input"
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="e.g. Move to calculate_total function"
          autoComplete="off"
          className="flex-1 min-h-12 bg-slate-950/90 border-2 border-slate-700 focus:border-yellow-400 text-yellow-100 placeholder-slate-400 rounded-lg px-4 py-3 font-mono text-base focus:outline-none focus:ring-4 focus:ring-yellow-400/60 shadow-inner"
        />
        <button
          type="submit"
          disabled={isProcessing || !inputVal.trim()}
          className="min-h-12 px-6 py-3 bg-yellow-400 text-black font-mono font-bold rounded-lg border-2 border-yellow-200 hover:bg-yellow-300 disabled:bg-slate-800 disabled:text-slate-400 disabled:border-slate-700 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-md transition-all"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
          <span>{isProcessing ? "Running..." : "Execute"}</span>
        </button>
      </form>

      {lastAnnouncement && (
        <div className="bg-slate-950/90 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-4 flex items-start gap-3 text-base text-yellow-50 font-mono shadow-inner border border-slate-800/80">
          <Volume2 className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-sm text-yellow-400 font-bold uppercase tracking-wider mb-1">
              Last Spoken Feedback
            </h3>
            <p className="leading-relaxed">{lastAnnouncement}</p>
          </div>
        </div>
      )}

      <div>
        <h3 id="quick-commands-heading" className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
          Quick commands
        </h3>
        <ul aria-labelledby="quick-commands-heading" className="flex flex-wrap gap-2">
          {SAMPLE_VOICE_COMMANDS.map((cmd) => (
            <li key={cmd}>
              <button
                type="button"
                onClick={() => handleChipClick(cmd)}
                className="min-h-11 px-3 py-2 bg-slate-900/90 border border-slate-700/80 hover:border-yellow-400 text-slate-200 hover:text-yellow-200 rounded-lg text-sm font-mono transition-all flex items-center gap-1.5 shadow-sm hover:shadow-[0_0_10px_rgba(250,204,21,0.15)]"
              >
                <span>{cmd}</span>
                <ArrowRight className="w-4 h-4 opacity-70" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
