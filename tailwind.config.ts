import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#3b6cf4",
          hover: "#2f5ad4",
          light: "#eef3ff",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f7f8fa",
          border: "#e8eaef",
        },
        ink: {
          DEFAULT: "#0f1419",
          muted: "#5c6573",
          faint: "#8b939e",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 20, 25, 0.04), 0 8px 24px rgba(15, 20, 25, 0.06)",
        cardHover:
          "0 2px 6px rgba(15, 20, 25, 0.06), 0 12px 32px rgba(15, 20, 25, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
