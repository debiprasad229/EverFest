/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Ivory Canvas & Surfaces
        ivory: {
          50: '#FDFCF9',
          100: '#FAF7F2', // Main background canvas
          200: '#F3EFE6', // Card borders and secondary surfaces
          300: '#E8E1D3', // Subtle dividers and disabled borders
          400: '#D5C9B7',
          500: '#B2A38D',
          600: '#8A7B66',
          700: '#675A48',
          800: '#463C30',
          900: '#262018', // Deep warm charcoal text
          950: '#17130E',
        },
        // Deep Plum Accents & Primary Brand
        plum: {
          50: '#FAF4F9',
          100: '#F3E4F0',
          200: '#E7C8E2',
          300: '#D6A6CE',
          400: '#BF7CB4',
          500: '#A45598',
          600: '#84397A',
          700: '#67275D',
          800: '#4E1B46', // Primary deep plum
          900: '#381232', // Darker deep plum
          950: '#21081D', // Deepest midnight plum
        },
        // Restrained Gold Highlights
        gold: {
          50: '#FEFDF8',
          100: '#FBF6E5',
          200: '#F6ECC8',
          300: '#EED99E',
          400: '#E3C36E',
          500: '#CBA83E', // Restrained classic gold
          600: '#B08C29',
          700: '#8A6A1A',
          800: '#694F16',
          900: '#4A3710',
        },
        // Backward-compatible alias for existing components
        brand: {
          50: '#FAF4F9',
          100: '#F3E4F0',
          200: '#E7C8E2',
          300: '#D6A6CE',
          400: '#BF7CB4',
          500: '#84397A',
          600: '#67275D',
          700: '#4E1B46',
          800: '#381232',
          900: '#21081D',
          950: '#140512',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      screens: {
        'print': { 'raw': 'print' },
      },
      boxShadow: {
        'soft': '0 2px 12px -2px rgba(33, 8, 29, 0.05), 0 1px 4px -1px rgba(33, 8, 29, 0.03)',
        'elevated': '0 10px 30px -5px rgba(33, 8, 29, 0.08), 0 4px 10px -3px rgba(33, 8, 29, 0.04)',
        'gold-glow': '0 0 20px -3px rgba(203, 168, 62, 0.35)',
      }
    },
  },
  plugins: [],
}
