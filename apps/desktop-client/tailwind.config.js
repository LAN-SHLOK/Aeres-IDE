/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        aether: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          violet: '#7C3AED',
          blue: '#4F8EF7',
          text: '#e2e2f0',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
