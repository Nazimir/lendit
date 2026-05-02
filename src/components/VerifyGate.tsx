import Link from 'next/link';

export function VerifyGate({
  action,
  next
}: {
  action: string; // e.g., "send a borrow request"
  next: string;   // where to return after verification
}) {
  return (
    <div className="card p-5 space-y-3 border-2 border-butter-soft">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-butter-soft flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5F4E33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl">Verify your phone first</h3>
          <p className="text-sm text-gray-700 mt-1">
            Before you can {action}, we ask you to verify a phone number. Takes
            about 30 seconds. Other users never see your number.
          </p>
        </div>
      </div>
      <Link
        href={`/verify?next=${encodeURIComponent(next)}`}
        className="btn-primary w-full text-center"
      >
        Verify phone
      </Link>
    </div>
  );
}
