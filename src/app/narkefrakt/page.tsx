import type { Metadata } from "next";
import { NarkefraktPortalApp } from "@/components/narkefrakt-portal/NarkefraktPortalApp";

export const metadata: Metadata = {
  title: "Närkefrakt | GLC Kostnadskontroll",
  description:
    "Närkefrakt – ladda upp Excel, kopiera Ordernr och matcha T5 via Input 2.",
};

export default function NarkefraktPortalPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <NarkefraktPortalApp />
    </main>
  );
}
