import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0C1014',
        surface: '#161B21',
        raised: '#252A30',
        tape: '#1769FF',
        deep: '#083DAA',
        signal: '#FFD22B',
        dust: '#9F978C',
        bone: '#D8D0C3',
        wood: '#574536',
        alert: '#B52B21',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        pixel: ['var(--font-pixel)', 'monospace'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
