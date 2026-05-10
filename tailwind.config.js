/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FAF6EC",
          100: "#F4ECD8",
          200: "#EAE0C8",
          300: "#D9CCAA",
        },
        paper: "#FFFEF8",
        ink: {
          DEFAULT: "#0A0A0A",
          800: "#1A1A1A",
          600: "#3D3D3D",
          500: "#5C544A",
          400: "#857C70",
          300: "#A8A095",
          200: "#CFC8BD",
          100: "#E0D9CC",
        },
        cobalt: {
          50: "#E6E9FF",
          300: "#7B8AFF",
          500: "#1E3AFF",
          700: "#0F1E99",
        },
        tomato: {
          50: "#FFE9E3",
          300: "#FF9479",
          500: "#FF4D2E",
          700: "#B82A11",
        },
        mustard: {
          50: "#FFF4D0",
          300: "#FFD96A",
          500: "#F4B400",
          700: "#9C6E00",
        },
        lime: {
          50: "#E5FBD8",
          300: "#9FE57A",
          500: "#5BD27D",
          700: "#2A8A48",
        },
        plum: {
          50: "#EFE4FF",
          300: "#B998FF",
          500: "#7C3AED",
          700: "#4C1D95",
        },
        primary: {
          50: "#E6E9FF",
          100: "#E6E9FF",
          200: "#7B8AFF",
          300: "#7B8AFF",
          400: "#1E3AFF",
          500: "#1E3AFF",
          600: "#0F1E99",
          700: "#0F1E99",
          800: "#0F1E99",
          900: "#0F1E99",
        },
        success: "#5BD27D",
        warning: "#F4B400",
        danger: "#FF4D2E",
        muted: "#857C70",
      },
      borderRadius: {
        card: 8,
        chip: 4,
      },
      borderWidth: {
        brutal: "2px",
        heavy: "3px",
      },
      fontFamily: {
        sans: ["Inter Tight", "system-ui", "-apple-system", "sans-serif"],
        display: ["Archivo Black", "Helvetica Neue", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        brutal: "4px 4px 0 0 #0A0A0A",
        "brutal-sm": "2px 2px 0 0 #0A0A0A",
        "brutal-lg": "6px 6px 0 0 #0A0A0A",
      },
    },
  },
  plugins: [],
};
