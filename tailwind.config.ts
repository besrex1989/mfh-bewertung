import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        forest: {
          50:  "#f0f7f2",
          100: "#d8eddd",
          200: "#b4dbbe",
          300: "#84c196",
          400: "#52a368",
          500: "#2d7a4a",
          600: "#1f5c37",
          700: "#1a4a2e",
          800: "#163d26",
          900: "#0d2218",
          950: "#071510",
        },
        gold: {
          300: "#e2c87a",
          400: "#d4b05c",
          500: "#c8a84b",
          600: "#a8883a",
        },
        ink: {
          50:  "#f4f7f5",
          100: "#e8ede9",
          200: "#c8d4cb",
          300: "#9ab0a0",
          400: "#7a9282",
          500: "#4a6254",
          600: "#2e3d34",
          700: "#1e2b22",
          800: "#161d18",
          900: "#111812",
          950: "#0b0f0d",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
