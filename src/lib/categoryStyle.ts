// Partaz visual reset — per-category territory palettes.
//
// Each category maps to one of 10 "territories" defined in the design system.
// A territory is the FULL canvas of a card (bg), the text colour that goes on
// top of it (ink), plus a few accent values used by older components.
//
// Token mapping:
//   bg       — territory background (full bleed on cards)
//   ink      — text colour ON the territory (paper for dark territories,
//              ink-dark for light territories)
//   accent   — secondary accent colour, used by old components for borders
//              and accent pills. Set to ink-dark (#16130D) so borders and
//              accents read as sharp editorial lines across every territory.
//   scribble — italic-quote colour. Matches `ink` so quotes are legible.
//   pill     — small overlay pill background (paper-soft) used on photos.

export interface CategoryPalette {
  bg: string;
  ink: string;
  accent: string;
  scribble: string;
  pill: string;
}

const PAPER = '#F2ECE0';
const PAPER_SOFT = '#E8E1D2';
const INK = '#16130D';

// Helper — every territory shares the same accent (ink) and pill (paper-soft).
function t(bg: string, textOn: string): CategoryPalette {
  return { bg, ink: textOn, accent: INK, scribble: textOn, pill: PAPER_SOFT };
}

// Old display names → new territories.
// (Existing items in the DB use these category strings, so we map by them.)
const PALETTES: Record<string, CategoryPalette> = {
  'Tools':             t('#D8421C', PAPER),  // territory: tools     (red-orange)
  'Kitchen':           t('#EBC65A', INK),    // territory: kitchen   (mustard yellow)
  'Outdoor & Camping': t('#B6C6CC', INK),    // territory: outdoor   (cool blue-gray)
  'Sports':            t('#8C9555', PAPER),  // territory: sports    (olive)
  'Books & Media':     t('#5A2A1F', PAPER),  // territory: books     (deep chestnut)
  'Electronics':       t('#C76A2E', PAPER),  // territory: tech      (burnt orange)
  'Garden':            t('#4F6049', PAPER),  // territory: garden    (forest green)
  'Party & Events':    t('#E9967A', INK),    // territory: music     (warm coral)
  'Baby & Kids':       t('#BFB1D0', INK),    // territory: baby      (lilac)
  'Music':             t('#E9967A', INK),    // territory: music     (warm coral)
  'Travel':            t('#B6C6CC', INK),    // territory: outdoor   (cool blue-gray)
  'Other':             t('#C76A2E', PAPER)   // territory: tech      (burnt orange)
};

const FALLBACK = PALETTES['Other'];

export function paletteForCategory(category: string | null | undefined): CategoryPalette {
  if (!category) return FALLBACK;
  return PALETTES[category] || FALLBACK;
}
