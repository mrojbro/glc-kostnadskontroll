"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BrHanssonsInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InstructionStep {
  title: string;
  body: string;
  image: ReactNode;
}

const STEPS: InstructionStep[] = [
  {
    title: "1. Ladda upp båda filerna",
    body: "Välj 15:00-filen (KL15) och 21:00-filen (KL21). Filnamnen måste innehålla respektive kod så att rätt fil kopplas till rätt tidpunkt.",
    image: <UploadIllustration />,
  },
  {
    title: "2. Jämför bokningarna",
    body: "Klicka på Jämför filer. Verktyget matchar rader per Angöring namn - sista och letar efter skillnader i Kollinslag mellan 15:00 och 21:00.",
    image: <CompareIllustration />,
  },
  {
    title: "3. Granska och markera klart",
    body: "Varje angöring visas på två rader — en för 15:00 och en för 21:00. Skillnader i Kolli markeras rött. Tryck Klar när du gått igenom en angöring.",
    image: <TableIllustration />,
  },
];

export function BrHanssonsInstructionsTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="lg"
      className="mt-1 h-10 gap-2 rounded-lg bg-[#eb6e08] px-4 text-white hover:bg-[#d46207] focus-visible:border-[#eb6e08] focus-visible:ring-[#eb6e08]/40"
      onClick={onClick}
    >
      <CircleHelp className="size-4" aria-hidden />
      Instruktion
    </Button>
  );
}

export function BrHanssonsInstructionsDialog({
  open,
  onOpenChange,
}: BrHanssonsInstructionsDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Stäng instruktion"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#242424] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#3a3a3a] px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <h2
              id={titleId}
              className="text-lg font-semibold text-white sm:text-xl"
            >
              Instruktion — Br Hanssons
            </h2>
            <p className="text-sm text-[#b8b8b8]">
              Så här jämför du preliminära och slutliga bokningar.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#3a3a3a] bg-[#202020] text-[#b8b8b8] transition-colors hover:border-[#eb6e08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb6e08]/50"
            aria-label="Stäng"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-8">
            <section className="rounded-xl border border-[#3a3a3a] bg-[#202020] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-white">
                Vad gör verktyget?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#b8b8b8]">
                Br Hanssons jämför Excel-filer från kl 15:00 och kl 21:00. Du
                ser snabbt vilka angöringar som har fått ändrat Kollinslag
                mellan preliminär och slutlig bokning. Rader sorteras först på{" "}
                <span className="text-white">Angöring postort</span>, sedan{" "}
                <span className="text-white">Angöring namn</span>.
              </p>
            </section>

            {STEPS.map((step) => (
              <section key={step.title} className="space-y-3">
                <h3 className="text-sm font-semibold text-[#eb6e08]">
                  {step.title}
                </h3>
                <div className="overflow-hidden rounded-xl border border-[#3a3a3a] bg-[#1a1a1a]">
                  {step.image}
                </div>
                <p className="text-sm leading-relaxed text-[#b8b8b8]">
                  {step.body}
                </p>
              </section>
            ))}

            <section className="rounded-xl border border-[#3a3a3a] bg-[#202020] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-white">Tips</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[#b8b8b8]">
                <li>
                  Markera <span className="text-white">Visa alla</span> för att
                  se även oförändrade angöringar.
                </li>
                <li>
                  Använd filterikonerna i tabellhuvudet för att begränsa på
                  t.ex. postort eller status.
                </li>
                <li>
                  Tryck <span className="text-white">Klar</span> när du
                  hanterat en angöring — raden markeras grönt.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UploadIllustration() {
  return (
    <svg
      viewBox="0 0 640 220"
      className="h-auto w-full"
      role="img"
      aria-label="Två uppladdningsrutor för KL15 och KL21"
    >
      <rect width="640" height="220" fill="#1a1a1a" />
      <rect
        x="40"
        y="40"
        width="250"
        height="140"
        rx="16"
        fill="#242424"
        stroke="#3a3a3a"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <rect
        x="350"
        y="40"
        width="250"
        height="140"
        rx="16"
        fill="#242424"
        stroke="#3a3a3a"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <text x="165" y="95" textAnchor="middle" fill="#eb6e08" fontSize="18" fontWeight="600">
        15:00-filen
      </text>
      <text x="165" y="125" textAnchor="middle" fill="#b8b8b8" fontSize="14">
        Filnamn innehåller KL15
      </text>
      <text x="475" y="95" textAnchor="middle" fill="#eb6e08" fontSize="18" fontWeight="600">
        21:00-filen
      </text>
      <text x="475" y="125" textAnchor="middle" fill="#b8b8b8" fontSize="14">
        Filnamn innehåller KL21
      </text>
      <path
        d="M165 145 L165 165 L155 155 M165 165 L175 155"
        stroke="#86efac"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M475 145 L475 165 L465 155 M475 165 L485 155"
        stroke="#86efac"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CompareIllustration() {
  return (
    <svg
      viewBox="0 0 640 220"
      className="h-auto w-full"
      role="img"
      aria-label="Jämförelse mellan 15:00 och 21:00 med skillnad i kolli"
    >
      <rect width="640" height="220" fill="#1a1a1a" />
      <rect x="80" y="48" width="200" height="124" rx="12" fill="#242424" stroke="#3a3a3a" />
      <rect x="360" y="48" width="200" height="124" rx="12" fill="#242424" stroke="#3a3a3a" />
      <text x="180" y="78" textAnchor="middle" fill="#eb6e08" fontSize="16" fontWeight="600">
        15:00
      </text>
      <text x="460" y="78" textAnchor="middle" fill="#eb6e08" fontSize="16" fontWeight="600">
        21:00
      </text>
      <text x="120" y="112" fill="#b8b8b8" fontSize="13">
        Kolli:
      </text>
      <text x="190" y="112" fill="#ffffff" fontSize="13">
        2 EP, 1 HP
      </text>
      <text x="400" y="112" fill="#b8b8b8" fontSize="13">
        Kolli:
      </text>
      <text x="470" y="112" fill="#fca5a5" fontSize="13" fontWeight="600">
        3 EP, 1 HP
      </text>
      <text x="180" y="145" textAnchor="middle" fill="#ffffff" fontSize="12">
        Göteborg
      </text>
      <text x="460" y="145" textAnchor="middle" fill="#ffffff" fontSize="12">
        Göteborg
      </text>
      <path
        d="M290 110 L350 110"
        stroke="#eb6e08"
        strokeWidth="2"
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#eb6e08" />
        </marker>
      </defs>
      <rect x="250" y="168" width="140" height="28" rx="14" fill="#eb6e08" />
      <text x="320" y="187" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600">
        Jämför filer
      </text>
    </svg>
  );
}

function TableIllustration() {
  return (
    <div className="overflow-x-auto p-3 sm:p-4" role="img" aria-label="Exempel på jämförelsetabell">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead className="bg-[#eb6e08]">
          <tr>
            {[
              "Status",
              "Angöring namn",
              "Angöring postort",
              "Tid",
              "Vikt",
              "Pall",
              "Kolli",
              "Klar",
            ].map((col) => (
              <th
                key={col}
                className={cn(
                  "px-2 py-2 font-semibold whitespace-nowrap text-white",
                  col === "Vikt" || col === "Pall" ? "text-right" : "text-left"
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <IllustrationPair
            status="Ändrad"
            statusClass="text-[#fca5a5]"
            angoringNamn="ICA Maxi"
            angoringPostort="Göteborg"
            slot15={{ vikt: "500", pall: "2", kolli: "2 EP" }}
            slot21={{ vikt: "520", pall: "2", kolli: "3 EP", kolliChanged: true }}
            klar={false}
            pairBgFirst="bg-[#2a1818]"
            pairBgSecond="bg-[#241616]"
          />
          <IllustrationPair
            status="Ändrad"
            statusClass="text-[#86efac]"
            angoringNamn="Coop"
            angoringPostort="Malmö"
            slot15={{ vikt: "120", pall: "1", kolli: "1 HP" }}
            slot21={{ vikt: "120", pall: "1", kolli: "1 HP" }}
            klar
            pairBgFirst="bg-[#1a3a24]"
            pairBgSecond="bg-[#163020]"
          />
        </tbody>
      </table>
    </div>
  );
}

function IllustrationPair({
  status,
  statusClass,
  angoringNamn,
  angoringPostort,
  slot15,
  slot21,
  klar,
  pairBgFirst,
  pairBgSecond,
}: {
  status: string;
  statusClass: string;
  angoringNamn: string;
  angoringPostort: string;
  slot15: { vikt: string; pall: string; kolli: string };
  slot21: { vikt: string; pall: string; kolli: string; kolliChanged?: boolean };
  klar: boolean;
  pairBgFirst: string;
  pairBgSecond: string;
}) {
  const tidClass = klar ? "text-[#86efac]" : "text-[#eb6e08]";

  return (
    <>
      <tr className={cn("border-t border-[#4a4a4a]", pairBgFirst)}>
        <td className={cn("px-2 py-1 font-medium whitespace-nowrap", statusClass)}>
          {status}
        </td>
        <td className="px-2 py-1 whitespace-nowrap text-white">{angoringNamn}</td>
        <td className="px-2 py-1 whitespace-nowrap text-white">
          {angoringPostort}
        </td>
        <td className={cn("px-2 py-1 font-medium whitespace-nowrap", tidClass)}>
          15:00
        </td>
        <td className="px-2 py-1 text-right whitespace-nowrap text-white tabular-nums">
          {slot15.vikt}
        </td>
        <td className="px-2 py-1 text-right whitespace-nowrap text-white tabular-nums">
          {slot15.pall}
        </td>
        <td className="px-2 py-1 whitespace-nowrap text-white">{slot15.kolli}</td>
        <td className="px-2 py-1">
          <span
            className={cn(
              "inline-flex h-6 min-w-[3rem] items-center justify-center rounded-md border px-2 text-xs font-semibold leading-none",
              klar
                ? "border-[#22c55e] bg-[#22c55e] text-[#052e16]"
                : "border-[#3a3a3a] bg-[#202020] text-[#b8b8b8]"
            )}
          >
            Klar
          </span>
        </td>
      </tr>
      <tr className={cn("border-t border-[#323232]", pairBgSecond)}>
        <td className="px-2 py-1" />
        <td className="px-2 py-1" />
        <td className="px-2 py-1" />
        <td className={cn("px-2 py-1 font-medium whitespace-nowrap", tidClass)}>
          21:00
        </td>
        <td className="px-2 py-1 text-right whitespace-nowrap text-white tabular-nums">
          {slot21.vikt}
        </td>
        <td className="px-2 py-1 text-right whitespace-nowrap text-white tabular-nums">
          {slot21.pall}
        </td>
        <td
          className={cn(
            "px-2 py-1 whitespace-nowrap tabular-nums",
            !klar && slot21.kolliChanged ? "text-[#fca5a5]" : "text-white"
          )}
        >
          {slot21.kolli}
        </td>
        <td className="px-2 py-1" />
      </tr>
    </>
  );
}
