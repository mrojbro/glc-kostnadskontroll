import type { Metadata } from "next";
import { BrHanssonsApp } from "@/components/br-hanssons/BrHanssonsApp";

export const metadata: Metadata = {
  title: "Br Hanssons | GLC Kostnadskontroll",
  description:
    "Jämför Br Hanssons 15:00- och 21:00-bokningar för skillnader i vikt, pallplats och kollinslag.",
};

export default function BrHanssonsPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <BrHanssonsApp />
    </main>
  );
}
