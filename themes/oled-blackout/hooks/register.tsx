import type { Register, ThemeSetArgs } from 'claude-code'

import { problems, theme } from './palette'

// No scene: a still, pure-black ground behind the chat. Current engines take a
// top-level `overrideColorScheme`; older ones refuse it, so fall back without it.
const LOOKS = [
  { colors: theme, overrideColorScheme: 'dark', backdrop: { color: '#000000' } },
  { colors: theme, backdrop: { color: '#000000' } },
] as unknown as ThemeSetArgs[]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    let lastError: unknown

    for (const look of LOOKS) {
      try {
        // `isDrawn` is often false here only because the app attaches after
        // session start; the theme stands and draws once it does, so say nothing.
        await $.theme.set(look)
        lastError = undefined
        break
      } catch (error) {
        // Some engines, such as a terminal's, have no `$.theme` at all, and
        // terminals draw no theme anyway: stay quiet there.
        if (error instanceof TypeError) {
          return next(e)
        }
        lastError = error
      }
    }
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    if (lastError !== undefined) {
      $.ui.toast(`OLED Blackout couldn't apply: ${String(lastError)}`)
    }

    return next(e)
  })
}
