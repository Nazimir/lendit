import type { ReactNode } from 'react';

/**
 * Mono caps — for editorial metadata, kickers, labels.
 *
 * JetBrains Mono at 10px with 0.14em letter-spacing, uppercase. Use this
 * everywhere we'd otherwise write `font-mono text-[10px] uppercase tracking-mono`.
 *
 * Example:
 *   <Mono>· LÉA · CUREPIPE</Mono>
 *   <Mono className="text-ink-soft">No. 047</Mono>
 */
export function Mono({
  children,
  className = '',
  style
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-mono ${className}`} style={style}>
      {children}
    </span>
  );
}

/**
 * Italic accent — Instrument Serif italic, used inline inside Bricolage
 * headlines for the soft beat ("Things in <Italic>circulation</Italic>")
 * and for quirk quotes on item cards.
 *
 * Never a whole sentence — always a beat.
 *
 * Example:
 *   <h1>The <Italic>index</Italic></h1>
 *   <p>“squeaks before <Italic>it works</Italic>”</p>
 */
export function Italic({
  children,
  className = '',
  style
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`font-italic italic font-normal ${className}`} style={style}>
      {children}
    </span>
  );
}

/**
 * Hairline ink rule. Used as section dividers across the editorial system.
 *
 * Default is a 1px line at 15% opacity ink — confident but quiet.
 * Override with className for weight/colour variations (e.g. "bg-ink"
 * for a full-weight divider).
 *
 * Example:
 *   <Rule />
 *   <Rule className="bg-ink" />
 *   <Rule className="border-dashed border-t border-ink/40 bg-transparent" />
 */
export function Rule({ className = '' }: { className?: string }) {
  return <div role="separator" aria-hidden className={`h-px bg-ink/15 ${className}`} />;
}
