import type { Metadata } from "next";
import { GdlApp } from "@/components/gdl/GdlApp";

export const metadata: Metadata = {
  title: "GDL | GLC Kostnadskontroll",
  description:
    "GDL – ladda upp Excel-fil och granska fakturarader med mappade kolumner.",
};

export default function GdlPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <GdlApp />
    </main>
  );
}
