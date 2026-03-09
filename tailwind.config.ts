import type { Config } from "tailwindcss";

/** Design language: warm cream, amber, navy, coral — Pixar meets cozy streaming. */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Design palette (use for accents, logo, confetti)
        cream: "#FFF8F0",
        amber: "#F4A335",
        navy: "#1A2744",
        coral: "#FF6B6B",
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "spring-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "70%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "spring-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.98)", opacity: "0" },
        },
        "confetti": {
          "0%": { transform: "translateY(-100%) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "spring-in": "spring-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring-out": "spring-out 0.25s ease-out",
        "confetti": "confetti 3s ease-out forwards",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
