"use client";

import { useEffect, useState } from "react";
import {
  formatSwedishCurrency,
  formatSwedishDecimal2,
  parseNumericValue,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

type StatusTone = "ok" | "bad" | "neutral";

interface EditableResursCellProps {
  rowId: string;
  value: number;
  displayValue: string;
  tone: StatusTone;
  onChange: (rowId: string, resurs: number) => void;
}

function formatDraft(value: number): string {
  return formatSwedishDecimal2(value);
}

export function EditableResursCell({
  rowId,
  value,
  displayValue,
  tone,
  onChange,
}: EditableResursCellProps) {
  const [draft, setDraft] = useState(() => formatDraft(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatDraft(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === "—") {
      onChange(rowId, 0);
      setDraft(formatDraft(0));
      return;
    }
    const parsed = parseNumericValue(trimmed);
    if (parsed === null) {
      setDraft(formatDraft(value));
      return;
    }
    onChange(rowId, parsed);
    setDraft(formatDraft(parsed));
  };

  const shown = focused
    ? draft
    : displayValue.trim() || formatSwedishCurrency(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={shown}
      onFocus={(e) => {
        const input = e.currentTarget;
        setFocused(true);
        setDraft(formatDraft(value));
        requestAnimationFrame(() => input.select());
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraft(formatDraft(value));
          e.currentTarget.blur();
        }
      }}
      aria-label="Redigera Resurs"
      title="Klicka för att redigera Resurs"
      className={cn(
        "box-border w-full min-w-0 max-w-full truncate rounded-sm border border-transparent bg-transparent px-0 py-0 text-left text-xs tabular-nums outline-none transition-colors",
        "hover:border-[#3a3a3a]",
        "focus:border-[#eb6e08] focus:bg-[#202020] focus:px-1 focus:ring-1 focus:ring-[#eb6e08]/40",
        tone === "ok" && "text-[#4ade80]",
        tone === "bad" && "text-[#fca5a5]",
        tone === "neutral" && "text-white"
      )}
    />
  );
}
