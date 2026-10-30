export interface ASTNode {
  id: string;
  node_type: string;
  name?: string | null;
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
  depth: number;
  parent_scope: string;
  parameters: string[];
  return_type?: string | null;
  docstring?: string | null;
  summary: string;
  audio_pitch_frequency: number;
  code_snippet?: string | null;
  children: ASTNode[];
}

export interface CodeStructure {
  file_path?: string | null;
  language: string;
  total_lines: number;
  classes: ASTNode[];
  functions: ASTNode[];
  methods: ASTNode[];
  imports: ASTNode[];
  loops: ASTNode[];
  conditionals: ASTNode[];
  all_symbols: ASTNode[];
}

export interface JumpResponse {
  found: boolean;
  target_node?: ASTNode | null;
  speech_announcement: string;
  pitch_frequency: number;
  indentation_depth: number;
  parent_scope: string;
}

export interface DebugExplainResponse {
  error_type: string;
  error_message: string;
  error_line: number;
  tldr_summary: string;
  spoken_announcement: string;
  patch_diff: string;
  patch_spoken: string;
  original_line: string;
  patched_line: string;
  auto_patch_available: boolean;
}

export interface CodeGenResponse {
  generated_code: string;
  audio_diff_summary: string;
  diff_text: string;
  lines_added: number;
  target_line: number;
  file_name: string;
}

export interface VisionAuditResponse {
  spatial_summary: string;
  wcag_audit: string;
  full_spoken_announcement: string;
  score: number;
  recommendations: string[];
}

