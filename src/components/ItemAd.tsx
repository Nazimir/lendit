import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Lightbox } from '@/components/Lightbox';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { MonoBadge } from '@/components/MonoBadge';
import { dateLabel } from '@/lib/utils';
import { paletteForCategory } from '@/lib/categoryStyle';
import { QUIRK_QUESTIONS } from '@/lib/types';
import type { Item, Profile, Quirks } from '@/lib/types';

/**
 * Full editorial item detail block. Used by:
 *   - /items/[id]          (public view, borrowers)
 *   - /listings/[id]       (owner view)
 *
 * The masthead includes the territory background, wordmark, back link,
 * oversized item index, title with italic break, quirk line, status
 * badges, and optional action slot (used for SafetyMenu on the public
 * view). Below the masthead: photo gallery, description, quirks
 * "flourishes", and owner card.
 *
 * Owner-specific actions (edit / lend / make private / delete) live
 * outside this component, on the listings page.
 */
export function ItemAd({
  item,
  owner,
  ownerView = false,
  back = '/home',
  actionSlot
}: {
  item: Item;
  owner: Profile | null;
  ownerView?: boolean;
  back?: string;
  actionSlot?: React.ReactNode;
}) {
  const palette = paletteForCategory(item.category);
  const { first, rest } = splitTitle(item.title);
  const primaryQuirk = firstQuirk(item.quirks);
  const quirkEntries = QUIRK_QUESTIONS
    .map(q => ({ key: q.key, label: q.label, value: (item.quirks || {})[q.key] as string | undefined }))
    .filter(x => x.value && x.value.trim().length > 0);
  const indexNumber = numberFromId(item.id);
  const photos = (item.photos || []).filter(Boolean);

  return (
    <article>
      {/* ───────────────────────────────────────────────────────
          MASTHEAD — full territory
          ─────────────────────────────────────────────────────── */}
      <header
        className="px-5 pt-12 pb-7 -mx-4 sm:mx-0"
        style={{ background: palette.bg, color: palette.ink }}
      >
        {/* Top row: wordmark | category label / actions */}
        <div className="flex justify-between items-center">
          <Wordmark size={20} />
          <div className="flex items-center gap-2" style={{ color: palette.ink }}>
            <Mono style={{ color: palette.ink, opacity: 0.85 }}>
              {ownerView ? 'Your listing' : item.category}
            </Mono>
            {actionSlot}
          </div>
        </div>

        {/* Back link */}
        <Link href={back} className="mt-5 inline-block hover:opacity-70 transition" style={{ color: palette.ink }}>
          <Mono style={{ color: palette.ink }}>← Back</Mono>
        </Link>

        {/* Item index — oversized № */}
        <div className="mt-6 flex items-baseline gap-3">
          <span
            className="font-display font-extrabold tracking-[0.04em]"
            style={{ color: palette.ink, fontSize: 18, opacity: 0.85 }}
          >
            №
          </span>
          <span
            className="font-display font-extrabold leading-[0.85] tracking-[-0.05em]"
            style={{ color: palette.ink, fontSize: 'clamp(64px, 22vw, 92px)' }}
          >
            {indexNumber}
          </span>
        </div>

        {/* Title with italic break */}
        <h1
          className="mt-4 font-display font-extrabold leading-[0.88] tracking-[-0.035em]"
          style={{ color: palette.ink, fontSize: 'clamp(40px, 13vw, 52px)' }}
        >
          {first}
          {rest && (
            <>
              <br />
              <Italic>{rest}.</Italic>
            </>
          )}
        </h1>

        {/* Quirk line */}
        {primaryQuirk && (
          <div
            className="mt-3 font-italic italic leading-[1.3] max-w-[320px]"
            style={{ color: palette.ink, fontSize: 18 }}
          >
            &ldquo;{primaryQuirk}&rdquo;
          </div>
        )}

        {/* Status pills */}
        <div className="mt-5 flex gap-2 flex-wrap">
          {item.is_available
            ? <MonoBadge variant="ink">Available</MonoBadge>
            : <MonoBadge variant="ink">On loan</MonoBadge>}
          {item.max_loan_days
            ? <MonoBadge variant="outline" prefix={null}>Up to {item.max_loan_days}d</MonoBadge>
            : <MonoBadge variant="outline" prefix={null}>Open-ended</MonoBadge>}
          {item.extensions_allowed && item.max_loan_days && (
            <MonoBadge variant="outline" prefix={null}>Extensions OK</MonoBadge>
          )}
          {item.visibility === 'private' && (
            <MonoBadge variant="outline" prefix={null}>Private</MonoBadge>
          )}
        </div>

        {/* Expected back (for non-owners viewing an item out on loan) */}
        {!item.is_available && item.expected_back_at && !ownerView && owner && (
          <div
            className="mt-5 px-3.5 py-3 flex items-center gap-3 border"
            style={{ borderColor: palette.ink, background: 'rgba(255,255,255,0.5)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={palette.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <div className="text-sm" style={{ color: palette.ink }}>
              <span className="opacity-70">Expected back </span>
              <span className="font-bold">{dateLabel(item.expected_back_at)}</span>
              {' · '}
              <Link href={`/messages/${owner.id}`} className="font-bold underline">
                Message {owner.first_name}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ───────────────────────────────────────────────────────
          PHOTO GALLERY — horizontal scroll
          ─────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <section className="pt-6 pb-2">
          <div className="px-5">
            <Mono className="text-ink-soft">§ 01 — Photographs</Mono>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pt-3 pl-5 pr-5">
            {photos.map((url, i) => (
              <div
                key={i}
                className="shrink-0 w-[220px] overflow-hidden border border-ink/15"
                style={{ aspectRatio: '4/5' }}
              >
                <Lightbox src={url} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────
          DESCRIPTION
          ─────────────────────────────────────────────────────── */}
      {item.description && (
        <section className="px-5 pt-7">
          <Mono className="text-ink-soft block">§ 02 — The object</Mono>
          <p
            className="font-display font-medium text-[18px] leading-[1.45] text-ink mt-3 whitespace-pre-wrap"
            style={{ textWrap: 'pretty' as never }}
          >
            {item.description}
          </p>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────
          QUIRKS — Flourish blocks
          ─────────────────────────────────────────────────────── */}
      {quirkEntries.length > 0 && (
        <section className="px-5 pt-7">
          <Mono className="text-ink-soft block">§ 03 — Quirks</Mono>
          <div className="mt-4 flex flex-col gap-5">
            {quirkEntries.map(q => (
              <Flourish key={q.key} kicker={q.label} body={q.value!} />
            ))}
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────
          OWNER CARD — public view only
          ─────────────────────────────────────────────────────── */}
      {!ownerView && owner && (
        <section className="px-5 pt-7">
          <Mono className="text-ink-soft block">§ 04 — Kept by</Mono>
          <Link
            href={`/u/${owner.id}`}
            className="mt-3.5 grid grid-cols-[60px_1fr_auto] gap-3.5 items-center border-t-[1.5px] border-b-[1.5px] border-ink py-3.5 hover:bg-paper-soft transition"
          >
            <Avatar url={owner.photo_url} name={owner.first_name} size={60} />
            <div className="min-w-0">
              <div className="font-display font-bold text-[22px] leading-none tracking-[-0.01em] text-ink truncate">
                {owner.first_name}
              </div>
              <Mono className="text-ink-soft mt-2 block">
                · {owner.suburb?.toUpperCase()} · KARMA {owner.karma_points ?? 0}
              </Mono>
            </div>
            <span aria-hidden className="font-display font-bold text-2xl text-ink-soft">↗</span>
          </Link>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────
          PRIVATE LISTING NOTICE — owner view only
          ─────────────────────────────────────────────────────── */}
      {ownerView && item.visibility === 'private' && (
        <section className="px-5 pt-7">
          <div className="border border-ink/30 p-3.5 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16130D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <div className="text-sm text-ink-soft">
              <strong className="text-ink">Private listing.</strong>{' '}
              Only you (and the current borrower, if any) can see this. It won&apos;t appear in search or on your public profile.
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function splitTitle(title: string): { first: string; rest: string } {
  const trimmed = title.trim();
  const idx = trimmed.indexOf(' ');
  if (idx < 0) return { first: trimmed, rest: '' };
  return { first: trimmed.slice(0, idx), rest: trimmed.slice(idx + 1) };
}

function firstQuirk(quirks: Quirks | null | undefined): string | null {
  if (!quirks) return null;
  const order: (keyof Quirks)[] = ['habits', 'cravings', 'origin', 'gifted_by'];
  for (const k of order) {
    const v = quirks[k];
    if (v && v.trim().length > 0) return v.trim();
  }
  return null;
}

/**
 * Editorial 3-digit "issue number" derived deterministically from the
 * item's UUID. Stable for the life of the item, no DB column needed.
 * Collisions are possible (≈1 in 999) but it's a visual flourish, not
 * a primary key — the real id is in the URL.
 */
function numberFromId(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 6);
  const n = parseInt(hex, 16) % 999;
  return n.toString().padStart(3, '0');
}

function Flourish({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="border-t border-dashed border-ink/30 pt-3">
      <div className="font-italic italic text-ink text-[22px] leading-none mb-2">
        {kicker.toLowerCase()}.
      </div>
      <p
        className="font-display font-medium text-[15px] leading-[1.5] text-ink-soft m-0"
        style={{ textWrap: 'pretty' as never }}
      >
        {body}
      </p>
    </div>
  );
}
