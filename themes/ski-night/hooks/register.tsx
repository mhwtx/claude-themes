import type { Register, ThemeSetArgs } from 'claude-code'

import { problems, theme } from './palette'
import { SCENE } from './scene'

const NAME = 'ski-night'
const GLASS = { blur: 18, tint: '#0d1220', opacity: 0.68 }

// Engine versions name the backdrop differently: some take `backdrop.id`,
// others `backdrop.scene`. Try one shape and fall back to the other.
const LOOKS = [
  { colors: theme, backdrop: { id: NAME, glass: GLASS, colorScheme: 'dark' } },
  { colors: theme, backdrop: { scene: NAME, glass: GLASS } },
] as unknown as ThemeSetArgs[]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
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
        lastError = error
      }
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
