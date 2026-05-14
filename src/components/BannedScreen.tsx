import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { SignOutLink } from '@/app/(app)/banned/SignOutLink';

export function BannedScreen({ reason }: { reason: string | null }) {
  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">Notice</Mono>
        </div>

        {/* Headline */}
        <div className="mt-8">
          <h1 className="font-display font-extrabold text-[56px] leading-[0.88] tracking-[-0.045em] text-ink text-balance">
            Account <Italic>suspended</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            Your Partaz account has been suspended.
          </p>
        </div>

        {/* Reason block (only if provided) */}
        {reason && (
          <div className="mt-10 border-y-[1.5px] border-ink py-6">
            <Mono className="text-ink-soft block mb-2">Reason</Mono>
            <p className="text-ink leading-relaxed whitespace-pre-wrap">{reason}</p>
          </div>
        )}

        {/* Appeals */}
        <div className={(reason ? 'mt-6' : 'mt-10') + ' text-sm text-ink-soft leading-relaxed'}>
          If you believe this is a mistake, contact{' '}
          <a href="mailto:appeals@example.com" className="text-ink underline">appeals@example.com</a>.
        </div>

        {/* Actions */}
        <div className="mt-auto pt-10 flex flex-col items-stretch gap-3">
          <Link href="/terms" className="btn-secondary w-full justify-center">Read our Terms</Link>
          <div className="text-center pt-2">
            <SignOutLink />
          </div>
        </div>
      </div>
    </main>
  );
}
