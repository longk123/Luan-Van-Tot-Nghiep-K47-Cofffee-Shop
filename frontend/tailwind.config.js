/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Màu chính - Nâu ấm áp (Coffee Brown)
        primary: {
          50: '#FEF7ED',
          100: '#FDF0DC',
          200: '#FADDB3',
          300: '#F7CA8A',
          400: '#F4B761',
          500: '#9B7653', // Màu chính
          600: '#8B6F47',
          700: '#7A5E3A',
          800: '#6A4E2E',
          900: '#5A3E22',
        },
        // Màu nhấn - Cam/Vàng (Accent Orange)
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316', // Màu cam chính
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Màu xanh lá - Success
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981', // Màu xanh lá chính
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // Màu xanh đen - Dark/Info
        dark: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151', // Màu xanh đen chính
          800: '#1F2937',
          900: '#111827',
        },
        // Màu nền ấm
        cream: {
          50: '#FFFBF5',
          100: '#FEF7ED',
          200: '#FDF0DC',
          300: '#FAF5EF',
          400: '#F5EFE7',
          500: '#EDE4DB',
        },
      },
    },
  },
  plugins: [],
}