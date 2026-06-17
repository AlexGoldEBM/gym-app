/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#161616',
        surface2: '#1f1f1f',
        border: '#2a2a2a',
        accent: '#3b82f6',
        accent2: '#2563eb',
        good: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
