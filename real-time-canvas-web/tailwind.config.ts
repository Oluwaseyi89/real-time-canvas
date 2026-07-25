import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'canvas-bg': '#f0f0f0',
        'toolbar-bg': '#ffffff',
        'border-light': '#e5e5e5',
        'primary-blue': '#3b82f6',
        'secondary-gray': '#6b7280',
      },
      spacing: {
        'toolbar': '4rem',
        'sidebar': '3.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 1.5s infinite',
      },
    },
  },
  plugins: [],
}

export default config
