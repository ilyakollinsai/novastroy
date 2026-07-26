import type { Config } from 'tailwindcss';

// Дизайн-токены в "документооборотном" деловом стиле:
// бумажный фон, чернильный текст, статусы тендеров/заявок оформлены как печати.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#faf7ef',
          dark: '#f0ead9',
        },
        ink: {
          DEFAULT: '#22262b',
          light: '#565b63',
          faint: '#8a8f97',
        },
        brass: {
          DEFAULT: '#a9824f',
          light: '#d8c39c',
        },
        stamp: {
          green: '#2f6b3f',
          amber: '#a5620f',
          red: '#9a2a2a',
          gray: '#6b6f76',
          blue: '#2a4a7a',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        doc: '0 1px 2px rgba(34, 38, 43, 0.06), 0 4px 12px rgba(34, 38, 43, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
