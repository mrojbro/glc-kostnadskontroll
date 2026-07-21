import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  title: "HLP Distribution | GLC Kostnadskontroll",
  description: "Kostnadskontroll för HLP Distribution – kommer snart.",
};

export default function HlpDistributionPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <ComingSoonPage title="HLP Distribution" />
    </main>
  );
}
