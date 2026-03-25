/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          light: '#FFF8E7',
          dark: '#F5EDCC',
          line: '#E8D9A0',
          border: '#D4C078'
        },
        ink: {
          light: '#8B7355',
          DEFAULT: '#5C4A1E',
          dark: '#3D2E0A'
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
