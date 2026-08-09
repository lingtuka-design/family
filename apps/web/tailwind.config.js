/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
        serif: ["Roboto", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
