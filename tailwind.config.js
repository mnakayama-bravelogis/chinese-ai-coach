/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary': '#6366f1',
                'secondary': '#a855f7',
                'dark': '#0f172a',
            },
            backgroundImage: {
                'gradient-premium': 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            }
        },
    },
    plugins: [],
}
