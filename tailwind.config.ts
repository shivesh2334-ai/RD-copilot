import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F6F3EC",
          dim: "#EDE8DC",
          ink: "#2B2620",
        },
        teal: {
          50: "#EAF3F1",
          100: "#CFE4DF",
          300: "#7FB3A8",
          500: "#2F7A6D",
          600: "#256257",
          700: "#1B4A42",
          900: "#0F2B26",
        },
        terracotta: {
          100: "#F4DCCB",
          300: "#E3A780",
          500: "#C46A3F",
          600: "#A6552F",
        },
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
