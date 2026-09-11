import type { Metadata } from "next";
import { KofApp } from "@/components/kof/KofApp";

export const metadata: Metadata = {
  title: "KOF | GLC Kostnadskontroll",
  description:
    "KOF – ladda upp CSV (Input 1) och granska rader med mappade kolumner.",
};

export default function KofPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <KofApp />
    </main>
  );
}
