import type { Metadata } from "next";
import { DaviesApp } from "@/components/davies/DaviesApp";

export const metadata: Metadata = {
  title: "3054 Davies | GLC Kostnadskontroll",
  description:
    "Kostnadskontroll för 3054 Davies – ladda upp Excel och granska orderstatus och intäkter.",
};

export default function DaviesPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <DaviesApp />
    </main>
  );
}
