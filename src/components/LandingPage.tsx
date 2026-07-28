import Link from "next/link";
import { MysteryPortalTile } from "@/components/MysteryPortalTile";
import { PORTALS } from "@/lib/portals";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <div
      data-mystery-root
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8"
    >
      <header className="mb-12 space-y-3 text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-wider text-[#b8b8b8]">
          GLC
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[#eb6e08] sm:text-5xl">
          Kostnadskontroll
        </h1>
        <p className="max-w-2xl text-[#b8b8b8]">
          Tryck på en av knapparna för att påbörja granskning.
        </p>
      </header>

      <div
        data-mystery-grid
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {PORTALS.map((portal) => {
          const baseClassName = cn(
            "flex min-h-[6.5rem] items-center justify-center rounded-2xl border px-5 py-6 text-center text-lg font-semibold transition-colors",
            "shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
          );

          if (portal.kind === "easter-egg") {
            return (
              <MysteryPortalTile
                key={portal.id}
                className={baseClassName}
              />
            );
          }

          const className = cn(
            baseClassName,
            portal.enabled
              ? "border-[#3a3a3a] bg-[#242424] text-white hover:border-[#eb6e08] hover:bg-[#2a2218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]"
              : "cursor-not-allowed border-[#2a2a2a] bg-[#1f1f1f] text-[#5a5a5a]"
          );

          if (portal.enabled && portal.href) {
            return (
              <Link
                key={portal.id}
                href={portal.href}
                className={className}
              >
                <span data-portal-name>{portal.name}</span>
              </Link>
            );
          }

          return (
            <div
              key={portal.id}
              className={className}
              aria-disabled="true"
              title="Kommer snart"
            >
              <span className="flex flex-col items-center gap-1">
                {portal.name ? (
                  <span data-portal-name>{portal.name}</span>
                ) : null}
                <span className="text-xs font-normal text-[#4a4a4a]">
                  Kommer snart
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
