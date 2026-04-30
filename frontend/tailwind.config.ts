import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        brand: {
          green: '#1a9e57',
          'green-bg': '#e6f7ee',
          mint: '#e4f5ed',
          lavender: '#ede8ff',
          peach: '#fff0e6',
          yellow: '#fffbe5',
          sky: '#e4f0fc',
        },
      },
      borderRadius: { lg: '14px', md: '10px', sm: '7px' },
    },
  },
  plugins: [],
} satisfies Config;
