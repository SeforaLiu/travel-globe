module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        diary: '#ff6666',
        guide: '#9b5cf6'
      },
      animation: {
        'subtle-pulse': 'subtle-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'subtle-pulse': {
          '0%, 100%': {
            opacity: 0.7,
            transform: 'scale(1)',
          },
          '50%': {
            opacity: 1,
            transform: 'scale(1.03)',
          },
        },
      },
    }
  },
  plugins: []
}
