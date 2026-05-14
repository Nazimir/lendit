import Link from 'next/link';

/**
 * The Partaz brand mark.
 *
 * Lowercase `partaz` set in Bricolage Grotesque Extra-Bold with a tight
 * red dot (the `cat-tools` territory colour) immediately after the `z`.
 * The dot is the constant brand accent across every page.
 *
 * Sizing scales typography and dot proportionally — set `size` to the
 * desired font-size in px.
 */
export function Wordmark({
  size = 24,
  asLink = true,
  href = '/home',
  className = ''
}: {
  size?: number;
  asLink?: boolean;
  href?: string;
  className?: string;
}) {
  // The dot is positioned so its CENTER sits on the text baseline of the
  // wordmark. We use the default inline baseline alignment of inline-block
  // (the bottom of the dot box aligns to the text baseline) and then push
  // the dot down by half its own height with translateY(50%) — so the
  // baseline now bisects the dot.
  const content = (
    <span
      className={`font-display tracking-[-0.03em] text-ink ${className}`}
      style={{ fontSize: size, lineHeight: 1, fontWeight: 800, whiteSpace: 'nowrap' }}
    >
      partaz<span
        aria-hidden
        className="bg-partaz inline-block rounded-full align-baseline"
        style={{
          width: '0.18em',
          height: '0.18em',
          marginLeft: '0.04em',
          transform: 'translateY(50%)'
        }}
      />
    </span>
  );

  if (!asLink) return content;
  return (
    <Link href={href} aria-label="Partaz home">
      {content}
    </Link>
  );
}
