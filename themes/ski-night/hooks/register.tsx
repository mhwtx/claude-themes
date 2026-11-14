import type { Register, ThemeSetArgs } from 'claude-code'

import { problems, theme } from './palette'
import { SCENE } from './scene'

const LOOK: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: { scene: 'ski-night', glass: { blur: 18, tint: '#0d1220', opacity: 0.68 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== 'ski-night') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="A ski mountain at night under a full moon: lit groomers and tree runs through the forest, two chairlifts running, skiers carving down, and a small village glowing at the base while snow falls"
        isInteractive
      />
    )
  })
}
