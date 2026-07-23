"use client";

import { useEffect, useRef, useState } from "react";
import type { RowStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RowCommentInput({
  rowId,
  value,
  onChange,
}: {
  rowId: string;
  value: string;
  onChange: (rowId: string, value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [rowId, value]);

  return (
    <input
      type="text"
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
      }}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        onChange(rowId, next);
      }}
      placeholder="Skriv kommentar…"
      className="h-8 w-full min-w-[8rem] rounded-md border border-[#3a3a3a] bg-[#202020] px-2 text-xs text-white placeholder:text-[#6a6a6a] outline-none focus:border-[#eb6e08] focus:ring-1 focus:ring-[#eb6e08]/40"
    />
  );
}

export function RowStatusButtons({
  rowId,
  status,
  onChange,
}: {
  rowId: string;
  status: RowStatus | undefined;
  onChange: (rowId: string, status: RowStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        title="OK"
        aria-label="Markera som OK"
        aria-pressed={status === "ok"}
        onClick={() => onChange(rowId, "ok")}
        className={cn(
          "size-7 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]",
          status === "ok"
            ? "border-[#4ade80] bg-[#22c55e] shadow-[0_0_0_2px_rgba(34,197,94,0.35)]"
            : "border-[#3a3a3a] bg-[#1a3a24] hover:border-[#4ade80] hover:bg-[#22c55e]/40"
        )}
      />
      <button
        type="button"
        title="Kontrollera"
        aria-label="Markera för kontroll"
        aria-pressed={status === "check"}
        onClick={() => onChange(rowId, "check")}
        className={cn(
          "size-7 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]",
          status === "check"
            ? "border-[#facc15] bg-[#eab308] shadow-[0_0_0_2px_rgba(234,179,8,0.35)]"
            : "border-[#3a3a3a] bg-[#3a3218] hover:border-[#facc15] hover:bg-[#eab308]/40"
        )}
      />
    </div>
  );
}
