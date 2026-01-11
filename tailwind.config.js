/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FFF8F0',
          100: '#FFE4D6',
          200: '#FFF0E6'
        },
        dabo: {
          light: '#E8F2FC',
          DEFAULT: '#4A90D9',
          dark: '#2563EB'
        },
        erbao: {
          light: '#FDE8EC',
          DEFAULT: '#E85D75',
          dark: '#DC2626'
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0,0,0,0.08)',
        'card-lg': '0 8px 30px rgba(0,0,0,0.12)'
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '30px'
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out'
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
