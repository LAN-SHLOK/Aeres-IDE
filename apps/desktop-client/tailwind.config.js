/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        aeres: {
          bg: 'var(--aeres-bg)',
          surface: 'var(--aeres-surface)',
          sidebar: 'var(--aeres-bg)',
          activitybar: 'var(--aeres-bg)',
          titlebar: 'var(--aeres-bg)',
          border: 'var(--aeres-border)',
          violet: 'var(--aeres-violet)',
          text: 'var(--aeres-text)',
          muted: 'var(--aeres-muted)',
        },
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
