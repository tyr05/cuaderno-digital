import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
  extend: {
    fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto"] },
      colors: {
        brand:{DEFAULT:"#22c55e",50:"#ecfdf5",100:"#d1fae5",200:"#a7f3d0",300:"#6ee7b7",400:"#34d399",500:"#22c55e",600:"#16a34a",700:"#15803d",800:"#166534",900:"#14532d"},
        surface:"#101311", surface2:"#0c0f0d", card:"#151a17", muted:"#232a26",
        text:"#ecf2ef", subtext:"#a6b3ad",
      },
      boxShadow:{soft:"0 10px 25px -10px rgba(0,0,0,0.45)", ring:"0 0 0 3px rgba(34,197,94,0.35)"},
      borderRadius:{xl:"1rem","2xl":"1.25rem"},
    },
  },
  plugins:[forms],
};

