/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#030309',
        bg2: '#07071a',
        surf: '#0e0e24',
        surf2: '#141432',
        surf3: '#1c1c44',
        cyan: '#00f5ff',
        magenta: '#ff0090',
        lime: '#b4ff00',
        green: '#00ff88',
        red: '#ff3366',
        gold: '#ffc740',
        muted: '#6060a0',
        border: 'rgba(255,255,255,0.06)',
        border2: 'rgba(255,255,255,0.12)',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
      },
      backgroundImage: {
        'cyan-magenta': 'linear-gradient(135deg, #00f5ff, #ff0090)',
        'cyan-blue': 'linear-gradient(135deg, #00f5ff, #0070ff)',
        'green-cyan': 'linear-gradient(135deg, #00ff88, #00f5ff)',
        'grid-pattern': `linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0,245,255,0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(0,245,255,0.6)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'cyan': '0 0 20px rgba(0,245,255,0.3)',
        'cyan-lg': '0 0 40px rgba(0,245,255,0.4)',
        'magenta': '0 0 20px rgba(255,0,144,0.3)',
        'green': '0 0 20px rgba(0,255,136,0.3)',
        'card': '0 8px 32px rgba(0,0,0,0.4)',
        'modal': '0 24px 80px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        'xl2': '16px',
        'xl3': '24px',
      },
    },
  },
  plugins: [],
}
