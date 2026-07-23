import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "ok" | "bad" | "neutral";

export function StatusPill({
  tone,
  children,
  title,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        // block + w-fit keeps left edges aligned even if the cell is text-centered
        "block w-fit max-w-full truncate rounded-md px-2 py-0.5 text-left text-xs leading-5",
        tone === "ok" &&
          "bg-[#22c55e]/20 font-medium text-[#4ade80] ring-1 ring-[#4ade80]/35",
        tone === "bad" &&
          "bg-[#ef4444]/20 font-medium text-[#fca5a5] ring-1 ring-[#ef4444]/40",
        tone === "neutral" && "font-medium text-white ring-1 ring-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
