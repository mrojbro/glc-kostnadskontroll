"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExcelUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  hint?: ReactNode;
}

const ACCEPTED =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export function ExcelUploader({
  onFileSelected,
  disabled,
  hint,
}: ExcelUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;
      const file = files[0];
      const name = file.name.toLowerCase();
      if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        return;
      }
      onFileSelected(file);
    },
    [disabled, onFileSelected]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
        "bg-[#242424] shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        isDragging
          ? "border-[#eb6e08] bg-[#2a2218]"
          : "border-[#3a3a3a] hover:border-[#eb6e08]/50",
        disabled && "pointer-events-none opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[#202020] border border-[#3a3a3a]">
        {isDragging ? (
          <Upload className="size-8 text-[#eb6e08]" aria-hidden />
        ) : (
          <FileSpreadsheet className="size-8 text-[#eb6e08]" aria-hidden />
        )}
      </div>

      <div className="space-y-2 max-w-md">
        <p className="text-lg font-semibold text-white">
          {isDragging
            ? "Släpp Excel-filen här"
            : "Ladda upp Excel-arbetsbok"}
        </p>
        <p className="text-sm text-[#b8b8b8]">
          {hint ?? (
            <>
              Dra och släpp en fil här, eller klicka för att välja. Kräver
              arbetsbladen{" "}
              <span className="text-white">Invoice basis summary</span> och{" "}
              <span className="text-white">Invoice basis</span>.
            </>
          )}
        </p>
      </div>

      <span className="inline-flex items-center rounded-lg bg-[#eb6e08] px-4 py-2 text-sm font-medium text-white shadow-sm">
        Välj fil
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
