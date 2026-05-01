import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Stars } from '@/components/Stars';
import { dateLabel } from '@/lib/utils';
import { paletteForCategory } from '@/lib/categoryStyle';
import { QUIRK_QUESTIONS } from '@/lib/types';
import type { Item, Profile } from '@/lib/types';

/**
 * The full zine-style "ad page" treatment for a single item.
 * Used for both the public item view and the owner's own management view.
 */
export function ItemAd({
  item,
  owner,
  ownerView = false
}: {
  item: Item;
  owner: Profile | null;
  ownerView?: boolean;
}) {
  const palette = paletteForCategory(item.category);
  const quirkEntries = QUIRK_QUESTIONS
    .map(q => ({ q, value: (item.quirks || {})[q.key] as string | undefined }))
    .filter(x => x.value && x.value.trim().length > 0);

  const shortId = item.id.replace(/-/g, '').slice(0, 12).toUpperCase();
  const createdLabel = new Date(item.created_at).toLocaleDateString(undefined, {
    day: '2-digit', month: '2-digit', year: '2-digit'
  }).replace(/\//g, '-');

  return (
    <article
      className="rounded-3xl overflow-hidden border-2 shadow-soft"
      style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
    >
      {/* HERO */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
          {item.category} · Listing
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
          No. {shortId.slice(0, 6)}
        </div>
      </div>

      <div className="px-5 pb-3">
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight" style={{ color: palette.ink }}>
          {item.title}
        </h1>
        <div className="flex flex-wrap gap-2 mt-3">
          <Pill palette={palette}>Up to {item.max_loan_days}d</Pill>
          {item.extensions_allowed && <Pill palette={palette}>Extensions OK</Pill>}
          {!item.is_available && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-rose-soft text-accent-900">
              On loan
            </span>
          )}
          {item.is_available && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: palette.accent, color: '#fff' }}>
              Available
            </span>
          )}
        </div>
      </div>

      {/* PHOTO */}
      {item.photos[0] && (
        <div className="mx-5 mb-4 border-2 rounded-2xl overflow-hidden" style={{ borderColor: palette.accent }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photos[0]} alt="" className="w-full aspect-[4/3] object-cover" />
        </div>
      )}
      {item.photos.length > 1 && (
        <div className="mx-5 mb-4 grid grid-cols-4 gap-2">
          {item.photos.slice(1).map((p: string, i: number) => (
            <div key={i} className="border rounded-xl overflow-hidden" style={{ borderColor: palette.accent }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="w-full aspect-square object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* EXPECTED BACK */}
      {!item.is_available && item.expected_back_at && (
        <div className="mx-5 mb-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.55)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <div className="text-sm">
            <span className="opacity-70">Expected back </span>
            <span className="font-medium">{dateLabel(item.expected_back_at)}</span>
            {!ownerView && owner && (
              <>
                {' · '}
                <Link href={`/messages/${owner.id}`} className="font-medium underline">
                  Message {owner.first_name}
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* DESCRIPTION */}
      <div className="mx-5 mb-4 grid grid-cols-[auto_1fr] gap-4 items-start">
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-70 pt-1">
          About
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{item.description}</p>
      </div>

      {/* QUIRKS */}
      {quirkEntries.length > 0 && (
        <div className="mx-5 mb-5 border-t-2 border-dashed pt-4" style={{ borderColor: palette.accent }}>
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70 mb-3">
            Personality
          </div>
          <ul className="space-y-3">
            {quirkEntries.map(({ q, value }) => (
              <li key={q.key} className="flex items-start gap-3">
                <span className="font-mono text-[10px] uppercase tracking-wider pt-1 opacity-70 shrink-0 w-24">
                  {q.label}
                </span>
                <span className="font-script text-2xl leading-tight" style={{ color: palette.scribble }}>
                  &ldquo;{value}&rdquo;
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MEMBERS / OWNER (skip for owner-view since they ARE the owner) */}
      {!ownerView && owner && (
        <div className="mx-5 mb-5 border-t-2 pt-4" style={{ borderColor: palette.accent }}>
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70 mb-2">
            Lender
          </div>
          <Link href={`/u/${owner.id}`} className="flex items-center gap-3 hover:opacity-80">
            <Avatar url={owner.photo_url} name={owner.first_name} size={44} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl">{owner.first_name}</div>
              <div className="text-xs opacity-70">{owner.suburb}</div>
            </div>
            <div className="text-right">
              <Stars value={Number(owner.reputation_score)} />
              <div className="text-xs opacity-70 mt-0.5">{Number(owner.reputation_score).toFixed(1)}</div>
            </div>
          </Link>
        </div>
      )}

      {/* BARCODE-Y FOOTER */}
      <div className="px-5 pb-5 pt-3 border-t-2 mt-2" style={{ borderColor: palette.accent }}>
        <div className="font-mono text-[10px] uppercase tracking-wider opacity-70 flex items-center justify-between">
          <span>LENDIT · {createdLabel}</span>
          <span>NO REFUNDS — JUST RETURNS</span>
        </div>
        <div
          aria-hidden
          className="mt-2 h-7 bg-repeat-x"
          style={{
            backgroundImage:
              `repeating-linear-gradient(90deg, ${palette.ink} 0 1px, transparent 1px 3px, ${palette.ink} 3px 5px, transparent 5px 9px, ${palette.ink} 9px 11px, transparent 11px 14px)`
          }}
        />
        <div className="font-mono text-[10px] tracking-[0.4em] mt-1 opacity-80">{shortId}</div>
      </div>
    </article>
  );
}

function Pill({ children, palette }: { children: React.ReactNode; palette: { pill: string; ink: string } }) {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
      style={{ background: palette.pill, color: palette.ink }}
    >
      {children}
    </span>
  );
}
