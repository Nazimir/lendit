/**
 * Subtle paper-grain texture used to add tactility to territory colours.
 *
 * It's an inlined SVG noise filter — no external asset, no extra request,
 * no build step. Apply via the helper below as a backgroundImage with
 * mix-blend-mode: multiply to darken the solid colour slightly with grain.
 */
export const PAPER_GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/**
 * Background-image + blend-mode style additions for any territory canvas.
 * Spread into a style object alongside `background: palette.bg`.
 *
 *   style={{ background: palette.bg, ...grainStyle }}
 */
export const grainStyle: React.CSSProperties = {
  backgroundImage: PAPER_GRAIN_URL,
  backgroundBlendMode: 'multiply'
};
