import { makeColors } from './make-colors.js'

// Night on the mountain: moonlit navy surfaces, glacier blue, evergreen, lodge-light amber, patrol red.
export const { theme, problems } = makeColors({
  label: 'Ski Night',
  id: 'ski-night',
  only: 'dark',
  roles: { accent: '#4b9be0', danger: '#e04848', success: '#3fae78', warning: '#f0b04a', pro: '#9b84e6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0d1220',
        'surface-1': '#131a2a',
        'surface-2': '#192133',
        'surface-3': '#1e273a',
        'text-primary': '#eef3fa',
        'text-secondary': '#c6d0de',
        'text-muted': '#9eabbd',
      },
    },
  },
})
