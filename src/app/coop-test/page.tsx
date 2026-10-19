import type { Metadata } from "next";
import { CoopTestApp } from "@/components/coop-test/CoopTestApp";

export const metadata: Metadata = {
  title: "COOP TEST | GLC Kostnadskontroll",
  description:
    "COOP TEST – ladda upp Excel och exportera den mappade output-layouten.",
};

export default function CoopTestPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <CoopTestApp />
    </main>
  );
}
