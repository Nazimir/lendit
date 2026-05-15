import Link from 'next/link';
import { Mono, Italic } from '@/components/typography';

export function VerifyGate({
  action,
  next
}: {
  action: string; // e.g., "send a borrow request"
  next: string;   // where to return after verification
}) {
  return (
    <div className="bg-cat-kitchen border-[1.5px] border-ink rounded-md p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-paper border-[1.5px] border-ink flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16130D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <Mono className="text-ink/70 block mb-1">Notice</Mono>
          <h3 className="font-display font-bold text-[20px] leading-tight tracking-[-0.015em] text-ink">
            Verify your <Italic>phone</Italic> first.
          </h3>
          <p className="text-sm text-ink/80 mt-1 leading-snug">
            Before you can {action}, we ask you to verify a phone number. Takes about 30 seconds. Other people never see your number.
          </p>
        </div>
      </div>
      <Link
        href={`/verify?next=${encodeURIComponent(next)}`}
        className="btn-primary w-full mt-5 flex justify-between items-center"
      >
        <span>Verify <Italic>phone</Italic></span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
