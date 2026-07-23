import type { Metadata } from "next";
import { HlpDistributionApp } from "@/components/hlp-distribution/HlpDistributionApp";

export const metadata: Metadata = {
  title: "HLP Distribution | GLC Kostnadskontroll",
  description:
    "Kostnadskontroll för HLP Distribution – ladda upp Excel och granska fraktunderlag.",
};

export default function HlpDistributionPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <HlpDistributionApp />
    </main>
  );
}
