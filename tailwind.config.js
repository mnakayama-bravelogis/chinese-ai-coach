/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'freesia': '#EFC081',
                'scarlet': '#BC0A0F',
                'gold': '#AF9F30',
                'ivory': '#EFEEE9',
                'dark': '#1a1a1a',
            },
            backgroundImage: {
                'gradient-premium': 'linear-gradient(135deg, #BC0A0F 0%, #AF9F30 100%)',
            }
        },
    },
    plugins: [],
}
