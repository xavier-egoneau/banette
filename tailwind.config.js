/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          light:  'rgb(var(--color-paper-light)  / <alpha-value>)',
          dark:   'rgb(var(--color-paper-dark)   / <alpha-value>)',
          line:   'rgb(var(--color-paper-line)   / <alpha-value>)',
          border: 'rgb(var(--color-paper-border) / <alpha-value>)'
        },
        ink: {
          light:   'rgb(var(--color-ink-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-ink)       / <alpha-value>)',
          dark:    'rgb(var(--color-ink-dark)  / <alpha-value>)'
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
