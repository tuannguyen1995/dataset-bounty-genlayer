/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#090d16",
        darkcard: "#0d1424",
        darkcardhover: "#131c31",
        cyanbrand: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        violetbrand: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -3px rgba(6, 182, 212, 0.3)',
        'violet-glow': '0 0 20px -3px rgba(139, 92, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
