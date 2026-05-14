import Link from 'next/link';
import { paletteForCategory } from '@/lib/categoryStyle';
import { grainStyle } from '@/lib/grain';
import { Mono, Italic } from '@/components/typography';
import { MonoBadge } from '@/components/MonoBadge';
import type { ItemWithOwner, Quirks } from '@/lib/types';

type Variant = 'hero' | 'secondary' | 'tile';

export function ItemCard({
  item,
  variant = 'tile'
}: {
  item: ItemWithOwner;
  variant?: Variant;
}) {
  if (variant === 'hero')      return <HeroVariant item={item} />;
  if (variant === 'secondary') return <SecondaryVariant item={item} />;
  return <TileVariant item={item} />;
}

// ─────────────────────────────────────────────────────────────
// Helpers — shared across variants
// ─────────────────────────────────────────────────────────────

/** First non-empty quirk value, formatted as a one-line italic blurb. */
function firstQuirk(quirks: Quirks | null | undefined): string | null {
  if (!quirks) return null;
  const order: (keyof Quirks)[] = ['habits', 'cravings', 'origin', 'gifted_by'];
  for (const k of order) {
    const v = quirks[k];
    if (v && v.trim().length > 0) return v.trim();
  }
  return null;
}

/** Split title into first word and the rest, for the editorial title break. */
function splitTitle(title: string): { first: string; rest: string } {
  const trimmed = title.trim();
  const idx = trimmed.indexOf(' ');
  if (idx < 0) return { first: trimmed, rest: '' };
  return { first: trimmed.slice(0, idx), rest: trimmed.slice(idx + 1) };
}

function Photo({ src, alt, fallback }: { src?: string; alt: string; fallback: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />;
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Mono className="opacity-50">[ {fallback} ]</Mono>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HERO — full-bleed territory, oversized type laid over.
// Used as the masthead item on the home feed.
// ─────────────────────────────────────────────────────────────

function HeroVariant({ item }: { item: ItemWithOwner }) {
  const palette = paletteForCategory(item.category);
  const { first, rest } = splitTitle(item.title);
  const quirk = firstQuirk(item.quirks);
  return (
    <Link
      href={`/items/${item.id}`}
      className="relative block w-full overflow-hidden"
      style={{ background: palette.bg, color: palette.ink, aspectRatio: '1/1', ...grainStyle }}
    >
      {/* Top metadata strip */}
      <div className="absolute top-4 left-5 right-5 flex justify-between" style={{ color: palette.ink }}>
        <Mono>Featured · {item.category}</Mono>
        {!item.is_available && <MonoBadge variant="ink">On loan</MonoBadge>}
      </div>

      {/* Photo or placeholder, inset and framed.
          Inset values give the photo ~64% × 58% of the card — the photo
          dominates as the focal point, with the territory still visible
          as a thinner frame around it. */}
      <div
        className="absolute rounded-3xl overflow-hidden"
        style={{
          top: '18%', bottom: '24%', left: '18%', right: '18%',
          border: item.photos?.[0] ? 'none' : `1.5px dashed ${palette.ink}`,
          opacity: item.photos?.[0] ? 1 : 0.7,
          background: item.photos?.[0] ? 'transparent' : 'rgba(255,255,255,0.06)'
        }}
      >
        <Photo src={item.photos?.[0]} alt={item.title} fallback={item.title.toLowerCase()} />
      </div>

      {/* Title + quirk + owner at bottom */}
      <div className="absolute left-5 right-5 bottom-5">
        <h2
          className="font-display font-extrabold leading-[0.85] tracking-[-0.04em]"
          style={{ color: palette.ink, fontSize: 'clamp(48px, 14vw, 72px)' }}
        >
          {first}
          {rest && (
            <>
              <br />
              <Italic>{rest}</Italic>
            </>
          )}
        </h2>
        <div className="mt-2.5 flex justify-between items-end gap-3">
          {quirk ? (
            <span
              className="font-italic italic text-[17px] leading-tight max-w-[70%]"
              style={{ color: palette.ink }}
            >
              &ldquo;{quirk}&rdquo;
            </span>
          ) : <span />}
          <Mono className="text-right opacity-85" style={{ color: palette.ink }}>
            {item.owner_first_name?.toUpperCase()}
            <br />· {item.owner_suburb?.toUpperCase()}
          </Mono>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// SECONDARY — half-bleed split: territory rect on left, title block on right.
// Used as the second feature in the mosaic.
// ─────────────────────────────────────────────────────────────

function SecondaryVariant({ item }: { item: ItemWithOwner }) {
  const palette = paletteForCategory(item.category);
  const quirk = firstQuirk(item.quirks);
  return (
    <Link
      href={`/items/${item.id}`}
      className="block px-4"
    >
      <div className="grid grid-cols-2 gap-3.5 items-stretch">
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{ aspectRatio: '3/4', background: palette.bg, color: palette.ink, ...grainStyle }}
        >
          <Photo src={item.photos?.[0]} alt={item.title} fallback={item.title.toLowerCase()} />
          <div className="absolute top-2 left-2.5">
            <Mono style={{ color: palette.ink } as React.CSSProperties}>{item.category}</Mono>
          </div>
          {!item.is_available && (
            <div className="absolute top-2 right-2">
              <MonoBadge variant="ink">On loan</MonoBadge>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between pt-1 text-ink">
          <div>
            <h3 className="font-display font-extrabold text-[28px] leading-[0.9] tracking-[-0.025em] text-balance">
              {item.title}
            </h3>
            {quirk && (
              <p className="font-italic italic text-[15px] leading-[1.25] text-ink-soft mt-2">
                &ldquo;{quirk}&rdquo;
              </p>
            )}
          </div>
          <Mono className="text-ink-soft pb-1.5">
            · {item.owner_first_name?.toUpperCase()} · {item.owner_suburb?.toUpperCase()}
          </Mono>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// TILE — small 1:1 territory rect + title block below.
// Used as the bulk of the home feed and on public profiles.
// ─────────────────────────────────────────────────────────────

function TileVariant({ item }: { item: ItemWithOwner }) {
  const palette = paletteForCategory(item.category);
  const quirk = firstQuirk(item.quirks);
  return (
    <Link href={`/items/${item.id}`} className="block">
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{ aspectRatio: '1', background: palette.bg, color: palette.ink, ...grainStyle }}
      >
        <Photo src={item.photos?.[0]} alt={item.title} fallback={item.title.toLowerCase()} />
        <div className="absolute top-1.5 left-2">
          <Mono style={{ color: palette.ink, fontSize: 8 } as React.CSSProperties}>
            {item.category}
          </Mono>
        </div>
        {!item.is_available && (
          <div className="absolute bottom-1.5 right-2">
            <MonoBadge variant="ink" className="text-[8px] py-1 px-2" prefix={null}>
              On loan
            </MonoBadge>
          </div>
        )}
      </div>
      <div className="pt-1.5 text-ink">
        <div className="font-display font-bold text-[13px] leading-[1.05] tracking-[-0.01em] line-clamp-1">
          {item.title}
        </div>
        {quirk && (
          <div className="font-italic italic text-[11px] text-ink-soft mt-px line-clamp-1">
            &ldquo;{quirk}&rdquo;
          </div>
        )}
      </div>
    </Link>
  );
}
