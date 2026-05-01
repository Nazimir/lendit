// A pastel zine-style colour palette per category. Each entry returns a few
// well-balanced tones we can use across the listing page (background panel,
// accent strip, body text, and an annotation handwriting colour).

export interface CategoryPalette {
  bg: string;       // soft panel background
  ink: string;      // dark body / heading colour
  accent: string;   // strong accent for stripes, pills, underlines
  scribble: string; // handwritten-annotation colour
  pill: string;     // a soft pill bg colour
}

const PALETTES: Record<string, CategoryPalette> = {
  'Tools':            { bg: '#FBE7C6', ink: '#5A3F12', accent: '#D08C2C', scribble: '#A65A1A', pill: '#FFD58A' },
  'Kitchen':          { bg: '#FAD2D2', ink: '#5A1B1B', accent: '#C7434B', scribble: '#A12731', pill: '#FFB3B3' },
  'Outdoor & Camping':{ bg: '#D9E7C8', ink: '#22381E', accent: '#3F7D3F', scribble: '#2E5A2E', pill: '#A8CC9C' },
  'Sports':           { bg: '#CFE5F5', ink: '#13344B', accent: '#2A6F9D', scribble: '#1F4E73', pill: '#9CC9E8' },
  'Books & Media':    { bg: '#E9DFF6', ink: '#2E1F4F', accent: '#6B4DBA', scribble: '#503793', pill: '#C9B7EE' },
  'Electronics':      { bg: '#D4E2DD', ink: '#1F3530', accent: '#3E7A66', scribble: '#2C5849', pill: '#A8C9BE' },
  'Garden':           { bg: '#E1EBC7', ink: '#283517', accent: '#587C2C', scribble: '#3E5A1F', pill: '#BFD58C' },
  'Party & Events':   { bg: '#FFE2EE', ink: '#4F1530', accent: '#C95084', scribble: '#9C3066', pill: '#FFB6D5' },
  'Baby & Kids':      { bg: '#FFF1C2', ink: '#4A3A0F', accent: '#D6A53A', scribble: '#A87E22', pill: '#FFE08A' },
  'Music':            { bg: '#E8D7C7', ink: '#3A2515', accent: '#A0673A', scribble: '#7A4623', pill: '#D6B89C' },
  'Travel':           { bg: '#CFE0E2', ink: '#0F3338', accent: '#2D6F77', scribble: '#1F5057', pill: '#A6CDD1' },
  'Other':            { bg: '#EAE6DC', ink: '#3B362A', accent: '#857150', scribble: '#5F4E33', pill: '#CFC7B5' }
};

const FALLBACK = PALETTES['Other'];

export function paletteForCategory(category: string | null | undefined): CategoryPalette {
  if (!category) return FALLBACK;
  return PALETTES[category] || FALLBACK;
}
