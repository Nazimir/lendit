/**
 * Personal territory — each user (or any UUID-keyed thing) is assigned a
 * stable category territory based on a hash of its id. Used to give every
 * neighbour a consistent editorial colour in profile mastheads and the
 * loans ledger, and to keep visual variety in long lists.
 *
 * Note: this maps to display-category strings so it plugs into
 * `paletteForCategory()`. The names don't carry semantic meaning here —
 * they're just selecting one of the 10 territories.
 */
const TERRITORIES_IN_ORDER: string[] = [
  'Textiles',          // pink
  'Music',             // coral
  'Outdoor & Camping', // cool blue-gray
  'Baby & Kids',       // lilac
  'Garden',            // forest green
  'Books & Media',     // navy
  'Tools',             // red-orange
  'Kitchen',           // mustard yellow
  'Electronics',       // taupe
  'Sports'             // olive
];

export function territoryForUser(id: string): string {
  return territoryById(id);
}

/**
 * Same underlying hash. Use this when assigning a stable territory to an
 * item (for visual variety on the owner's own shelf, where the category
 * is already visible elsewhere and consecutive same-category items would
 * otherwise look identical).
 */
export function territoryForItem(id: string): string {
  return territoryById(id);
}

function territoryById(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 4);
  if (!hex) return TERRITORIES_IN_ORDER[0];
  return TERRITORIES_IN_ORDER[parseInt(hex, 16) % TERRITORIES_IN_ORDER.length];
}
