export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProgressBanner({ message }: { message: string }) {
  return (
    <div className="bg-cat-kitchen border-[1.5px] border-ink rounded-md p-3 flex items-center gap-3">
      <Spinner size={18} className="text-ink" />
      <span className="text-sm font-medium text-ink">{message}</span>
    </div>
  );
}
