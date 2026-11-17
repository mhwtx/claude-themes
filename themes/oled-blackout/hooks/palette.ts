import { makeColors } from './make-colors.js'

// Lights out: a true #000 page so OLED pixels switch off, near-black cards a hair above it,
// soft white text, and vivid accents that stand out against the black.
export const { theme, problems } = makeColors({
  label: 'OLED Blackout',
  id: 'oled-blackout',
  only: 'dark',
  roles: { accent: '#5aa2ff', danger: '#ff5c5c', success: '#3ddc84', warning: '#ffb84d', pro: '#b18cff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#000000',
        'surface-1': '#0a0a0a',
        'surface-2': '#111111',
        'surface-3': '#161616',
        'text-primary': '#f2f2f2',
        'text-secondary': '#c4c4c4',
        'text-muted': '#9a9a9a',
      },
    },
  },
})
