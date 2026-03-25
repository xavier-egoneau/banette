/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          light: 'var(--color-paper-light)',
          dark: 'var(--color-paper-dark)',
          line: 'var(--color-paper-line)',
          border: 'var(--color-paper-border)'
        },
        ink: {
          light: 'var(--color-ink-light)',
          DEFAULT: 'var(--color-ink)',
          dark: 'var(--color-ink-dark)'
        }
      },
      fontFamily: {
        content: ['Georgia', 'serif'],
        ui: ['system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
}
