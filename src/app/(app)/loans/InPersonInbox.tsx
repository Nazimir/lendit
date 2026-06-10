'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mono, Italic } from '@/components/typography';
import { paletteForCategory } from '@/lib/categoryStyle';
import {
  acceptInPersonRequest,
  declineInPersonRequest,
  cancelInPersonRequest,
  nudgeInPersonRequest
} from '../lend/actions';
import type { BorrowRequest, Item, Profile } from '@/lib/types';

type CounterpartyProfile = Pick<Profile, 'id' | 'first_name'>;

export function InPersonInbox({
  requests, items, profileById, userId
}: {
  requests: BorrowRequest[];
  items: Item[];
  profileById: Record<string, CounterpartyProfile>;
  userId: string;
}) {
  // Split into incoming (someone wants to lend ME something) and
  // outgoing (I pre-filled a loan, waiting on them to accept).
  const incoming = requests.filter(r => r.borrower_id === userId);
  const outgoing = requests.filter(r => r.lender_id === userId);

  return (
    <div>
      {incoming.length > 0 && (
        <RequestSection
          title="Confirm"
          subtitle="Someone says they lent you this"
          count={incoming.length}
          requests={incoming}
          items={items}
          profileById={profileById}
          mode="incoming"
        />
      )}
      {outgoing.length > 0 && (
        <RequestSection
          title="Waiting"
          subtitle="They haven't confirmed yet"
          count={outgoing.length}
          requests={outgoing}
          items={items}
          profileById={profileById}
          mode="outgoing"
        />
      )}
    </div>
  );
}

function RequestSection({
  title, subtitle, count, requests, items, profileById, mode
}: {
  title: string;
  subtitle: string;
  count: number;
  requests: BorrowRequest[];
  items: Item[];
  profileById: Record<string, CounterpartyProfile>;
  mode: 'incoming' | 'outgoing';
}) {
  return (
    <section className="px-5 pt-6">
      <div className="flex justify-between items-baseline pb-2 border-b-[1.5px] border-ink">
        <h2 className="font-display font-extrabold text-[30px] tracking-[-0.03em] text-ink">
          {title}<Italic>.</Italic>
        </h2>
        <Mono className="text-ink-soft">{count} · {subtitle.toUpperCase()}</Mono>
      </div>
      <ul className="flex flex-col">
        {requests.map(r => {
          const counterpartyId = mode === 'incoming' ? r.lender_id : r.borrower_id;
          const counterpartyName = profileById[counterpartyId]?.first_name || 'someone';
          const item = items.find(i => i.id === r.item_id);
          return (
            <RequestRow
              key={r.id}
              request={r}
              item={item}
              counterpartyName={counterpartyName}
              mode={mode}
            />
          );
        })}
      </ul>
    </section>
  );
}

function RequestRow({
  request, item, counterpartyName, mode
}: {
  request: BorrowRequest;
  item: Item | undefined;
  counterpartyName: string;
  mode: 'incoming' | 'outgoing';
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nudged, setNudged] = useState(false);
  const palette = paletteForCategory(item?.category || 'Other');

  const expiresInHours = Math.max(
    0,
    Math.round((new Date(request.expires_at).getTime() - Date.now()) / 3_600_000)
  );

  function run(fn: () => Promise<{ ok?: true; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && 'error' in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="border-b border-dashed border-ink/30 py-4">
      <div className="grid grid-cols-[48px_1fr_auto] gap-3 items-start">
        <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 relative" style={{ background: palette.bg }}>
          {item?.photos?.[0] && (
            <Image src={item.photos[0]} alt="" fill sizes="48px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-[17px] leading-[1.1] tracking-[-0.02em] text-ink line-clamp-1">
            {item?.title || 'An item'}
          </div>
          <div className="mt-0.5 font-display font-medium text-[13px] text-ink-soft">
            {mode === 'incoming'
              ? <><strong className="font-bold text-ink">{counterpartyName}</strong> says they lent you this</>
              : <>Waiting on <strong className="font-bold text-ink">{counterpartyName}</strong></>}
          </div>
        </div>
        <Mono className="text-ink-soft shrink-0 pt-0.5">
          {expiresInHours > 0 ? `${expiresInHours}h left` : 'EXPIRING'}
        </Mono>
      </div>

      {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}

      <div className="flex gap-2 mt-3">
        {mode === 'incoming' ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => declineInPersonRequest(request.id))}
              className="btn-secondary flex-1 text-sm py-2"
            >
              {busy ? '…' : 'Decline'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => acceptInPersonRequest(request.id))}
              className="btn-primary flex-1 text-sm py-2 flex justify-between items-center"
            >
              <span>{busy ? '…' : <>Accept <Italic>loan</Italic></>}</span>
              <span aria-hidden>→</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                run(async () => {
                  const r = await nudgeInPersonRequest(request.id);
                  if (!('error' in r)) setNudged(true);
                  return r;
                });
              }}
              className="btn-secondary flex-1 text-sm py-2"
            >
              {busy ? '…' : nudged ? 'Nudged' : 'Nudge'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Cancel this request to ${counterpartyName}?`)) return;
                run(() => cancelInPersonRequest(request.id));
              }}
              className="font-mono text-[10px] uppercase tracking-mono px-3 py-2 rounded-md border border-ink/20 text-ink-soft hover:text-ink hover:border-ink/40 transition"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {item && (
        <div className="mt-2">
          <Link
            href={`/items/${item.id}`}
            className="font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink"
          >
            View item →
          </Link>
        </div>
      )}
    </li>
  );
}
