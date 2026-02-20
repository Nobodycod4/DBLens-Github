import palette from './src/theme/colors.js';

export default {
  content: [
    "./index.html",
    "./src
*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: palette.primary,           // #f0f0f2 – main bg/surfaces
        secondary: palette.secondary,       // #080705 – text, dark elements
        brand: {
          primary: palette.accent,          // #2563EB – buttons, links
          'primary-hover': palette.accentHover,
          'primary-light': palette.info,
          accent: palette.accent,
          'accent-hover': palette.accentHover,
        },
        dark: {
          bg: palette.secondary,
          sidebar: palette.secondary,
          card: '#21262D',
          hover: '#30363D',
          border: '#30363D',
          'border-subtle': '#21262D',
        },
        light: {
          bg: palette.primary,
          sidebar: palette.primary,
          card: palette.primaryLight,
          hover: palette.primaryHover,
          border: palette.primaryHover,
          'border-subtle': '#e5e7eb',
        },
        accent: {
          DEFAULT: palette.accent,
          dark: palette.accentHover,
          light: palette.info,
          hover: palette.accentHover,
          muted: palette.infoMuted,
        },
        secondaryAccent: palette.secondaryAccent,
        success: palette.success,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '6px',
        'lg': '6px',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

