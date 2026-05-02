/**
 * Manual synonym expansion. When a user searches for one of the keys, we
 * also search for everything in its array. Bidirectional pairs should appear
 * in both lists (e.g., glasses ↔ spectacles).
 *
 * Add to this file freely — it's just a map. Keep terms lowercase. The DB
 * also does fuzzy/trigram matching for typos, so you don't need to list
 * misspellings here, only true synonyms.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  glasses:    ['spectacles', 'eyeglasses', 'eyewear'],
  spectacles: ['glasses', 'eyeglasses', 'eyewear'],
  eyeglasses: ['glasses', 'spectacles'],
  shades:     ['sunglasses'],
  sunglasses: ['shades'],

  bike:    ['bicycle', 'cycle'],
  bicycle: ['bike', 'cycle'],
  cycle:   ['bike', 'bicycle'],

  laptop:   ['notebook', 'computer', 'macbook'],
  notebook: ['laptop', 'computer'],
  macbook:  ['laptop'],

  drill:        ['power drill', 'cordless drill'],
  hammer:       ['mallet'],
  screwdriver:  ['driver'],

  tv:         ['television'],
  television: ['tv'],

  fridge:       ['refrigerator'],
  refrigerator: ['fridge'],

  phone:      ['mobile', 'cell', 'cellphone', 'smartphone'],
  mobile:     ['phone', 'cellphone', 'smartphone'],
  smartphone: ['phone', 'mobile'],

  book:  ['novel', 'paperback', 'hardback'],
  novel: ['book'],

  speaker: ['speakers', 'soundbar'],
  speakers:['speaker'],

  camera:  ['cam', 'dslr', 'mirrorless'],
  dslr:    ['camera'],

  bag:     ['backpack', 'rucksack', 'tote'],
  backpack:['bag', 'rucksack'],
  rucksack:['backpack', 'bag'],

  tent:    ['shelter'],
  jacket:  ['coat', 'parka'],
  coat:    ['jacket', 'parka'],

  scooter: ['kick scooter', 'electric scooter'],
  car:     ['vehicle', 'automobile'],
  van:     ['vehicle', 'truck']
};

/** Expand a search query into an array of terms to actually search for. */
export function expandSearchTerms(q: string): string[] {
  const cleaned = q.trim().toLowerCase();
  if (!cleaned) return [];

  const out = new Set<string>();
  // Always include the full phrase (covers multi-word queries like "macbook pro")
  out.add(cleaned);

  // Each whitespace-separated word gets its own match + synonyms
  const words = cleaned.split(/\s+/).filter(Boolean);
  for (const w of words) {
    out.add(w);
    for (const syn of SYNONYM_MAP[w] || []) out.add(syn);
  }

  return Array.from(out);
}
