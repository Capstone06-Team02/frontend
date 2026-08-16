/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // src/index.css의 색상 토큰. 값은 그쪽에서만 바뀐다.
      colors: {
        page: "var(--voisk-page)",
        surface: "var(--voisk-surface)",
        line: "var(--voisk-line)",
        ink: "var(--voisk-ink)",
        muted: "var(--voisk-muted)",
        accent: "var(--voisk-accent)",
        focusring: "var(--voisk-focus)",
        strong: "var(--voisk-strong)",
        "on-strong": "var(--voisk-on-strong)",
      },
    },
  },
  plugins: [],
}
