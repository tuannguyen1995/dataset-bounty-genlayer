/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#05070a",
          900: "#090d14",
          850: "#0e1420",
          800: "#141c2c",
          700: "#1e293d",
        },
        emeraldbrand: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        amberbrand: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        indigobrand: {
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'emerald-glow': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
        'amber-glow': '0 0 25px -4px rgba(245, 158, 11, 0.35)',
        'indigo-glow': '0 0 25px -4px rgba(99, 102, 241, 0.35)',
      }
    },
  },
  plugins: [],
}
