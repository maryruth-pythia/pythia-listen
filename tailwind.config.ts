import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pythia brand — purple primary with a plum ink and warm orange accent.
        // (Replaces the earlier teal. Rest of the app re-skins from these tokens.)
        brand: {
          DEFAULT: '#6A0FC2', // purple (text-safe brand accent)
          dark: '#4A0F86', // deep purple (headings, hover, active)
          light: '#EFE6FB', // light purple fill
          vlight: '#FAF7FE', // very light purple wash
          rule: '#E7DFF2', // purple hairline / borders
        },
        magenta: {
          DEFAULT: '#EC2BFC', // brand magenta — fills/highlights only (fails text contrast on white)
          light: '#ECC9F9',
        },
        accent: {
          DEFAULT: '#FCC029', // amber (warm accent / "needs a look" marker)
          dark: '#D99E08',
          light: '#FCF6C4',
        },
        cream: {
          DEFAULT: '#FCF6C4',
          light: '#FBF4E3',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          muted: '#555555',
          subtle: '#888888',
        },
      },
      fontFamily: {
        sans: ['var(--font-instrument)', 'Instrument Sans', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument)', 'Instrument Sans', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'pythia-gradient': 'linear-gradient(90deg, #FCC029 0%, #EC2BFC 52%, #6A0FC2 100%)',
        'pythia-gradient-br':
          'linear-gradient(135deg, #FCC029 0%, #EC2BFC 50%, #6A0FC2 100%)',
      },
      typography: {
        DEFAULT: { css: { maxWidth: 'none' } },
      },
    },
  },
  plugins: [],
};

export default config;
