/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/static/**/*.{html,js}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  }
};