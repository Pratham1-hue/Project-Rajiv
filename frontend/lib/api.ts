import {
  CodeStructure,
  JumpResponse,
  DebugExplainResponse,
  CodeGenResponse,
  VisionAuditResponse,
} from "./types";

// Set NEXT_PUBLIC_API_URL to the deployed backend URL at build time.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function getSampleCode(): Promise<{
  file_name: string;
  file_path: string;
  code: string;
  structure: CodeStructure;
}> {
  const res = await fetch(`${API_BASE}/api/ast/sample`);
  if (!res.ok) throw new Error(`Failed to load sample code: ${res.statusText}`);
  return res.json();
}

export async function parseCode(code: string, filePath?: string): Promise<CodeStructure> {
  const res = await fetch(`${API_BASE}/api/ast/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, file_path: filePath }),
  });
  if (!res.ok) throw new Error(`Parse error: ${res.statusText}`);
  return res.json();
}

export async function jumpAST(
  currentLine: number,
  targetType: "function" | "class" | "loop" | "conditional" | "any",
  direction: "next" | "prev" = "next",
  code?: string
): Promise<JumpResponse> {
  const res = await fetch(`${API_BASE}/api/ast/jump`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_line: currentLine,
      target_type: targetType,
      direction,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Jump error: ${res.statusText}`);
  return res.json();
}

export async function getNodeAtLine(
  line: number,
  col = 0,
  code?: string
): Promise<JumpResponse> {
  const res = await fetch(`${API_BASE}/api/ast/node-at-line`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line, col, code }),
  });
  if (!res.ok) throw new Error(`Node at line error: ${res.statusText}`);
  return res.json();
}

export async function processVoiceCommand(
  transcript: string,
  currentLine = 1,
  code?: string
): Promise<JumpResponse> {
  const res = await fetch(`${API_BASE}/api/ast/voice-command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voice_transcript: transcript,
      current_line: currentLine,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Voice command error: ${res.statusText}`);
  return res.json();
}

export async function explainStackTrace(
  stackTrace: string,
  code?: string
): Promise<DebugExplainResponse> {
  const res = await fetch(`${API_BASE}/api/debug/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stack_trace: stackTrace, code }),
  });
  if (!res.ok) throw new Error(`Debug explain error: ${res.statusText}`);
  return res.json();
}

export async function queryVariable(
  code: string,
  targetLine: number,
  variableName: string
) {
  const res = await fetch(`${API_BASE}/api/debug/query-variable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      target_line: targetLine,
      variable_name: variableName,
    }),
  });
  if (!res.ok) throw new Error(`Query variable error: ${res.statusText}`);
  return res.json();
}

export async function applyPatch(
  code: string,
  lineNumber: number,
  newLineContent: string
) {
  const res = await fetch(`${API_BASE}/api/debug/apply-patch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      line_number: lineNumber,
      new_line_content: newLineContent,
    }),
  });
  if (!res.ok) throw new Error(`Apply patch error: ${res.statusText}`);
  return res.json();
}

export async function generateCode(
  prompt: string,
  currentCode: string,
  fileName = "sample_code.py",
  insertAtLine?: number
): Promise<CodeGenResponse> {
  const res = await fetch(`${API_BASE}/api/codegen/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      current_code: currentCode,
      file_name: fileName,
      insert_at_line: insertAtLine,
    }),
  });
  if (!res.ok) throw new Error(`Codegen error: ${res.statusText}`);
  return res.json();
}

export async function runVisionAudit(
  imageBase64?: string,
  url = "http://localhost:3000"
): Promise<VisionAuditResponse> {
  const formData = new FormData();
  if (imageBase64) formData.append("image_base64", imageBase64);
  formData.append("url", url);

  const res = await fetch(`${API_BASE}/api/vision/audit`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Vision audit error: ${res.statusText}`);
  return res.json();
}

