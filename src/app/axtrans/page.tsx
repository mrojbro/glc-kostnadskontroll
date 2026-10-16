import type { Metadata } from "next";
import { AxtransApp } from "@/components/axtrans/AxtransApp";

export const metadata: Metadata = {
  title: "Axtrans | GLC Kostnadskontroll",
  description:
    "Axtrans – ladda upp Excel, kopiera Ordernr och matcha T5 via Input 2.",
};

export default function AxtransPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <AxtransApp />
    </main>
  );
}
