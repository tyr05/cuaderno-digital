import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
  extend: {
    fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto"] },
      colors: {
        brand: {
          DEFAULT: "#22c55e",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        surface: "#f5f7fb",
        surface2: "#eef2f8",
        card: "#ffffff",
        muted: "#d9e2ec",
        text: "#1f2733",
        subtext: "#56616f",
        section: {
          blue: "#d7e4ff",
          pink: "#ffe0ef",
          yellow: "#fff3cd",
        },
      },
      boxShadow: {
        soft: "0 20px 45px -25px rgba(15, 23, 42, 0.2)",
        ring: "0 0 0 3px rgba(34, 197, 94, 0.18)",
      },
      borderRadius: { xl: "1.125rem", "2xl": "1.5rem", "3xl": "1.875rem" },
    },
  },
  plugins:[forms],
};

