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
        "block max-w-full truncate text-left",
        tone === "ok" && "text-[#4ade80]",
        tone === "bad" && "text-[#fca5a5]",
        tone === "neutral" && "text-white",
        className
      )}
    >
      {children}
    </span>
  );
}
