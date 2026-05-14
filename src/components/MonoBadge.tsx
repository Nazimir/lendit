import type { ReactNode } from 'react';

/**
 * Mono-caps badge — a small pill of metadata laid over cards or floating
 * in chrome. Variants pick the foreground/background palette.
 *
 *   ink         — solid ink slab, paper text. The default "AVAILABLE".
 *   outline     — paper bg, ink border, ink text. Quieter.
 *   paper-soft  — recessed surface. For neutral or in-progress states.
 *   tools       — bold red-orange territory slab. For action / alert states.
 *   kitchen     — yellow territory slab. For warm / pending states.
 *
 * Example:
 *   <MonoBadge>Available</MonoBadge>
 *   <MonoBadge variant="paper-soft">Requested</MonoBadge>
 *   <MonoBadge variant="tools">Recalled</MonoBadge>
 */
type Variant = 'ink' | 'outline' | 'paper-soft' | 'tools' | 'kitchen';

const variantClasses: Record<Variant, string> = {
  'ink':         'bg-ink text-paper',
  'outline':     'bg-transparent text-ink border border-ink/60',
  'paper-soft':  'bg-paper-soft text-ink-soft',
  'tools':       'bg-cat-tools text-paper',
  'kitchen':     'bg-cat-kitchen text-ink'
};

export function MonoBadge({
  children,
  variant = 'ink',
  prefix = '·',
  className = ''
}: {
  children: ReactNode;
  variant?: Variant;
  /** Small dot or kicker before the label. Pass `null` to suppress. */
  prefix?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-mono whitespace-nowrap ${variantClasses[variant]} ${className}`}
    >
      {prefix && <span aria-hidden>{prefix}</span>}
      {children}
    </span>
  );
}
