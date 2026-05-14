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
  const content = (
    <span
      className={`font-display tracking-[-0.03em] text-ink inline-flex items-end ${className}`}
      style={{ fontSize: size, lineHeight: 1, fontWeight: 800 }}
    >
      partaz
      <span
        aria-hidden
        className="bg-partaz inline-block rounded-full"
        style={{
          width: '0.18em',
          height: '0.18em',
          marginBottom: '0.12em',
          marginLeft: '0.04em'
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
