/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './client/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 背景色 - 浅蓝灰白（来自 logo 背景）
        warm: {
          50: '#F8FAFC',
          100: '#EEF2F7',
          200: '#E2E8F0'
        },
        // 主色/大宝 - 蓝紫色（来自小熊）
        dabo: {
          light: '#E8ECF8',
          DEFAULT: '#8B9DD9',
          dark: '#6B7EC9'
        },
        // 二宝 - 珊瑚粉色（来自温度计）
        erbao: {
          light: '#FDE8EC',
          DEFAULT: '#F5A5A5',
          dark: '#E87F7F'
        },
        // 强调色 - 薄荷绿（来自护士帽）
        mint: {
          light: '#E5F6F2',
          DEFAULT: '#7DD3C0',
          dark: '#5AB8A8'
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
