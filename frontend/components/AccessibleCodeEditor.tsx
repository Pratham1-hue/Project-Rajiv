"use client";

import React, { useRef, useEffect, useState } from "react";
import { ASTNode, CodeStructure } from "../lib/types";
import { Code2 } from "lucide-react";
import { toDisplayText } from "../lib/codeSpeech";

interface AccessibleCodeEditorProps {
  code: string;
  structure: CodeStructure | null;
  cursorLine: number;
  onLineChange: (line: number) => void;
  onStructuralJump: (type: "function" | "class" | "loop" | "conditional", direction?: "next" | "prev") => void;
  fileName?: string;
  onCodeChange?: (newCode: string) => void;
}

const NODE_BADGE: Record<string, string> = {
  function: "bg-cyan-950 text-cyan-200 border-cyan-400",
  method: "bg-cyan-950 text-cyan-200 border-cyan-400",
  class: "bg-purple-950 text-purple-200 border-purple-400",
  loop: "bg-emerald-950 text-emerald-200 border-emerald-400",
};
const DEFAULT_BADGE = "bg-amber-950 text-amber-200 border-amber-400";

const JUMP_BUTTONS = [
  { type: "function", label: "Function", key: "Alt+F", cls: "bg-cyan-950 border-cyan-400 text-cyan-100 hover:bg-cyan-900" },
  { type: "class", label: "Class", key: "Alt+C", cls: "bg-purple-950 border-purple-400 text-purple-100 hover:bg-purple-900" },
  { type: "loop", label: "Loop", key: "Alt+L", cls: "bg-emerald-950 border-emerald-400 text-emerald-100 hover:bg-emerald-900" },
  { type: "conditional", label: "If", key: "Alt+I", cls: "bg-amber-950 border-amber-400 text-amber-100 hover:bg-amber-900" },
] as const;

function lineColor(text: string): string {
  const t = text.trim();
  if (t.startsWith("#")) return "text-zinc-300 italic";
  if (t.startsWith("def ") || t.startsWith("class ")) return "text-cyan-200 font-bold";
  if (t.startsWith("return ")) return "text-rose-200";
  return "text-zinc-100";
}

export const AccessibleCodeEditor: React.FC<AccessibleCodeEditorProps> = ({
  code,
  structure,
  cursorLine,
  onLineChange,
  onStructuralJump,
  fileName = "sample_code.py",
  onCodeChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lines = code.split("\n");

  const getNodeForLine = (lineNum: number): ASTNode | undefined => {
    if (!structure) return undefined;
    const startingSym = structure.all_symbols.find((s) => s.start_line === lineNum);
    if (startingSym) return startingSym;
    const enclosing = structure.all_symbols.filter((s) => s.start_line <= lineNum && s.end_line >= lineNum);
    return enclosing.length > 0 ? [...enclosing].sort((a, b) => b.depth - a.depth)[0] : undefined;
  };

  const activeNode = getNodeForLine(cursorLine);
  const activeLineContent = lines[cursorLine - 1] || "";

  // Sync line numbers scroll with textarea scroll
  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Update cursor position based on line
  useEffect(() => {
    if (!textareaRef.current || !isFocused) return;
    
    const lineStart = lines.slice(0, cursorLine - 1).join("\n").length + (cursorLine > 1 ? 1 : 0);
    const lineEnd = lineStart + (lines[cursorLine - 1]?.length || 0);
    
    textareaRef.current.setSelectionRange(lineStart, lineStart);
    textareaRef.current.focus();
  }, [cursorLine, lines, isFocused]);

  const handleCodeChange = (newCode: string) => {
    onCodeChange?.(newCode);
    
    // Calculate current line based on cursor position
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      const linesBeforeCursor = code.substring(0, cursorPos).split("\n").length;
      onLineChange(linesBeforeCursor);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let textarea handle normal typing
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
      return; // Allow normal text input
    }

    // Handle Alt+Navigation shortcuts for structural jumping
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const jumpKeys: Record<string, "function" | "class" | "loop" | "conditional"> = {
        f: "function",
        c: "class",
        l: "loop",
        i: "conditional",
      };
      const dir = e.shiftKey ? "prev" : "next";
      const key = jumpKeys[e.key.toLowerCase()];
      
      if (key) {
        e.preventDefault();
        onStructuralJump(key, dir);
      }
    }
  };

  return (
    <section
      aria-labelledby="editor-heading"
      className="glass-panel-deep border-2 border-yellow-400/80 rounded-xl overflow-hidden shadow-2xl flex flex-col glow-yellow transition-all"
    >
      <div className="bg-slate-900/90 border-b border-slate-700/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Code2 className="w-6 h-6 text-yellow-400" aria-hidden="true" />
          <h2 id="editor-heading" className="font-mono font-bold text-lg text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">
            {fileName}
          </h2>
          <span className="text-sm font-mono text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-700/60">
            Line {cursorLine} of {lines.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Jump to next structure">
          {JUMP_BUTTONS.map((b) => (
            <button
              key={b.type}
              type="button"
              onClick={() => onStructuralJump(b.type, "next")}
              aria-keyshortcuts={b.key}
              aria-label={`Next ${b.label}`}
              className={`min-h-11 px-3 py-1.5 border-2 rounded-lg text-sm font-mono font-semibold transition-all shadow-sm ${b.cls}`}
            >
              {b.label} <kbd className="opacity-90">{b.key}</kbd>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-950/95 border-b border-slate-700/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-base font-mono">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-yellow-400 font-bold whitespace-nowrap">Line {cursorLine}:</span>
          <span className="text-white truncate">{activeLineContent.trim() || "(empty line)"}</span>
        </div>
        {activeNode && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`px-2.5 py-1 rounded border font-bold shadow-sm ${NODE_BADGE[activeNode.node_type] ?? DEFAULT_BADGE}`}>
              {activeNode.node_type.toUpperCase()}: {activeNode.name || "block"}
            </span>
            <span className="text-slate-300">
              {activeNode.parent_scope} · Depth {activeNode.depth}
            </span>
          </div>
        )}
      </div>

      <p id="editor-instructions" className="sr-only">
        Editable code editor. Type to edit code. Use Alt+F next function, Alt+C next class, Alt+L next loop, Alt+I next if statement. Add Shift to go back.
      </p>

      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden bg-slate-950/95"
      >
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="bg-slate-950 border-r border-slate-700/60 px-3 py-4 font-mono text-sm text-zinc-500 select-none overflow-hidden"
          aria-hidden="true"
          style={{
            minWidth: "3.5rem",
            lineHeight: "1.5rem",
            height: "60vh",
            minHeight: "22rem",
          }}
        >
          {lines.map((_, idx) => (
            <div key={idx + 1} className="h-6">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onScroll={handleScroll}
          onClick={(e) => {
            const textarea = e.currentTarget;
            const cursorPos = textarea.selectionStart;
            const linesBeforeCursor = code.substring(0, cursorPos).split("\n").length;
            onLineChange(linesBeforeCursor);
          }}
          aria-label={`Source code of ${fileName}`}
          aria-describedby="editor-instructions"
          spellCheck={false}
          className="flex-1 font-mono text-base leading-6 p-4 bg-slate-950/95 text-zinc-100 border-none focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none placeholder-slate-600"
          placeholder="Start typing code..."
          style={{
            fontFamily: "'Fira Code', 'Courier New', monospace",
            tabSize: 2,
            lineHeight: "1.5rem",
          } as React.CSSProperties}
        />
      </div>
    </section>
  );
};
