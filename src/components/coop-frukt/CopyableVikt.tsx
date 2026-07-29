"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CopyableViktProps {
  value: string;
  className?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyableVikt({ value, className }: CopyableViktProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = value.trim() !== "" && value !== "—";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (!canCopy) return;
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1200);
  }, [canCopy, value]);

  if (!canCopy) {
    return <span className={cn("tabular-nums", className)}>{value}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      title={copied ? "Kopierad" : "Klicka för att kopiera"}
      aria-label={copied ? `Vikt ${value} kopierad` : `Kopiera vikt ${value}`}
      className={cn(
        "tabular-nums rounded-sm px-1 py-0.5 -mx-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]/50",
        copied
          ? "bg-[#22c55e]/25 text-[#86efac]"
          : "cursor-pointer hover:bg-white/10 hover:text-[#eb6e08]",
        className
      )}
    >
      {value}
    </button>
  );
}
