interface ErrorMessageProps {
  message: string;
  details?: string[];
}

export function ErrorMessage({ message, details }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-[#7f1d1d] bg-[#2a1515] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
    >
      <p className="font-semibold text-[#f87171]">{message}</p>
      {details && details.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#fca5a5]">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
