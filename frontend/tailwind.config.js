/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: "#fdf2f2",
          100: "#fbe5e5",
          200: "#f5c3c3",
          300: "#ee9494",
          400: "#e25757",
          500: "#d43030",
          600: "#b82222",
          700: "#782121",
          800: "#661d1d",
          900: "#571c1c",
          950: "#300a0a",
        },
      },
      fontFamily: {
        lexend: ['"Lexend Deca"', "sans-serif"],
        manrope: ['"Manrope"', "sans-serif"],
        heading: ['"Lexend Deca"', "sans-serif"],
        body: ['"Manrope"', "sans-serif"],
      },
      maxWidth: {
        container: "1440px",
      },
      aspectRatio: {
        product: "300 / 375",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-up": "slideInUp 0.3s ease-out",
        "hero-text": "heroText 0.8s ease-out forwards",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideInRight: { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(0)" } },
        slideInUp: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "translateY(0)" } },
        heroText: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
