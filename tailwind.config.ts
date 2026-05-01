import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Soft sage green primary — change these hexes to repaint the app.
        accent: {
          50:  '#F1F6F1',
          100: '#E1ECE2',
          200: '#C5DAC8',
          300: '#A3C4A8',
          400: '#86A789',  // primary
          500: '#6E9072',
          600: '#577559',
          700: '#445B47',
          800: '#33433A',
          900: '#1F2A21'
        },
        cream: {
          50:  '#FDFCF8',
          100: '#FAFAF7',  // page background
          200: '#F2F1EA'
        },
        // Soft pink and butter for status pills, ratings
        rose:   { soft: '#F8B4C8' },
        butter: { soft: '#F6D77A' }
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        soft: '0 4px 14px -6px rgba(31,42,33,0.10), 0 2px 4px -2px rgba(31,42,33,0.05)'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        script: ['var(--font-script)', 'Caveat', 'cursive'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
