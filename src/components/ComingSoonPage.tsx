import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex w-fit items-center gap-2 text-sm text-[#b8b8b8] transition-colors hover:text-[#eb6e08]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tillbaka
      </Link>

      <div className="rounded-2xl border border-[#3a3a3a] bg-[#242424] p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-bold tracking-tight text-[#eb6e08]">
          {title}
        </h1>
        <p className="mt-4 text-[#b8b8b8]">
          Denna kostnadskontroll är under uppbyggnad.
        </p>
      </div>
    </div>
  );
}
