/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          darkest: "#1e1f22",
          dark: "#2b2d31",
          light: "#313338",
          hover: "#35373c",
          channel: "#949ba4",
          text: "#dbdee1",
          white: "#f2f3f5",
          blurple: "#5865F2",
          green: "#23a55a",
          yellow: "#f0b232",
          red: "#f23f43"
        }
      }
    },
  },
  plugins: [],
}
