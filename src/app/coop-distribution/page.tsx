import type { Metadata } from "next";
import { CostControlApp } from "@/components/CostControlApp";

export const metadata: Metadata = {
  title: "Coop Distribution | GLC Kostnadskontroll",
  description:
    "Kostnadskontroll för Coop Distribution – ladda upp fakturaunderlag och exportera resultat.",
};

export default function CoopDistributionPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <CostControlApp title="Coop Distribution" />
    </main>
  );
}
