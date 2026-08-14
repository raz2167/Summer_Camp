/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heebo: ["Heebo", "sans-serif"],
      },
      colors: {
        ink: "#1C2321",
        cream: "#F5F1E8",
        "cream-dim": "#EFE9DA",
        "cream-line": "#E3DCC8",
        sand: "#C7BFA9",
        "sand-dim": "#D6CDB4",
        muted: "#55524A",
        "muted-2": "#8A8470",
        cta: "#B8451F",
        "cta-hover": "#9A3A19",
        green: "#2E5C3E",
        gold: "#D4A93F",
        "gold-dim": "#8FA85E",
        warn: "#7A1F1F",
        "warn-bg": "#F3D4C8",
        hint: "#FBF0DC",
        "hint-border": "#D4A93F",
        "hint-text": "#7A5C1E",
        obs: "#8A6D3B",
        "obs-bg": "#FBF4E0",
        input: "#E8F0E5",
        "input-text": "#1F4A2E",
        "brand-sub": "#B8AE96",
      },
      keyframes: {
        "hist-grow": {
          "0%": { transform: "scaleY(0)", opacity: "0" },
          "100%": { transform: "scaleY(1)", opacity: "1" },
        },
      },
      animation: {
        "hist-grow": "hist-grow 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
