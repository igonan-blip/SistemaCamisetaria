/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#151E1B",
          800: "#1D2A25",
          700: "#2B3A34",
          600: "#3E5049",
        },
        paper: {
          50: "#F2F4F0",
          100: "#E5E9E1",
          200: "#D3D9CD",
        },
        teal: {
          DEFAULT: "#2B6E68",
          600: "#245C57",
          500: "#2B6E68",
          400: "#3D8981",
        },
        amber: {
          DEFAULT: "#C98A2B",
          500: "#C98A2B",
          400: "#DDA24E",
        },
        brick: {
          DEFAULT: "#B8452E",
          500: "#B8452E",
        },
        text: {
          900: "#16201D",
          600: "#43524B",
          400: "#78877F",
        },
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "sans-serif"],
        body: ["\"IBM Plex Sans\"", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
      borderRadius: {
        tag: "3px",
      },
    },
  },
  plugins: [],
};
