"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { AccessibleHeader } from "../components/AccessibleHeader";
import { VoiceController, VOICE_TOGGLE_EVENT } from "../components/VoiceController";
import { AccessibleCodeEditor } from "../components/AccessibleCodeEditor";
import { ASTOutline } from "../components/ASTOutline";
import { ConversationalDebugger } from "../components/ConversationalDebugger";
import { VoiceCodeGenModal } from "../components/VoiceCodeGenModal";
import { FileUploadModal } from "../components/FileUploadModal";
import { VisualCoPilotModal } from "../components/VisualCoPilotModal";
import { KeyboardHelpModal } from "../components/KeyboardHelpModal";
import { LiveAnnouncer } from "../components/LiveAnnouncer";
import { SplashScreen } from "../components/SplashScreen";
import { AmbientSpaceBackground } from "../components/AmbientSpaceBackground";
import { CodeStructure, ASTNode } from "../lib/types";
import {
  getSampleCode,
  jumpAST,
  getNodeAtLine,
  processVoiceCommand,
  parseCode,
  getErrorMessage,
} from "../lib/api";
import { audioCue, speakText, stopSpeaking } from "../lib/audioEngine";
import {
  TEXT_SCALES,
  getServerTextScale,
  getTextScale,
  setTextScale,
  stepTextScale,
  subscribeTextScale,
  getSymbolLevel,
  getServerSymbolLevel,
  setSymbolLevel,
  subscribeSymbolLevel,
  nextSymbolLevel,
  getMotionMode,
  getServerMotionMode,
  setMotionMode,
  subscribeMotionMode,
} from "../lib/preferences";
import { codeSpan, lineToSpeech, openStringAtLineStart, toDisplayText } from "../lib/codeSpeech";

type JumpTarget = "function" | "class" | "loop" | "conditional";

function describeNode(node: ASTNode): string {
  if (node.node_type === "function" || node.node_type === "method" || node.node_type === "class") {
    return `${node.node_type} ${codeSpan(node.name ?? "")}`;
  }
  return `${node.name ?? node.node_type.replace("_", " ")} from line ${node.start_line}`;
}

export default function Home() {
  const [code, setCode] = useState<string>("");
  const [fileName, setFileName] = useState<string>("sample_code.py");
  const [structure, setStructure] = useState<CodeStructure | null>(null);
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [currentScope, setCurrentScope] = useState<string>("Top-level module");
  const [currentDepth, setCurrentDepth] = useState<number>(0);
  const [currentPitch, setCurrentPitch] = useState<number>(220.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [assertiveMsg, setAssertiveMsg] = useState<string>("");
  const [politeMsg, setPoliteMsg] = useState<string>("");
  const [lastAnnouncement, setLastAnnouncement] = useState<string>(
    "Tech Netra initialized. Press Alt+H for keyboard shortcuts or Alt+V to dictate."
  );

  const [isDebuggerOpen, setIsDebuggerOpen] = useState<boolean>(false);
  const [isCodeGenOpen, setIsCodeGenOpen] = useState<boolean>(false);
  const [isVisionOpen, setIsVisionOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState<boolean>(false);

  const textScale = useSyncExternalStore(subscribeTextScale, getTextScale, getServerTextScale);
  const motionMode = useSyncExternalStore(subscribeMotionMode, getMotionMode, getServerMotionMode);
  const isMotionFrozen = motionMode === "frozen";

  const lastNodeIdRef = useRef<string>("module");
  const stringStates = useMemo(
    () => openStringAtLineStart(code, /\.(m?js|jsx|ts|tsx)$/.test(fileName) ? "javascript" : "python"),
    [code, fileName]
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--tech-netra-text-scale", String(textScale));
  }, [textScale]);

  const announce = useCallback((message: string, urgent = false) => {
    // Screens and screen readers get raw code; the speech synthesizer gets symbols as words
    const display = toDisplayText(message);
    if (urgent) setAssertiveMsg(display);
    else setPoliteMsg(display);
    setLastAnnouncement(display);
    speakText(message);
  }, []);

  const toggleMotion = useCallback(() => {
    const next = isMotionFrozen ? "ambient" : "frozen";
    setMotionMode(next);
    announce(
      next === "frozen"
        ? "Ambient space motion frozen."
        : "Ambient space motion resumed with slow drift."
    );
  }, [isMotionFrozen, announce]);

  const symbolLevel = useSyncExternalStore(subscribeSymbolLevel, getSymbolLevel, getServerSymbolLevel);

  const cycleSymbolLevel = useCallback(() => {
    const next = nextSymbolLevel(getSymbolLevel());
    setSymbolLevel(next);
    announce(`Symbols: ${next}. Example: ${codeSpan("total = price * (1 + tax_rate)")}`);
  }, [announce]);

  const changeTextScale = useCallback(
    (direction: 1 | -1) => {
      const next = stepTextScale(getTextScale(), direction);
      setTextScale(next);
      announce(`Text size ${Math.round(next * 100)} percent.`);
    },
    [announce]
  );

  useEffect(() => {
    async function init() {
      try {
        const data = await getSampleCode();
        setCode(data.code);
        setFileName(data.file_name);
        setStructure(data.structure);
        setBackendError(null);
        announce(
          `Loaded ${data.file_name} with ${data.structure.classes.length} classes and ${data.structure.functions.length} functions. Focus is at line 1.`
        );
      } catch (err: unknown) {
        const message = `Cannot reach the Tech Netra backend. Start it with start_backend.bat, then reload this page. (${getErrorMessage(err)})`;
        setBackendError(message);
        announce(message, true);
      }
    }
    init();
  }, [announce]);

  const handleLineChange = useCallback(
    async (newLine: number, announceVoice = true) => {
      setCursorLine(newLine);
      const rawLine = code.split("\n")[newLine - 1] ?? "";
      let speech = rawLine.trim()
        ? `Line ${newLine}: ${lineToSpeech(rawLine, stringStates[newLine - 1] ?? null)}`
        : `Line ${newLine}, blank`;
      try {
        const res = await getNodeAtLine(newLine, 0, code);
        setCurrentScope(res.parent_scope);
        setCurrentDepth(res.indentation_depth);
        setCurrentPitch(res.pitch_frequency);
        audioCue.playIndentationTone(res.pitch_frequency, res.indentation_depth);

        // Mention the enclosing block only when the cursor moves into a different one
        const node = res.found ? res.target_node : null;
        const nodeId = node?.id ?? "module";
        if (nodeId !== lastNodeIdRef.current) {
          lastNodeIdRef.current = nodeId;
          if (node && node.start_line !== newLine) speech += `. Now in ${describeNode(node)}`;
          else if (!node) speech += ". Top level";
        }
      } catch {
        audioCue.playIndentationTone(220, 0);
      }
      if (announceVoice) announce(speech);
    },
    [code, stringStates, announce]
  );

  const applyJumpResult = useCallback(
    (res: Awaited<ReturnType<typeof jumpAST>>) => {
      if (!res.target_node) return;
      lastNodeIdRef.current = res.target_node.id;
      setCursorLine(res.target_node.start_line);
      setCurrentScope(res.parent_scope);
      setCurrentDepth(res.indentation_depth);
      setCurrentPitch(res.pitch_frequency);
      audioCue.playJumpChime();
      audioCue.playIndentationTone(res.pitch_frequency, res.indentation_depth);
      announce(res.speech_announcement, true);
    },
    [announce]
  );

  const handleStructuralJump = useCallback(
    async (targetType: JumpTarget, direction: "next" | "prev" = "next") => {
      setIsProcessing(true);
      try {
        const res = await jumpAST(cursorLine, targetType, direction, code);
        if (res.found && res.target_node) applyJumpResult(res);
        else announce(`No ${targetType} found.`);
      } catch (err: unknown) {
        announce(`AST jump error: ${getErrorMessage(err)}`, true);
      } finally {
        setIsProcessing(false);
      }
    },
    [cursorLine, code, applyJumpResult, announce]
  );

  const handleVoiceCommand = useCallback(
    async (transcript: string) => {
      setIsProcessing(true);
      setPoliteMsg(`Processing voice command: ${transcript}`);
      try {
        const res = await processVoiceCommand(transcript, cursorLine, code);
        if (res.found && res.target_node) applyJumpResult(res);
        else announce(`Command processed: ${res.speech_announcement}`);
      } catch (err: unknown) {
        announce(`Voice command error: ${getErrorMessage(err)}`, true);
      } finally {
        setIsProcessing(false);
      }
    },
    [cursorLine, code, applyJumpResult, announce]
  );

  const anyModalOpen = isDebuggerOpen || isCodeGenOpen || isVisionOpen || isHelpOpen;

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopSpeaking();
        setIsDebuggerOpen(false);
        setIsCodeGenOpen(false);
        setIsVisionOpen(false);
        setIsHelpOpen(false);
        return;
      }

      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      // e.code keeps shortcuts layout-independent and unaffected by Shift
      const code = e.code;
      const dir = e.shiftKey ? "prev" : "next";

      if (code === "Equal" || code === "NumpadAdd") {
        e.preventDefault();
        changeTextScale(1);
        return;
      }
      if (code === "Minus" || code === "NumpadSubtract") {
        e.preventDefault();
        changeTextScale(-1);
        return;
      }
      if (code === "KeyP") {
        e.preventDefault();
        cycleSymbolLevel();
        return;
      }

      // Navigation shortcuts are disabled while a dialog has focus
      if (!anyModalOpen) {
        const jumpKeys: Record<string, JumpTarget> = {
          KeyF: "function",
          KeyC: "class",
          KeyL: "loop",
          KeyI: "conditional",
        };
        if (jumpKeys[code]) {
          e.preventDefault();
          handleStructuralJump(jumpKeys[code], dir);
          return;
        }
        if (code === "KeyV") {
          e.preventDefault();
          window.dispatchEvent(new Event(VOICE_TOGGLE_EVENT));
          return;
        }
      }

      const modalKeys: Record<string, React.Dispatch<React.SetStateAction<boolean>>> = {
        KeyD: setIsDebuggerOpen,
        KeyG: setIsCodeGenOpen,
        KeyA: setIsVisionOpen,
        KeyH: setIsHelpOpen,
        KeyU: setIsFileUploadOpen,
      };
      const setter = modalKeys[code];
      if (setter) {
        e.preventDefault();
        setIsDebuggerOpen(false);
        setIsCodeGenOpen(false);
        setIsVisionOpen(false);
        setIsHelpOpen(false);
        setIsFileUploadOpen(false);
        setter((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleStructuralJump, changeTextScale, cycleSymbolLevel, anyModalOpen]);

  const handleSplashStart = useCallback(() => {
    audioCue.unlock();
    audioCue.playSuccessChime();
    speakText(`Welcome to Tech Netra. ${lastAnnouncement}`);
    document.getElementById("code-listbox")?.focus();
  }, [lastAnnouncement]);

  const reparse = async (updated: string) => {
    try {
      setStructure(await parseCode(updated));
    } catch (err: unknown) {
      announce(`Could not re-parse code: ${getErrorMessage(err)}`, true);
    }
  };

  const handleCodePatched = async (updatedCode: string, targetLine: number) => {
    setCode(updatedCode);
    setCursorLine(targetLine);
    await reparse(updatedCode);
  };

  const handleInsertCode = async (newSnippet: string, afterLine: number) => {
    const lines = code.split("\n");
    const insertIndex = Math.min(Math.max(afterLine, 0), lines.length);
    // Blank separator lines keep the generated block visually and syntactically distinct
    lines.splice(insertIndex, 0, "", ...newSnippet.split("\n"), "");
    const updated = lines.join("\n");
    const firstNewLine = insertIndex + 2;
    setCode(updated);
    setCursorLine(firstNewLine);
    await reparse(updated);
    return firstNewLine;
  };

  const handleFileLoaded = useCallback(async (fileName: string, fileCode: string) => {
    setFileName(fileName);
    setCode(fileCode);
    setCursorLine(1);
    announce(`Loaded ${fileName}. ${fileCode.split("\n").length} lines loaded.`);
    await reparse(fileCode);
  }, [announce]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative overflow-x-hidden">
      {/* Motion-Safe Ambient Cosmic Space Background */}
      <AmbientSpaceBackground isMotionFrozen={isMotionFrozen} />

      <SplashScreen onStart={handleSplashStart} />

      <a href="#code-editor" className="skip-link">
        Skip to code editor
      </a>

      <LiveAnnouncer assertiveMessage={assertiveMsg} politeMessage={politeMsg} />

      <AccessibleHeader
        currentScope={currentScope}
        currentDepth={currentDepth}
        currentPitch={currentPitch}
        isMuted={isMuted}
        isMotionFrozen={isMotionFrozen}
        onToggleMotion={toggleMotion}
        textScale={textScale}
        symbolLevel={symbolLevel}
        onCycleSymbolLevel={cycleSymbolLevel}
        canDecreaseText={textScale > TEXT_SCALES[0]}
        canIncreaseText={textScale < TEXT_SCALES[TEXT_SCALES.length - 1]}
        onDecreaseText={() => changeTextScale(-1)}
        onIncreaseText={() => changeTextScale(1)}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          audioCue.setMuted(next);
          speakText(next ? "Audio cues muted." : "Audio cues unmuted.");
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenVision={() => setIsVisionOpen(true)}
        onOpenCodeGen={() => setIsCodeGenOpen(true)}
        onOpenDebugger={() => setIsDebuggerOpen(true)}
        onOpenFileUpload={() => setIsFileUploadOpen(true)}
      />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 relative z-10">
        {backendError && (
          <div role="alert" className="border-4 border-rose-400 bg-rose-950 text-rose-50 rounded-xl p-4 text-lg font-semibold">
            {backendError}
          </div>
        )}

        <VoiceController
          onCommandSubmit={handleVoiceCommand}
          isProcessing={isProcessing}
          lastAnnouncement={lastAnnouncement}
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          <div id="code-editor" className="xl:col-span-3 scroll-mt-28">
            <AccessibleCodeEditor
              code={code}
              structure={structure}
              cursorLine={cursorLine}
              onLineChange={handleLineChange}
              onStructuralJump={handleStructuralJump}
              fileName={fileName}
              onCodeChange={(newCode) => {
                setCode(newCode);
              }}
            />
          </div>

          <div className="xl:col-span-1">
            <ASTOutline
              structure={structure}
              cursorLine={cursorLine}
              onSelectNode={(node: ASTNode) => {
                handleLineChange(node.start_line, false);
                audioCue.playJumpChime();
                announce(`Jumped to ${node.summary}. ${node.parent_scope}`);
              }}
            />
          </div>
        </div>
      </main>

      <ConversationalDebugger
        currentCode={code}
        onCodePatched={handleCodePatched}
        onFocusLine={(line) => setCursorLine(line)}
        isOpen={isDebuggerOpen}
        onClose={() => setIsDebuggerOpen(false)}
      />

      <VoiceCodeGenModal
        currentCode={code}
        cursorLine={cursorLine}
        fileName={fileName}
        isOpen={isCodeGenOpen}
        onClose={() => setIsCodeGenOpen(false)}
        onInsertCode={handleInsertCode}
      />

      <VisualCoPilotModal isOpen={isVisionOpen} onClose={() => setIsVisionOpen(false)} />

      <FileUploadModal
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        onFileLoaded={handleFileLoaded}
      />

      <KeyboardHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
