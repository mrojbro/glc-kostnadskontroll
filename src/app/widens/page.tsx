import type { Metadata } from "next";
import { WidensApp } from "@/components/widens/WidensApp";

export const metadata: Metadata = {
  title: "Widens | GLC Kostnadskontroll",
  description:
    "Widens – ladda upp Excel (Input 1) och granska rader med Frakt/DMT från Artikelslag.",
};

export default function WidensPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <WidensApp />
    </main>
  );
}
