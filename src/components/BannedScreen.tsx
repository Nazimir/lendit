import Link from 'next/link';
import { SignOutLink } from '@/app/(app)/banned/SignOutLink';

export function BannedScreen({ reason }: { reason: string | null }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-6 max-w-md w-full text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-soft mb-4" />
        <h1 className="font-display text-3xl">Account suspended</h1>
        <p className="text-sm text-gray-700 mt-3">
          Your LendIt account has been suspended.
          {reason ? ` Reason: ${reason}` : ''}
        </p>
        <p className="text-xs text-gray-500 mt-3">
          If you believe this is a mistake, contact us at{' '}
          <a href="mailto:appeals@example.com" className="underline">appeals@example.com</a>.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/terms" className="btn-secondary">Read our Terms</Link>
          <SignOutLink />
        </div>
      </div>
    </main>
  );
}
