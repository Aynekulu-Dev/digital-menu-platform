/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        espresso: {
          DEFAULT: '#2B1B14',
          950: '#1A100B',
          900: '#2B1B14',
          800: '#3D2A1F',
          700: '#4F3B2C',
        },
        paper: {
          DEFAULT: '#FAF0DC',
          50: '#FFFBF3',
          100: '#FAF0DC',
          200: '#F2E2C0',
        },
        turmeric: {
          DEFAULT: '#D9A62E',
          400: '#E4BC5C',
          500: '#D9A62E',
          600: '#B5871F',
        },
        berbere: {
          DEFAULT: '#A6321C',
          500: '#A6321C',
          600: '#872715',
        },
        herb: {
          DEFAULT: '#4C6B4F',
          500: '#4C6B4F',
          600: '#3A5340',
        },
        ink: '#211712',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        card: '0 1px 2px rgba(43,27,20,0.06), 0 8px 24px -12px rgba(43,27,20,0.18)',
      },
    },
  },
  plugins: [],
}
