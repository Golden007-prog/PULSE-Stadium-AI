import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Command-Center Density design tokens (Stitch brief).
        surface: {
          dim: "#0A0D14",
          lowest: "#0B0E15",
          low: "#12161F",
          DEFAULT: "#1A1F2B",
          high: "#272A32",
          highest: "#32353D",
        },
        accent: {
          cyan: "#00E5FF",
          green: "#3DDC84",
          amber: "#FFB547",
          red: "#FF5252",
          purple: "#9B6CFF",
        },
        ink: {
          DEFAULT: "#E1E2EC",
          mute: "#BAC9CC",
          fade: "#849396",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jbmono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 12px rgba(0,229,255,0.18)",
        "glow-red": "0 0 16px rgba(255,82,82,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
