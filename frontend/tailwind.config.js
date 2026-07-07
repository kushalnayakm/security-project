/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 24px 80px rgba(15, 23, 42, 0.45)",
      },
      colors: {
        brand: {
          50: "#f3f7ff",
          500: "#5aa9ff",
          600: "#398cf0",
          700: "#2d6dc0",
        },
      },
      backgroundImage: {
        "dashboard-grid":
          "radial-gradient(circle at top, rgba(96,165,250,0.12), transparent 30%), linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dashboard-grid": "auto, 32px 32px, 32px 32px",
      },
    },
  },
  plugins: [],
};
