/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Define a Inter como a fonte principal 'sans'
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
  safelist: [
    // Padrão Geral
    {
      pattern: /(text|bg|border)-(blue|emerald|green|lime|purple|orange|amber|yellow|red|slate|indigo|black|pink|rose|cyan|teal|sky|violet|fuchsia|zinc|gray|stone|neutral)-(600|700|800|900|500)/,
    },
    // FORÇA BRUTA: Adicione estas linhas para garantir que o amarelo exista
    'bg-yellow-600',
    'text-yellow-600',
    'border-yellow-600',
    'bg-slate-500',
    'text-slate-500'
  ],