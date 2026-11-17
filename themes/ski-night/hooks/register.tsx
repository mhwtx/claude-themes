import type { Register, ThemeSetArgs } from 'claude-code'

import { problems, theme } from './palette'
import { SCENE } from './scene'

const NAME = 'ski-night'
// Light frost: the desktop app lays its panels over nearly the whole window,
// so heavy glass turns the mountain into a flat navy.
const GLASS = { blur: 4, tint: '#0d1220', opacity: 0.4 }

// Engine versions name the backdrop differently: current ones take
// `backdrop.scene` and a top-level `overrideColorScheme`, older ones
// `backdrop.id` with `colorScheme` inside. Try each shape in turn.
const LOOKS = [
  { colors: theme, overrideColorScheme: 'dark', backdrop: { scene: NAME, glass: GLASS } },
  { colors: theme, backdrop: { id: NAME, glass: GLASS, colorScheme: 'dark' } },
  { colors: theme, backdrop: { scene: NAME, glass: GLASS } },
] as unknown as ThemeSetArgs[]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    let lastError: unknown

    for (const look of LOOKS) {
      try {
        const set = await $.theme.set(look)

        if (!set.isDrawn) {
          $.ui.status(set.reason)
        }
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
      $.ui.toast(`Ski Night couldn't apply: ${String(lastError)}`)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const props = e.props as unknown as { id?: string; scene?: string }

    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || (props.id ?? props.scene) !== NAME) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="A ski hill at night under a full moon: wide runs fanning down a forested ridge, a tree run, two chairlifts running, skiers carving down, and a small village glowing at the base while snow falls"
        isInteractive
      />
    )
  })
}
