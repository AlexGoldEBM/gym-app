/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#1a1a1a',
        surface2: '#262626',
        border: '#3a3a3a',
        accent: '#facc15',   // vibrant yellow — text links, highlights, play (dark text on fills)
        accent2: '#eab308',
        royal: '#2563eb',    // royal blue — primary buttons, nav, selection
        royal2: '#1d4ed8',
        good: '#2ee65f',     // vibrant green
        warn: '#fbbf24',
        danger: '#ff4d4d',   // vibrant red
        // Brighter neutral ramp — kills the low-contrast "gray on black" look
        gray: {
          100: '#f5f5f5',
          200: '#ededed',
          300: '#e0e0e0',
          400: '#d0d0d0',
          500: '#b0b0b0',
          600: '#969696',
          700: '#7a7a7a',
        },
      },
    },
  },
  plugins: [],
}
