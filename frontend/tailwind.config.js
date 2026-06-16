/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": "var(--bg-base)",
        "neon-cyan": "var(--neon-cyan)",
        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        "status-ok": "var(--status-ok)",
        "status-warn": "var(--status-warn)",
        "status-new": "var(--status-new)",
        "status-alert": "var(--status-alert)",
      },
      fontFamily: {
        display: ["Orbitron", "Rajdhani", "sans-serif"],
        body: ["Inter", "IBM Plex Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
