/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        leo: {
          void: '#05010a',    // The deepest black for backgrounds
          primary: '#673AB7', // Leonardo Purple
          indigo: '#3F51B5',  // Deep Indigo
          blue: '#03A9F4',    // Bright Blue
          cyan: '#00BCD4',    // Electric Cyan
          teal: '#009688',    // Muted Teal
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'leo-gradient': 'linear-gradient(to right, #673AB7, #3F51B5, #00BCD4)',
      }
    },
  },
  plugins: [],
}
