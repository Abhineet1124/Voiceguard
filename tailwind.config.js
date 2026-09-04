/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        voiceguard: {
          950: "#020617",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          500: "#06b6d4",
          400: "#22d3ee",
          300: "#67e8f9",
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(34, 211, 238, 0.12)",
      },
    },
  },
  plugins: [],
};