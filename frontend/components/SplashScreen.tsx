"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

// Keys that must not dismiss the splash: focus movement and screen-reader modifiers
const IGNORED_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "Insert", "NumLock"]);

interface SplashScreenProps {
  /** Runs inside the dismissing user gesture, so audio and speech may start here. */
  onStart: () => void;
}

/**
 * Shown on every full page load, including reloads. The keypress or click that
 * dismisses it is the user gesture browsers require before audio cues and
 * speech can play.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const [visible, setVisible] = useState(true);
  const startRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    onStart();
  }, [onStart]);

  useEffect(() => {
    if (!visible) return;
    startRef.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (IGNORED_KEYS.has(e.key)) return;
      // Capture phase + stop: the starting keypress must not also trigger an app shortcut
      e.preventDefault();
      e.stopImmediatePropagation();
      dismiss();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = "";
    };
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      aria-describedby="splash-desc splash-hint"
      onClick={dismiss}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1116] p-6 cursor-pointer"
    >
      <div className="tn-splash-in flex flex-col items-center text-center max-w-3xl">
        <Image
          src="/tech-netra-logo.svg"
          alt=""
          width={300}
          height={120}
          priority
          unoptimized
          className="tn-logo-glow w-[min(80vw,34rem)] h-auto mb-8"
        />

        <h2 id="splash-title" className="text-4xl md:text-6xl font-bold tracking-wide text-white mb-4">
          Welcome to <span className="text-cyan-300">Tech Netra</span>
        </h2>

        <p id="splash-desc" className="text-xl md:text-2xl text-zinc-100 mb-10 leading-relaxed">
          Your voice-first code assistant for blind and low-vision developers.
        </p>

        <button
          ref={startRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="min-h-14 px-10 py-4 rounded-xl bg-cyan-300 hover:bg-cyan-200 text-black text-2xl font-bold border-4 border-cyan-100"
        >
          Start
        </button>

        <p id="splash-hint" className="mt-6 text-lg text-zinc-200">
          Press any key to begin. Sound and speech turn on when you start.
        </p>
      </div>
    </div>
  );
};
