/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#000000',
          soft: '#0e0e11',
          card: '#0a0a0c',
          hover: '#141418',
        },
        ultra: {
          DEFAULT: '#1a2fd4',
          deep: '#1021a0',
          light: '#2e43ea',
        },
        ember: {
          DEFAULT: '#ff5a2c',
          soft: '#ffe2d8',
          deep: '#c93208',
        },
        ice: {
          DEFAULT: '#d4d4d8',
          dim: 'rgba(212, 212, 216, 0.7)',
          faint: 'rgba(255, 255, 255, 0.08)',
        },
        mint: {
          DEFAULT: '#1fa98a',
          soft: '#d3f1e8',
          deep: '#0e7560',
        },
        line: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          bright: 'rgba(255, 255, 255, 0.18)',
        },
        slate: {
          DEFAULT: '#52525b',
          dim: '#71717a',
        },
        bone: '#fafafa',
      },
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'pill': '0 8px 30px rgba(0, 0, 0, 0.85)',
        'card': '0 12px 36px rgba(0, 0, 0, 0.95)',
        'glow-ultra': '0 0 30px rgba(26, 47, 212, 0.25)',
        'glow-ember': '0 0 25px rgba(255, 90, 44, 0.25)',
      }
    },
  },
  plugins: [],
}
