# claude-themes

Custom themes for the Claude desktop and mobile apps. Each theme is a small mod that sets the app's colors and draws a live, animated scene behind the conversation.

Themes draw in the desktop and mobile apps. The terminal and editor extensions don't draw themes.

## Themes

| Theme | What it looks like |
| --- | --- |
| [`ski-night`](themes/ski-night) | A moonlit ski mountain at night: lit groomers and tree runs through the forest, two chairlifts running, skiers carving down, and a little base village glowing at the bottom while snow falls. Dark mode, with glacier-blue accents. |

## Install

Swap `ski-night` for whichever theme you want.

At the prompt of a Claude Code terminal session:

```
/plugin install ski-night --marketplace mhwtx/claude-themes
```

Answer `y` to add the marketplace, then pick a scope (the user scope applies it everywhere).

From a shell:

```bash
claude plugin install ski-night --marketplace mhwtx/claude-themes
```

In the desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `mhwtx/claude-themes`, then **Add plugin**.

## Repository layout

```
.claude-plugin/marketplace.json   lists every theme in this repo
themes/<name>/
  .claude-plugin/plugin.json      the theme's name and description
  hooks/hooks.json                points at the hooks module
  hooks/register.tsx              sets the colors and draws the scene
  hooks/palette.ts                the theme's colors
  hooks/scene.ts                  the generated scene (an SVG string)
  scripts/                        tools for regenerating the scene, if any
```

## Adding a theme

1. Make a folder under `themes/` with the same layout as `ski-night`.
2. Add an entry for it to `.claude-plugin/marketplace.json` with `"source": "./themes/<name>"`.
3. Check it with `claude plugin validate themes/<name>`.

## Editing the ski-night scene

The scene is generated, not hand-written. Change `themes/ski-night/scripts/make-scene.mjs`, then run:

```bash
node themes/ski-night/scripts/make-scene.mjs themes/ski-night/hooks/scene.ts
```

That rewrites `scene.ts` and writes `scene.preview.svg` beside it, which you can open in a browser to check the result (it's git-ignored). The script refuses to write a scene over the app's 131,072-character limit.

## License

MIT. See [LICENSE](LICENSE).
