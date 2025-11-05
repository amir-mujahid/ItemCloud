/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ecf7ff',
          100: '#d6eeff',
          200: '#aeddff',
          300: '#7accff',
          400: '#44b8ff',
          500: '#189fff',   // primary
          600: '#0b7fe0',
          700: '#0a63b2',
          800: '#0a4d88',
          900: '#0b3f6d',
        }
      },
      boxShadow: {
        glow: '0 0 20px rgba(24,159,255,.35)',
      }
    },
  },
  plugins: [],
};
