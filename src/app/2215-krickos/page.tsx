import type { Metadata } from "next";
import { KrickosApp } from "@/components/krickos/KrickosApp";

export const metadata: Metadata = {
  title: "2215 Krickos | GLC Kostnadskontroll",
  description:
    "Kostnadskontroll för 2215 Krickos – ladda upp Excel och granska orderstatus och intäkter.",
};

export default function KrickosPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <KrickosApp />
    </main>
  );
}
