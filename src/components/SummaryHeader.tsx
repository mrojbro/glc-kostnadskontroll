interface SummaryHeaderProps {
  reference: string;
}

export function SummaryHeader({ reference }: SummaryHeaderProps) {
  return (
    <header className="space-y-2">
      <p className="text-sm font-medium uppercase tracking-wider text-[#b8b8b8]">
        Referens
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-[#eb6e08] sm:text-3xl">
        {reference}
      </h2>
    </header>
  );
}
