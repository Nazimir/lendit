import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─────────────────────────────────────────────────────────────
        // Partaz visual reset — paper, ink, territory.
        // ─────────────────────────────────────────────────────────────
        paper: '#F2ECE0',         // primary cream
        'paper-soft': '#E8E1D2',  // recessed surfaces
        ink: '#16130D',           // primary text
        'ink-soft': '#3D352A',    // secondary text
        partaz: '#D8421C',        // the red dot in the wordmark

        // 10 category territories. Each is the full canvas of an item card.
        // Pair with cat-*-ink for legible text on top.
        'cat-tools':    '#D8421C',
        'cat-kitchen':  '#EBC65A',
        'cat-garden':   '#4F6049',
        'cat-music':    '#E9967A',
        'cat-outdoor':  '#B6C6CC',
        'cat-textiles': '#C58D8A',
        'cat-books':    '#5C3A1E',
        'cat-tech':     '#DCD3BE',
        'cat-baby':     '#BFB1D0',
        'cat-sports':   '#8C9555',

        // ─────────────────────────────────────────────────────────────
        // LEGACY ALIASES — old token names redirected to new palette so
        // existing components (sage greens, creams) render correctly
        // until they're rewritten in Phases 2–7. New code should prefer
        // paper / ink / partaz / cat-* above.
        // ─────────────────────────────────────────────────────────────
        accent: {
          50:  '#F2ECE0',
          100: '#E8E1D2',
          200: '#DDD3BE',
          300: '#A89A82',
          400: '#16130D', // was sage; now ink (used on primary CTAs)
          500: '#16130D',
          600: '#16130D',
          700: '#16130D',
          800: '#16130D',
          900: '#16130D'
        },
        cream: {
          50:  '#F2ECE0',
          100: '#F2ECE0',
          200: '#E8E1D2'
        },
        rose:   { soft: '#E9967A' },  // → music territory
        butter: { soft: '#EBC65A' }   // → kitchen territory
      },
      borderRadius: {
        // Editorial: sharp corners by default. Photo wrappers stay slightly round.
        xl:   '0.5rem',
        '2xl':'0.75rem',
        '3xl':'1rem'
      },
      boxShadow: {
        // Editorial design avoids drop-shadows. Keep the token name so old
        // `shadow-soft` references don't break; effectively a no-op now.
        soft: 'none'
      },
      fontFamily: {
        sans:    ['var(--font-display)', 'Bricolage Grotesque', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Bricolage Grotesque', 'system-ui', 'sans-serif'],
        italic:  ['var(--font-italic)',  'Instrument Serif', 'Georgia', 'serif'],
        script:  ['var(--font-italic)',  'Instrument Serif', 'Georgia', 'serif'], // legacy alias
        mono:    ['var(--font-mono)',    'ui-monospace', 'monospace']
      },
      letterSpacing: {
        editorial: '-0.02em',
        mono: '0.14em'
      }
    }
  },
  plugins: []
};

export default config;
