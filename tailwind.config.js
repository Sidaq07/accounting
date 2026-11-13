export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#dfeeff',
          500: '#1d4ed8',
          600: '#0ea5e9',
          700: '#38bdf8',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 55px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
