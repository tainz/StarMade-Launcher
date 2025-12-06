/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // StarMade background colors
        'starmade-bg': '#0a0e17',
        'starmade-bg-dark': '#0D0D1B',
        
        // StarMade accent colors (green)
        'starmade-accent': '#27b866',
        'starmade-accent-light': '#2a96a5',
        'starmade-accent-hover': '#449675',
        'starmade-accent-dark': '#1A8C3F',
        'starmade-accent-border': '#13672E',
        
        // Danger/Error colors
        'starmade-danger': '#C73E3A',
        'starmade-danger-hover': '#A0322F',
        'starmade-danger-light': '#E57373',
        'starmade-danger-dark': '#4F1614',
        
        // Text accent
        'starmade-text-accent': '#449675',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'display': ['Orbitron', 'Exo 2', 'monospace'],
      },
      keyframes: {
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-scale': 'fade-in-scale 0.2s ease-out forwards',
      },
      boxShadow: {
        'danger': '0 0 8px 0px rgba(199, 62, 58, 0.3)',
        'danger-hover': '0 0 12px 2px rgba(199, 62, 58, 0.4)',
      },
    },
  },
  plugins: [],
}