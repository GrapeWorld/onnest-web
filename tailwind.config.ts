import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#123C35",
          greenDark: "#0B2F2A",
          mint: "#DDF5E9",
          cream: "#FFF7E8",
          navy: "#14213D",
          gray: "#6B7280"
        },
        onnest: {
          green: "#123C35",
          greenDark: "#0B2F2A",
          mint: "#DDF5E9",
          cream: "#FFF7E8",
          navy: "#14213D",
          ink: "#1D2B2A",
          muted: "#6B7280",
          line: "#E6E1D5",
          white: "#FFFFFF"
        },
        forest: "#123C35",
        navy: "#172A46",
        cream: "#FFF7E8",
        mint: "#DFF4EA",
        sage: "#7FA893",
        ink: "#1D2B2A"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2rem"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(18, 60, 53, 0.10)",
        card: "0 16px 44px rgba(20, 33, 61, 0.06)",
        glow: "0 24px 80px rgba(18, 60, 53, 0.14)"
      },
      fontFamily: {
        sans: [
          "var(--font-pretendard)",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif"
        ]
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem"
      }
    }
  },
  plugins: []
};

export default config;
