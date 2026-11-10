/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        despensa: {
          bg: '#f5e8d9',      // Warm Cream
          primary: '#3f5228', // Olive Green
          text: '#3f5228',    // Olive Green para textos principales
          subtext: '#60724a', // Un tono intermedio de oliva para subtítulos
          card: '#ffffff',
          accent: '#d8492e',  // Terracotta Orange
        },
      },
    },
  },
  plugins: [],
};