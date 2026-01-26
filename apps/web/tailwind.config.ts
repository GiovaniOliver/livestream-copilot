import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core backgrounds - matching mobile app dark theme
        bg: {
          0: "#0D0D12", // Deep background
          1: "#16161D", // Card/elevated background
          2: "#1E1E26", // Hover states
        },
        // Text colors
        text: {
          DEFAULT: "#EAEAF3",
          muted: "#6B6B7B",
          dim: "#4A4A57",
        },
        // Brand accent colors
        teal: {
          DEFAULT: "#00D4C7",
          50: "#E6FFFE",
          100: "#B3FFFC",
          200: "#80FFF9",
          300: "#4DFFF6",
          400: "#1AFFF3",
          500: "#00D4C7",
          600: "#00A89E",
          700: "#007C75",
          800: "#00504C",
          900: "#002423",
        },
        purple: {
          DEFAULT: "#8B5CF6",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        // Status colors
        success: "#2EE59D",
        warning: "#FBBF24",
        error: "#EF4444",
        // Surface and border
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          hover: "rgba(255, 255, 255, 0.08)",
          active: "rgba(255, 255, 255, 0.10)",
        },
        stroke: {
          DEFAULT: "rgba(255, 255, 255, 0.12)",
          subtle: "rgba(255, 255, 255, 0.08)",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 212, 199, 0.15)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.15)",
        card: "0 18px 70px rgba(0, 0, 0, 0.45)",
        elevated: "0 8px 32px rgba(0, 0, 0, 0.3)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand":
          "linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(0, 212, 199, 0.18))",
        "gradient-hero": `
          radial-gradient(900px 600px at 15% 20%, rgba(139, 92, 246, 0.28), transparent 60%),
          radial-gradient(900px 600px at 85% 30%, rgba(0, 212, 199, 0.22), transparent 60%),
          radial-gradient(1000px 800px at 50% 110%, rgba(46, 229, 157, 0.18), transparent 60%),
          linear-gradient(180deg, #0D0D12, #16161D)
        `,
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 212, 199, 0.15)" },
          "50%": { boxShadow: "0 0 30px rgba(0, 212, 199, 0.3)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
