"use client";

import React, { useState } from "react";
import { ASTNode, CodeStructure } from "../lib/types";
import { Layers, Search } from "lucide-react";
import { toDisplayText } from "../lib/codeSpeech";

interface ASTOutlineProps {
  structure: CodeStructure | null;
  cursorLine: number;
  onSelectNode: (node: ASTNode) => void;
}

const TABS = ["all", "classes", "functions", "loops"] as const;
type Tab = (typeof TABS)[number];

const NODE_BADGE: Record<string, string> = {
  class: "bg-purple-950 text-purple-100 border-purple-400",
  function: "bg-cyan-950 text-cyan-100 border-cyan-400",
  method: "bg-cyan-950 text-cyan-100 border-cyan-400",
  loop: "bg-emerald-950 text-emerald-100 border-emerald-400",
};

export const ASTOutline: React.FC<ASTOutlineProps> = ({ structure, cursorLine, onSelectNode }) => {
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");

  if (!structure) {
    return (
      <aside aria-label="Code structure" className="bg-black border-2 border-zinc-600 rounded-xl p-4 text-zinc-200 text-base">
        <p role="status">Loading code structure...</p>
      </aside>
    );
  }

  let symbols: ASTNode[] = structure.all_symbols;
  if (activeTab === "classes") symbols = structure.classes;
  else if (activeTab === "functions") symbols = structure.functions.concat(structure.methods);
  else if (activeTab === "loops") symbols = structure.loops;

  const query = filter.trim().toLowerCase();
  if (query) {
    symbols = symbols.filter(
      (s) => (s.name && s.name.toLowerCase().includes(query)) || s.summary.toLowerCase().includes(query)
    );
  }

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (idx + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setActiveTab(TABS[next]);
    document.getElementById(`ast-tab-${TABS[next]}`)?.focus();
  };

  return (
    <aside
      aria-labelledby="ast-outline-heading"
      className="glass-panel border-2 border-yellow-400/80 rounded-xl p-4 shadow-xl flex flex-col h-[70vh] min-h-[26rem] glow-yellow transition-all"
    >
      <div className="flex items-center justify-between mb-3 border-b-2 border-slate-700/80 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-yellow-400" aria-hidden="true" />
          <h2 id="ast-outline-heading" className="font-mono font-bold text-yellow-300 text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.25)]">
            Code Outline
          </h2>
        </div>
        <span className="text-sm font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700/60" aria-live="polite">
          {symbols.length} items
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" aria-hidden="true" />
        <label htmlFor="ast-filter" className="sr-only">
          Filter outline by name
        </label>
        <input
          id="ast-filter"
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name..."
          className="w-full min-h-12 bg-slate-950/90 border-2 border-slate-700 focus:border-yellow-400 text-white pl-10 pr-3 py-2 rounded-lg text-base font-mono shadow-inner"
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-3" role="tablist" aria-label="Outline categories">
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            id={`ast-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="ast-symbol-list"
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(e) => handleTabKeyDown(e, idx)}
            className={`min-h-11 py-1.5 text-sm font-mono font-semibold rounded-lg uppercase border-2 transition-all ${
              activeTab === tab
                ? "bg-yellow-400 text-black border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                : "bg-slate-900/90 text-slate-200 border-slate-700/80 hover:border-slate-500"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <ul
        id="ast-symbol-list"
        role="tabpanel"
        aria-labelledby={`ast-tab-${activeTab}`}
        className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono"
      >
        {symbols.length === 0 && <li className="text-base text-slate-300 p-2">No matching items.</li>}
        {symbols.map((sym) => {
          const isSelected = sym.start_line <= cursorLine && sym.end_line >= cursorLine;
          return (
            <li key={sym.id}>
              <button
                type="button"
                onClick={() => onSelectNode(sym)}
                aria-current={isSelected ? "location" : undefined}
                aria-label={`${toDisplayText(sym.summary)}. ${sym.parent_scope}.`}
                className={`w-full text-left p-3 rounded-lg border-2 flex items-start justify-between gap-2 transition-all ${
                  isSelected
                    ? "bg-yellow-400/20 border-yellow-400 text-white shadow-[0_0_12px_rgba(250,204,21,0.15)]"
                    : "bg-slate-950/90 border-slate-700/80 hover:border-slate-500 text-slate-100"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs uppercase px-1.5 py-0.5 rounded font-bold border ${
                        NODE_BADGE[sym.node_type] ?? "bg-amber-950 text-amber-100 border-amber-400"
                      }`}
                    >
                      {sym.node_type}
                    </span>
                    <span className="font-bold truncate text-base">{sym.name || sym.node_type}</span>
                  </div>
                  <div className="text-sm text-slate-300 truncate">{sym.parent_scope}</div>
                </div>
                <span className="flex-shrink-0 text-sm text-yellow-300 font-bold">L{sym.start_line}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
