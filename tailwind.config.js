module.exports = {
  purge: ['./components/**/*.tsx', './pages/**/*.tsx', './service/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['wotfard', 'Helvetica', 'sans-serif'],
        serif: ['vcr', 'serif'],
        mono: ['inconsolata', 'monospace'],
      },
      colors: {
        cyan: {
          100: '#d7fffc',
          200: '#b8fef8',
          300: '#99fdf4',
          400: '#60f8eb', // main
          500: '#34f0e0',
          600: '#16e5d1',
          700: '#04d4bf',
          800: '#00bfab',
          900: '#00a895',
        },
        magenta: {
          100: '#ffe3fe',
          200: '#fcc3fa',
          300: '#f8a4f5',
          400: '#eb6be6',
          500: '#d53fce',
          600: '#b420ac',
          700: '#840e7d', // main
          800: '#480443',
          900: '#050005',
        },
      },
    },
  },
  variants: {},
  plugins: [],
}
