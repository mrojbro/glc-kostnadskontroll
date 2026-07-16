import { FileSpreadsheet } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#3a3a3a] bg-[#242424] px-6 py-14 text-center shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <div className="flex size-12 items-center justify-center rounded-xl bg-[#202020] border border-[#3a3a3a]">
        <FileSpreadsheet className="size-6 text-[#b8b8b8]" aria-hidden />
      </div>
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="max-w-md text-sm text-[#b8b8b8]">{description}</p>
    </div>
  );
}
