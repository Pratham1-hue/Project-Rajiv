"use client";

import React, { useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { speakText } from "../lib/audioEngine";
import { useModalFocus } from "../lib/useModalFocus";

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Navigate code",
    items: [
      { key: "Up / Down Arrow", desc: "Move one line, with a pitch tone for indentation depth" },
      { key: "Page Up / Page Down", desc: "Move ten lines" },
      { key: "Home / End", desc: "First or last line" },
      { key: "Alt + F", desc: "Next function or method (add Shift for previous)" },
      { key: "Alt + C", desc: "Next class (add Shift for previous)" },
      { key: "Alt + L", desc: "Next loop (add Shift for previous)" },
      { key: "Alt + I", desc: "Next if statement (add Shift for previous)" },
    ],
  },
  {
    title: "Voice and tools",
    items: [
      { key: "Alt + V", desc: "Start or stop voice dictation" },
      { key: "Alt + D", desc: "Open the conversational debugger" },
      { key: "Alt + G", desc: "Open the voice code generator" },
      { key: "Alt + A", desc: "Open the visual co-pilot audit" },
      { key: "Alt + H", desc: "Open this help" },
    ],
  },
  {
    title: "Display and dialogs",
    items: [
      { key: "Alt + Plus / Alt + Minus", desc: "Increase or decrease text size" },
      {
        key: "Alt + P",
        desc: "Spoken symbols: Some (operators only), Most (adds brackets, dots, colons), All (adds underscores, commas, quotes)",
      },
      { key: "Enter", desc: "In a dialog: apply the suggested fix or accept generated code" },
      { key: "Escape", desc: "Stop speech and close the open dialog" },
      { key: "Tab", desc: "First Tab shows a link to skip straight to the code editor" },
    ],
  },
];

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (isOpen) {
      speakText(
        "Keyboard shortcuts. Alt F next function, Alt C next class, Alt L next loop, Alt I next if, Alt V to dictate, Alt plus or minus for text size, Escape to close."
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
        className="glass-panel-deep border-4 border-yellow-400/90 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-white glow-yellow"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-700 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400 text-black rounded-lg" aria-hidden="true">
              <Keyboard className="w-7 h-7" />
            </div>
            <div>
              <h2 id="help-title" className="text-2xl font-bold text-yellow-300 font-mono">
                Keyboard &amp; Voice Shortcuts
              </h2>
              <p className="text-base text-zinc-200">Everything works without a mouse.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            aria-keyshortcuts="Escape"
            className="min-h-12 min-w-12 flex items-center justify-center text-white rounded-lg border-2 border-zinc-400 hover:border-white"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} className="mb-5">
            <h3 className="text-lg font-bold text-yellow-300 font-mono mb-2">{group.title}</h3>
            <dl className="space-y-2">
              {group.items.map((s) => (
                <div
                  key={s.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-zinc-900 border-2 border-zinc-700 rounded-lg text-base"
                >
                  <dt>
                    <kbd className="px-2.5 py-1 bg-black border-2 border-yellow-400 text-yellow-200 rounded font-mono font-bold">
                      {s.key}
                    </kbd>
                  </dt>
                  <dd className="text-zinc-100 sm:text-right">{s.desc}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-12 py-3 bg-yellow-400 text-black font-mono font-bold text-base rounded-lg border-2 border-yellow-200 hover:bg-yellow-300"
        >
          Close Help (Escape)
        </button>
      </div>
    </div>
  );
};
