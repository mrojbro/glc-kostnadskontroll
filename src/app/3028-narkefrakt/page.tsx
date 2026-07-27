import type { Metadata } from "next";
import { NarkefraktApp } from "@/components/narkefrakt/NarkefraktApp";

export const metadata: Metadata = {
  title: "3028 Närkefrakt | GLC Kostnadskontroll",
  description:
    "Kostnadskontroll för 3028 Närkefrakt – ladda upp två Excel-källor och granska gemensamt resultat.",
};

export default function NarkefraktPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <NarkefraktApp />
    </main>
  );
}
