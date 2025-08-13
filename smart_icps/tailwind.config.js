/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Make sure this path matches your project structure
  ],
  theme: {
    extend: {
      colors: {
        // Mapped from your :root CSS variables
        'primary': '#4A90E2',
        'primary-hover': '#357ABD',
        'secondary': '#28a745',
        'secondary-hover': '#218838',
        'light-primary': '#EAF2FB',
        'text-main': '#3C4858',
        'label': '#555',
        'border-color': '#EAEAEA',
        'background': '#F8F9FA',
        'dark-header': '#252525',
        'status-approved-bg': '#e8f5e9',
        'status-approved-text': '#2e7d32',
        'status-rejected-bg': '#ffebee',
        'status-rejected-text': '#c62828',
      },
      fontFamily: {
        // Set Inter as the default sans-serif font
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 8px 25px rgba(0, 0, 0, 0.07)',
      },
      // Define the custom animations from the original CSS
      keyframes: {
        sparkle: {
          '0%, 100%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.5)', opacity: '1' },
        },
        radiate: {
          '0%': { transform: 'translate(-50%, -50%) scale(0.1)', opacity: '1' },
          '80%': { transform: 'translate(-50%, -50%) scale(1.5)', opacity: '0' },
          '100%': { opacity: '0' },
        }
      },
      animation: {
        sparkle: 'sparkle 2s infinite',
        radiate: 'radiate 2.5s infinite ease-out',
      }
    },
  },
  plugins: [],
}