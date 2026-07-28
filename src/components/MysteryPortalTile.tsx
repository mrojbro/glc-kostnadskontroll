"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runRandomMysteryEffect } from "@/lib/mysteryEffects";
import { cn } from "@/lib/utils";

interface MysteryPortalTileProps {
  className?: string;
}

export function MysteryPortalTile({ className }: MysteryPortalTileProps) {
  const tileRef = useRef<HTMLButtonElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastEffectIdRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clearActive = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
    setBusy(false);
  }, []);

  useEffect(() => () => clearActive(), [clearActive]);

  const handleClick = useCallback(() => {
    if (busy) return;

    const tile = tileRef.current;
    if (!tile) return;

    const root = tile.closest<HTMLElement>("[data-mystery-root]");
    const grid = tile.closest<HTMLElement>("[data-mystery-grid]");
    if (!root || !grid) return;

    clearActive();
    setBusy(true);

    const handle = runRandomMysteryEffect(
      { root, grid, tile },
      lastEffectIdRef.current
    );
    lastEffectIdRef.current = handle.effectId;
    cleanupRef.current = handle.cleanup;

    timerRef.current = window.setTimeout(() => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      timerRef.current = null;
      setBusy(false);
    }, handle.durationMs);
  }, [busy, clearActive]);

  return (
    <button
      ref={tileRef}
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      title="Kommer snart… eller?"
      className={cn(
        className,
        "cursor-pointer border-[#2a2a2a] bg-[#1f1f1f] text-[#5a5a5a]",
        "hover:border-[#3a3a3a] hover:text-[#7a7a7a]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]/50",
        "disabled:cursor-wait"
      )}
    >
      <span className="flex flex-col items-center gap-1">
        <span
          data-mystery-label
          className="text-xs font-normal text-[#4a4a4a]"
        >
          Kommer snart
        </span>
      </span>
    </button>
  );
}
