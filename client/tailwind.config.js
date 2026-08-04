/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#FBF8F4',
          100: '#F3E9DD',
          200: '#E4D2BF',
          300: '#D0B59C',
          400: '#B59573',
          500: '#836444',
          600: '#6E5235',
          700: '#543E27',
          800: '#3B2A1A',
          900: '#251A0F',
          950: '#140E08',
        },
        gold: {
          300: '#E8CE90',
          400: '#D6B56E',
          500: '#C39A4D',
          600: '#A67D38',
        },
      },
    },
  },
  plugins: [],
};
