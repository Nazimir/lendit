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
export const TERRITORIES_IN_ORDER: string[] = [
  'Textiles',          // pink
  'Music',             // coral
  'Outdoor & Camping', // cool blue-gray
  'Baby & Kids',       // lilac
  'Garden',            // forest green
  'Books & Media',     // deep chestnut
  'Tools',             // red-orange
  'Kitchen',           // mustard yellow
  'Electronics',       // burnt orange
  'Sports'             // olive
];

export function territoryForUser(id: string): string {
  return territoryById(id);
}

/**
 * Profile-aware version. Honours a user's chosen override (set via the
 * "shuffle my colour" button on their profile) and falls back to the
 * hash-based default if no override is set.
 *
 * Use this anywhere we have the full profile loaded. Use territoryForUser
 * when only the id is available (lookups will get hash-based for now —
 * future enhancement could batch-fetch overrides).
 */
export function territoryForProfile(
  profile: { id: string; territory_override?: string | null }
): string {
  if (profile.territory_override && TERRITORIES_IN_ORDER.includes(profile.territory_override)) {
    return profile.territory_override;
  }
  return territoryById(profile.id);
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
