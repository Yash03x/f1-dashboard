/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'f1-red': '#e10600',
        'f1-black': '#15151e',
        'f1-white': '#ffffff',
        'f1-silver': '#c0c0c0',
      },
      fontFamily: {
        'f1': ['Formula1', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}