"use client";

import React, { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { useModalFocus } from "../lib/useModalFocus";
import { speakText, audioCue } from "../lib/audioEngine";
import { getErrorMessage } from "../lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileLoaded: (fileName: string, code: string) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onFileLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    audioCue.playSuccessChime?.();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data = await res.json();

      speakText(
        `Loaded ${data.file_name}. ${data.line_count} lines. ${data.structure_summary || "File loaded successfully."}`
      );

      onFileLoaded(data.file_name, data.content);
      onClose();
    } catch (err: unknown) {
      speakText(`File upload failed: ${getErrorMessage(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-upload-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-emerald-400/50 rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="file-upload-title" className="text-2xl font-bold text-emerald-100 flex items-center gap-3">
            <Upload className="w-6 h-6" aria-hidden="true" />
            Upload Code File
          </h2>
          <button
            onClick={onClose}
            className="min-h-10 min-w-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 text-white"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-emerald-50 text-sm">
            Supported formats: Python (.py), JavaScript/TypeScript (.js, .jsx, .ts, .tsx), Java (.java), C/C++ (.cpp, .cc, .cxx, .c, .h, .hpp)
          </p>

          <p className="text-emerald-50 text-sm">
            Maximum file size: 5 MB
          </p>

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={isLoading}
              accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.cc,.cxx,.c,.h,.hpp"
              className="block w-full text-base text-emerald-50
                file:mr-4 file:py-2 file:px-4 file:rounded-lg
                file:border-0 file:bg-emerald-400 file:text-black file:font-bold
                hover:file:bg-emerald-300 file:cursor-pointer
                bg-slate-950 border-2 border-slate-700 rounded-lg p-3
                disabled:opacity-50"
              aria-label="Choose a code file"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full min-h-12 px-4 py-3 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-mono font-bold rounded-lg border-2 border-emerald-200"
          >
            {isLoading ? "Uploading..." : "Choose File"}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            Your file will be loaded into the editor and analyzed for structure.
          </p>
        </div>
      </div>
    </div>
  );
};
