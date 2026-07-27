import type { Metadata } from "next";
import { BoxmoverApp } from "@/components/boxmover/BoxmoverApp";

export const metadata: Metadata = {
  title: "3058 Boxmover | GLC Kostnadskontroll",
  description:
    "Kostnadskontroll för 3058 Boxmover – ladda upp Excel och granska orderstatus och intäkter.",
};

export default function BoxmoverPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <BoxmoverApp />
    </main>
  );
}
