import type { Metadata } from "next";
import { CoopFruktApp } from "@/components/coop-frukt/CoopFruktApp";

export const metadata: Metadata = {
  title: "Coop Frukt | GLC Kostnadskontroll",
  description:
    "Kostnadskontroll för Coop Frukt – ladda upp Grunddata och granska fraktunderlag.",
};

export default function CoopFruktPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <CoopFruktApp />
    </main>
  );
}
