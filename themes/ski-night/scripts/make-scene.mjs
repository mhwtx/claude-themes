// Night ski mountain scene. Writes <out>.ts (export SCENE) and <out>.preview.svg.
import { writeFileSync } from 'node:fs'

const out = process.argv[2]

let seed = 23
const rand = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const r = (a, b) => a + rand() * (b - a)
const f = n => Math.round(n * 10) / 10
const lerp = (a, b, t) => a + (b - a) * t

// ---------- geometry helpers
const catmull = (pts, per = 8) => {
  const o = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t
      o.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  o.push(pts[pts.length - 1])
  return o
}
const normals = pts => pts.map((p, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
  return [-dy / l, dx / l]
})
const offsetLine = (pts, ns, widthAt, k) => pts.map((p, i) => {
  const w = widthAt(i / (pts.length - 1)) * k
  return [p[0] + ns[i][0] * w, p[1] + ns[i][1] * w]
})
const poly = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p[0])} ${Math.round(p[1])}`).join('')
const distToPolyline = (x, y, pts) => {
  let best = Infinity, bi = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
    if (d < best) { best = d; bi = (i + t) / (pts.length - 1) }
  }
  return [best, bi]
}

// ---------- mountain outline
const ridge = [
  [-60, 770], [80, 720], [190, 660], [290, 610], [360, 575], [420, 548], [470, 520], [520, 505],
  [565, 470], [610, 440], [660, 400], [705, 360], [745, 318], [790, 276], [822, 248], [846, 262],
  [868, 284], [900, 300], [940, 322], [985, 330], [1030, 352], [1090, 388], [1160, 414], [1230, 446],
  [1310, 486], [1400, 528], [1490, 572], [1580, 612], [1680, 650],
]
const surfaceY = x => {
  for (let i = 0; i < ridge.length - 1; i++) {
    if (x >= ridge[i][0] && x <= ridge[i + 1][0]) {
      return lerp(ridge[i][1], ridge[i + 1][1], (x - ridge[i][0]) / (ridge[i + 1][0] - ridge[i][0]))
    }
  }
  return 800
}
const mountainD = `${poly(ridge)}L1680 1000L-60 1000Z`

// forest line: dense forest below it
const forestPts = []
for (let x = -60; x <= 1680; x += 20) forestPts.push([x, Math.max(surfaceY(x) + 58 + r(-10, 10), 500 + r(-6, 6))])
const jag = []
for (let x = -60; x <= 1680; x += 5) {
  const i = Math.max(0, Math.min(forestPts.length - 2, Math.floor((x + 60) / 20)))
  const y = lerp(forestPts[i][1], forestPts[i + 1][1], (x + 60 - i * 20) / 20)
  jag.push([x, y + ((x / 5) % 2 ? -r(3, 9) : r(0, 3))])
}
const forestY = x => {
  const i = Math.max(0, Math.min(forestPts.length - 2, Math.floor((x + 60) / 20)))
  return lerp(forestPts[i][1], forestPts[i + 1][1], (x - forestPts[i][0]) / 20)
}
const forestD = poly(jag) + 'L1680 1000L-60 1000Z'
// moon is to the right: the west face, left of a spur running down from the peak, is in shadow
const shadeD = `M822 248${poly(ridge.filter(p => p[0] < 822).reverse()).replace('M', 'L')}L-60 1000L700 1000L742 760L770 600L790 470L805 360Z`

// far range
const far = [[-60, 600]]
for (let x = -60; x <= 1680; x += 40) far.push([x, 470 + Math.sin(x / 130) * 50 + Math.sin(x / 47) * 22 + r(-18, 18)])
far.push([1680, 1000], [-60, 1000])
const farD = poly(far) + 'Z'

// ---------- runs (groomers)
const runs = [
  { name: 'A', lit: true, pts: [[888, 338], [830, 372], [800, 420], [832, 470], [778, 548], [826, 630], [764, 720], [810, 800], [770, 870], [760, 918]], w0: 12, w1: 44 },
  { name: 'B', lit: false, pts: [[912, 338], [960, 400], [1040, 470], [1010, 560], [1100, 650], [1060, 740], [1130, 830], [1100, 880], [1050, 918]], w0: 12, w1: 40 },
  { name: 'C', lit: true, pts: [[482, 528], [440, 600], [492, 670], [418, 750], [470, 830], [500, 880], [520, 918]], w0: 12, w1: 38 },
  { name: 'T1', lit: false, pts: [[882, 336], [800, 368], [700, 410], [610, 460], [530, 505], [486, 526]], w0: 8, w1: 9, track: true },
]
let runFill = '', cord = '', pools = '', lamps = ''
for (const run of runs) {
  run.c = catmull(run.pts)
  run.n = normals(run.c)
  run.w = t => lerp(run.w0, run.w1, t)
  const L = offsetLine(run.c, run.n, run.w, 0.5)
  const R = offsetLine(run.c, run.n, run.w, -0.5)
  runFill += `<path d="${poly(L)}${poly(R.reverse()).replace('M', 'L')}Z"/>`
  for (const k of run.track ? [0] : [-0.28, 0, 0.28]) cord += `<path d="${poly(offsetLine(run.c, run.n, run.w, k))}"/>`
  if (run.lit) {
    for (let i = 4; i < run.c.length - 1; i += 6) {
      const t = i / (run.c.length - 1)
      for (const side of [0.62, -0.62]) {
        const w = run.w(t) * side
        const x = run.c[i][0] + run.n[i][0] * w, y = run.c[i][1] + run.n[i][1] * w
        const s = lerp(0.6, 1.3, t)
        pools += `<ellipse cx="${f(x - side * 6 * s)}" cy="${f(y + 2 * s)}" rx="${f(16 * s)}" ry="${f(7 * s)}"/>`
        lamps += `<rect x="${f(x - 0.5)}" y="${f(y - 9 * s)}" width="1" height="${f(9 * s)}" fill="#0a0f1a"/><circle cx="${f(x)}" cy="${f(y - 9 * s)}" r="${f(1.4 * s)}"/>`
      }
    }
  }
}

// ---------- lifts
const lifts = [
  { a: [730, 872], b: [900, 330], n: 16 },
  { a: [556, 868], b: [478, 520], n: 12 },
]
let cables = '', towers = '', stations = '', chairs = ''
let chairCss = ''
for (const [li, lift] of lifts.entries()) {
  const [ax, ay] = lift.a, [bx, by] = lift.b
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy)
  const nx = -dy / l, ny = dx / l
  const up = [[ax + nx * 3, ay + ny * 3], [bx + nx * 3, by + ny * 3]]
  const dn = [[ax - nx * 3, ay - ny * 3], [bx - nx * 3, by - ny * 3]]
  lift.up = up; lift.dn = dn
  cables += `<path d="M${f(up[0][0])} ${f(up[0][1])}L${f(up[1][0])} ${f(up[1][1])}M${f(dn[0][0])} ${f(dn[0][1])}L${f(dn[1][0])} ${f(dn[1][1])}"/>`
  for (let t = 0.1; t < 0.95; t += 0.13) {
    const x = lerp(ax, bx, t), y = lerp(ay, by, t)
    const h = lerp(26, 14, t)
    towers += `<rect x="${f(x - 0.8)}" y="${f(y - 2)}" width="1.6" height="${f(h)}"/><rect x="${f(x - 5)}" y="${f(y - 2.5)}" width="10" height="1.4"/>`
  }
  stations += `<path d="M${ax - 16} ${ay + 6}V${ay - 6}L${ax} ${ay - 14}L${ax + 16} ${ay - 6}V${ay + 6}Z"/><path d="M${bx - 10} ${by + 6}V${by - 4}L${bx} ${by - 10}L${bx + 10} ${by - 4}V${by + 6}Z"/>`
  stations += `<rect class="win" x="${ax - 8}" y="${ay - 3}" width="5" height="4"/><rect class="win" x="${ax + 3}" y="${ay - 3}" width="5" height="4"/><rect class="win" x="${bx - 3}" y="${by - 2}" width="6" height="3.5"/>`
  const dur = 70
  for (const [dir, line] of [['u', up], ['d', dn]]) {
    const from = dir === 'u' ? line[0] : line[1]
    const to = dir === 'u' ? line[1] : line[0]
    const name = `ride${li}${dir}`
    chairCss += `@keyframes ${name}{from{transform:translate(${f(from[0])}px,${f(from[1])}px)}to{transform:translate(${f(to[0])}px,${f(to[1])}px)}}`
    for (let i = 0; i < lift.n; i++) {
      const rider = dir === 'u' && rand() < 0.7
      const col = ['#e04848', '#f2c23a', '#3fb6c9', '#e7e9ee', '#9b6cf0'][Math.floor(rand() * 5)]
      chairs += `<g style="animation:${name} ${dur}s linear infinite;animation-delay:-${f((i / lift.n) * dur)}s"><path d="M0 0V6M-3 6H3M-3 6V3.5" stroke="#0a0f1a" stroke-width="1" fill="none"/>${rider ? `<circle cx="0" cy="3.4" r="1.6" fill="${col}"/>` : ''}</g>`
    }
  }
}

// ---------- base snowfield (runout where every run ends)
const apronTop = x => {
  const t = (x - 400) / 780 // 400..1180
  return 936 - Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 70 + Math.sin(x / 23) * 3
}
const apronPts = []
for (let x = 400; x <= 1180; x += 6) apronPts.push([x, apronTop(x) + ((x / 6) % 2 ? -r(2, 6) : r(0, 2))])
const apronD = poly(apronPts) + 'L1180 940L400 940Z'

// ---------- trees
const glades = [
  [870, 1000, 560, 830], // between runs A and B: tree run
  [560, 700, 600, 800], // left glade
  [1180, 1320, 560, 760], // right glade
]
// glades (tree runs): ragged strips through thinned forest; each leaves a groomer and rejoins one
const at = (name, t) => { const run = runs.find(x => x.name === name); return run.c[Math.round(t * (run.c.length - 1))] }
const gladeLines = [
  { name: 'G1', pts: [at('B', 0.3), [990, 570], [935, 650], [880, 730], at('A', 0.86)], w0: 18, w1: 34 },
  { name: 'G2', pts: [at('A', 0.42), [720, 580], [650, 660], [580, 750], at('C', 0.82)], w0: 18, w1: 32 },
  { name: 'G3', pts: [at('B', 0.47), [1160, 620], [1240, 700], [1235, 790], at('B', 0.9)], w0: 18, w1: 32 },
]
let gladeD = ''
for (const gl of gladeLines) {
  gl.c = catmull(gl.pts, 10)
  gl.n = normals(gl.c)
  gl.w = t => lerp(gl.w0, gl.w1, t)
  const jitter = gl.c.map(() => [r(0.32, 0.6), r(0.32, 0.6)])
  const L = gl.c.map((p, i) => { const w = gl.w(i / (gl.c.length - 1)) * jitter[i][0]; return [p[0] + gl.n[i][0] * w, p[1] + gl.n[i][1] * w] })
  const Rr = gl.c.map((p, i) => { const w = gl.w(i / (gl.c.length - 1)) * jitter[i][1]; return [p[0] - gl.n[i][0] * w, p[1] - gl.n[i][1] * w] })
  gladeD += poly(L) + poly(Rr.reverse()).replace('M', 'L') + 'Z'
}
const gladeBlobs = `<path d="${gladeD}"/>`
const inGladeC = (x, y) => gladeLines.some(gl => { const [d, t] = distToPolyline(x, y, gl.c); return d < gl.w(t) * 0.62 })
const inGlade = (x, y) => glades.some(([x0, x1, y0, y1]) => x > x0 && x < x1 && y > y0 && y < y1)
const treesArr = []
for (let i = 0; i < 9000 && treesArr.length < 975; i++) {
  const x = r(-60, 1660)
  const y = r(500, 912)
  const h = Math.round(lerp(8, 24, (y - 500) / 412) * r(0.8, 1.2))
  if (y < surfaceY(x) + 16) continue
  if (y < forestY(x) - 6 && rand() > 0.06) continue
  if (x > 396 && x < 1184 && y > apronTop(x) - 6) continue // base snowfield
  let bad = false
  for (const run of runs) {
    for (const yy of [y, y - h * 0.5, y - h]) {
      const [d, t] = distToPolyline(x, yy, run.c)
      if (d < run.w(t) / 2 + h * 0.25 + 1) { bad = true; break }
    }
    if (bad) break
  }
  if (bad) continue
  for (const lift of lifts) {
    if (Math.min(distToPolyline(x, y, [lift.a, lift.b])[0], distToPolyline(x, y - h, [lift.a, lift.b])[0]) < 8) { bad = true; break }
  }
  if (bad) continue
  if (inGladeC(x, y) && rand() > 0.6) continue
  treesArr.push([x, y, h])
}
// trees standing in the tree runs, spaced so skiers could weave between them
for (const gl of gladeLines) {
  for (let k = 0; k < 24; k++) {
    const t = r(0.08, 0.95)
    const i = Math.round(t * (gl.c.length - 1))
    const off = r(-0.42, 0.42) * gl.w(t)
    const x = gl.c[i][0] + gl.n[i][0] * off, y = gl.c[i][1] + gl.n[i][1] * off
    treesArr.push([x, y, Math.round(lerp(8, 24, (y - 500) / 412) * r(0.7, 1))])
  }
}
treesArr.sort((a, b) => a[1] - b[1])
let treeD = '', tipD = ''
const g = Math.round
for (const [x, y, h] of treesArr) {
  const w = h * 0.46
  const R = Math.round
  treeD += `M${R(x)} ${R(y - h)}l${R(w * 0.36)} ${R(h * 0.5)}h${R(-w * 0.16)}l${R(w * 0.3)} ${R(h * 0.5)}h${-2 * R(w * 0.5)}l${R(w * 0.3)} ${-R(h * 0.5)}h${R(-w * 0.16)}z`
  if (rand() < 0.3) tipD += `M${R(x)} ${R(y - h)}l${R(w * 0.24) || 1} ${R(h * 0.34)}h${-(R(w * 0.2) || 1)}z`
}

// ---------- skiers
const skierShape = col => `<path d="M-5 0.3L5 1.1" stroke="#1a2236" stroke-width="1"/><path d="M-1.6 -1L0.2 -4.6L1.6 -1" stroke="#1a2236" stroke-width="1.1" fill="none"/><path d="M-1.4 -4.4L1.6 -4.8L1.1 -8L-1 -7.7Z" fill="${col}"/><circle cx="0.2" cy="-9.3" r="1.4" fill="#f1d6c4"/><path d="M-2.6 -5.6L-4.6 0M2.4 -5.8L4.8 -0.4" stroke="#4a5470" stroke-width=".5"/>`
let skiers = '', skierCss = ''
const skierPlan = [
  ['A', 0, 26, '#e04848'], ['A', 0.4, 30, '#f2c23a'], ['A', 0.75, 24, '#3fb6c9'],
  ['B', 0.2, 32, '#9b6cf0'], ['B', 0.65, 28, '#ff8a3d'],
  ['C', 0.1, 24, '#3fdc8f'], ['C', 0.55, 27, '#e04848'],
  ['T1', 0.3, 30, '#f2c23a'], ['G1', 0.5, 26, '#3fb6c9'], ['G3', 0.2, 28, '#e7e9ee'],
]
for (const [si, [rn, phase, dur, col]] of skierPlan.entries()) {
  const run = runs.find(x => x.name === rn) || gladeLines.find(x => x.name === rn)
  const steps = 24
  let kf = ''
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const i = Math.round(t * (run.c.length - 1))
    const carve = Math.sin(s * 1.6 + si) * 0.3
    const w = run.w(t) * carve
    const x = run.c[i][0] + run.n[i][0] * w
    const y = run.c[i][1] + run.n[i][1] * w
    const sc = lerp(0.65, 1.7, t)
    const flip = Math.cos(s * 1.6 + si) > 0 ? 1 : -1
    const op = s === 0 || s === steps ? 0 : 1
    kf += `${f(t * 100)}%{transform:translate(${f(x)}px,${f(y)}px) scale(${f(sc * flip)},${f(sc)});opacity:${op}}`
  }
  skierCss += `@keyframes sk${si}{${kf}}`
  skiers += `<g style="animation:sk${si} ${dur}s linear infinite;animation-delay:-${f(phase * dur)}s">${skierShape(col)}</g>`
}

// ---------- base village
const R1 = n => Math.round(n * 2) / 2
const ROOF = '#0b101c', SNOWROOF = '#d6e0ef'
let vWalls = '', vRoofs = '', vSnow = '', vWin = '', vDark = '', smoke = '', vExtra = ''
const winRow = (x0, x1, y, w, h, gap, litP = 0.8) => {
  for (let x = x0; x + w <= x1 + 0.1; x += w + gap) {
    if (rand() < litP) vWin += `M${R1(x)} ${R1(y)}h${w}v${h}h${-w}z`
    else vDark += `M${R1(x)} ${R1(y)}h${w}v${h}h${-w}z`
  }
}
const puff = (x, y) => { for (let i = 0; i < 4; i++) smoke += `<circle class="smoke" cx="${x}" cy="${y}" r="3" style="animation-delay:-${f(i * 2 + r(0, 1))}s"/>` }
// a gabled chalet: walls, dark roof, snow on the roof, windows, optional chimney
const chalet = (cx, by, w, h, rh, wall, opts = {}) => {
  const l = cx - w / 2, rr = cx + w / 2, top = by - h
  vWalls += `<path fill="${wall}" d="M${l} ${by}V${top}H${rr}V${by}Z"/>`
  vRoofs += `M${l - 3} ${top + 1}L${cx} ${top - rh}L${rr + 3} ${top + 1}Z`
  vSnow += `M${l - 3} ${top + 1}L${cx} ${top - rh}L${rr + 3} ${top + 1}L${rr} ${top - 1.5}L${cx} ${top - rh + 3}L${l} ${top - 1.5}Z`
  const floors = opts.floors ?? 1
  for (let k = 0; k < floors; k++) winRow(l + 3, rr - 3, top + 4 + k * 9, 3, 4, 3)
  vWin += `M${cx - 1.5} ${top - rh + 6}h3v3h-3z` // gable window
  vDark += `M${cx - 2} ${by - 6}h4v6h-4z` // door
  if (opts.chimney) {
    const chx = cx + w * 0.22
    vRoofs += `M${chx} ${top - rh * 0.45}h4v${-rh * 0.45 - 4}h-4z`
    puff(chx + 2, top - rh * 0.9 - 4)
  }
}
// the big hotel: three floors under a shallow snowy roof, with balconies
const hotel = (x0, x1, by, h, wall) => {
  const top = by - h, cx = (x0 + x1) / 2
  vWalls += `<path fill="${wall}" d="M${x0} ${by}V${top}H${x1}V${by}Z"/>`
  vRoofs += `M${x0 - 4} ${top + 1}L${cx} ${top - 10}L${x1 + 4} ${top + 1}Z`
  vSnow += `M${x0 - 4} ${top + 1}L${cx} ${top - 10}L${x1 + 4} ${top + 1}L${x1} ${top - 1.5}L${cx} ${top - 7}L${x0} ${top - 1.5}Z`
  for (let k = 0; k < 3; k++) {
    winRow(x0 + 4, x1 - 4, top + 5 + k * 10, 4, 5, 3.5, 0.75)
    vExtra += `<rect x="${x0 + 2}" y="${top + 11 + k * 10}" width="${x1 - x0 - 4}" height="1" fill="#2b3550"/>`
  }
  vWin += `M${cx - 6} ${by - 9}h12v9h-12z`
  vRoofs += `M${x1 - 14} ${top - 3}h4v-9h-4z`
  puff(x1 - 12, top - 13)
}
// a row of shops with lit storefronts and striped awnings
const shops = (x0, by, n) => {
  let x = x0
  for (let i = 0; i < n; i++) {
    const w = r(20, 26), h = r(13, 16), top = by - h
    const wall = ['#1b2335', '#202a3e', '#18202f'][i % 3]
    vWalls += `<path fill="${wall}" d="M${R1(x)} ${by}V${R1(top)}H${R1(x + w)}V${by}Z"/>`
    vSnow += `M${R1(x - 1)} ${R1(top)}h${R1(w + 2)}v-2.5h${-R1(w + 2)}z`
    vWin += `M${R1(x + 3)} ${R1(by - 9)}h${R1(w - 6)}v6h${-R1(w - 6)}z`
    const aw = ['#c0392b', '#2e7d5b', '#c9892a', '#3d6fb6'][i % 4]
    for (let k = 0; k < 4; k++) vExtra += `<rect x="${R1(x + 2 + k * (w - 4) / 4)}" y="${R1(by - 12)}" width="${R1((w - 4) / 8)}" height="3" fill="${aw}"/><rect x="${R1(x + 2 + k * (w - 4) / 4 + (w - 4) / 8)}" y="${R1(by - 12)}" width="${R1((w - 4) / 8)}" height="3" fill="#e9e4da"/>`
    x += w + 1
  }
  return x
}
// a little chapel with a steeple
const chapel = (cx, by) => {
  vWalls += `<path fill="#1d2638" d="M${cx - 8} ${by}V${by - 14}H${cx + 8}V${by}Z"/>`
  vRoofs += `M${cx - 10} ${by - 13}L${cx} ${by - 22}L${cx + 10} ${by - 13}Z`
  vSnow += `M${cx - 10} ${by - 13}L${cx} ${by - 22}L${cx + 10} ${by - 13}L${cx + 8} ${by - 15}L${cx} ${by - 19.5}L${cx - 8} ${by - 15}Z`
  vWalls += `<path fill="#1d2638" d="M${cx + 4} ${by - 14}V${by - 30}H${cx + 10}V${by - 14}Z"/>`
  vRoofs += `M${cx + 3} ${by - 30}L${cx + 7} ${by - 44}L${cx + 11} ${by - 30}Z`
  vSnow += `M${cx + 3} ${by - 30}L${cx + 7} ${by - 44}L${cx + 5.4} ${by - 31}Z`
  vWin += `M${cx + 5.5} ${by - 27}h3v4h-3z M${cx - 4} ${by - 10}h2v5h-2z M${cx - 0.5} ${by - 10}h2v5h-2z`
  vExtra += `<circle cx="${cx}" cy="${by - 17}" r="1.6" fill="#ffd68a"/>`
}

hotel(492, 572, 934, 32, '#1a2234')
chalet(592, 932, 26, 15, 13, '#202a3d', { chimney: true })
// (the A-frame lodge is drawn at 646 below)
chalet(708, 931, 24, 14, 12, '#1c2537', { chimney: true })
chalet(738, 934, 20, 12, 10, '#232d41')
const shopsEnd = shops(756, 935, 4)
chapel(shopsEnd + 18, 932)
chalet(shopsEnd + 44, 934, 22, 13, 11, '#1e2739', { chimney: true })
chalet(470, 936, 18, 11, 10, '#202a3d')

const aframe = `<g transform="translate(0 20)">
<path fill="#0d1220" d="M604 912V884L646 846L688 884V912Z"/>
<path fill="${SNOWROOF}" d="M596 888L646 842L696 888L690 890L646 850L602 890Z"/>
<path class="win" d="M646 858L664 876V900H628V876Z"/>
<rect fill="#0d1220" x="645.3" y="860" width="1.4" height="40"/><rect fill="#0d1220" x="628" y="886" width="36" height="1.2"/>
<rect class="win" x="610" y="896" width="10" height="9"/><rect class="win" x="672" y="896" width="10" height="9"/>
<rect fill="#0d1220" x="672" y="850" width="6" height="18"/></g>`
puff(675, 866)

// string lights between rooftops
let strings = ''
const bulbCols = ['#ffe3a3', '#ffe3a3', '#ffb86b', '#ff8a7a', '#a8e0ff', '#b9f0b0']
for (const [x0, y0, x1, y1] of [[572, 904, 604, 900], [688, 900, 708, 917], [720, 917, 756, 921], [shopsEnd, 921, shopsEnd + 34, 909]]) {
  const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 6
  strings += `<path d="M${x0} ${y0}Q${mx} ${my} ${x1} ${y1}" stroke="#0a0f1a" stroke-width=".5" fill="none"/>`
  for (let t = 0.1; t < 0.95; t += 0.16) {
    const bx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1
    const by = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1
    strings += `<circle class="bulb" cx="${f(bx)}" cy="${f(by + 0.8)}" r=".9" fill="${bulbCols[Math.floor(rand() * bulbCols.length)]}" style="animation-delay:-${f(r(0, 3))}s"/>`
  }
}

// lamp posts and their pools of light along the village path
let posts = ''
for (const x of [482, 586, 620, 700, 752, 800, 846, 890]) {
  const by = 944 + r(-1, 1)
  posts += `<ellipse cx="${x}" cy="${f(by)}" rx="14" ry="4" fill="url(#pool)"/><rect x="${x - 0.5}" y="${f(by - 12)}" width="1" height="12" fill="#0a0f1a"/><circle cx="${x}" cy="${f(by - 12.5)}" r="1.6" fill="#fff0cf"/>`
}

// villagers strolling
let folk = ''
const folkCss = []
for (let i = 0; i < 9; i++) {
  const x0 = r(470, 900), dx = r(-40, 40), y = r(938, 948)
  const col = ['#e04848', '#f2c23a', '#3fb6c9', '#9b6cf0', '#ff8a3d', '#3fdc8f', '#e7e9ee'][i % 7]
  folkCss.push(`@keyframes wk${i}{from{transform:translate(${f(x0)}px,${f(y)}px)}to{transform:translate(${f(x0 + dx)}px,${f(y)}px)}}`)
  folk += `<g style="animation:wk${i} ${f(r(14, 26))}s ease-in-out infinite alternate;animation-delay:-${f(r(0, 20))}s"><rect x="-1" y="-5" width="2" height="3.4" rx=".6" fill="${col}"/><rect x="-.8" y="-1.8" width="1.6" height="1.8" fill="#141b2b"/><circle cx="0" cy="-6" r=".95" fill="#f1d6c4"/></g>`
}

// a few small pines between buildings
let vTrees = ''
for (const [x, by, h] of [[460, 940, 22], [582, 934, 16], [722, 936, 14], [shopsEnd + 30, 936, 18], [912, 938, 24], [450, 944, 16]]) {
  const w = h * 0.5
  vTrees += `M${x} ${by - h}l${R1(w * 0.35)} ${R1(h * 0.45)}h${R1(-w * 0.15)}l${R1(w * 0.3)} ${R1(h * 0.55)}h${-R1(w)}l${R1(w * 0.3)} ${-R1(h * 0.55)}h${R1(-w * 0.15)}z`
}

const village = `<ellipse cx="690" cy="932" rx="260" ry="34" fill="url(#warm)" opacity=".8"/>
${vWalls}<path fill="${ROOF}" d="${vRoofs}"/><path fill="${SNOWROOF}" d="${vSnow}"/>
<path class="win" d="${vWin}"/><path fill="#2a3348" d="${vDark}"/>${vExtra}
${aframe}${smoke}${strings}<path fill="#0b1220" d="${vTrees}"/>${posts}${folk}`
const villageCss = folkCss.join('')

// ---------- foreground
const fgGround = `M-60 930Q200 900 420 918Q640 936 860 914Q1080 896 1300 916Q1480 930 1680 908V1000H-60Z`
const bigTree = (x, y, h) => {
  const w = h * 0.42
  let d = ''
  let tiers = 5
  for (let k = 0; k < tiers; k++) {
    const top = y - h + (k * h) / tiers * 0.82
    const bot = top + h * 0.34
    const ww = w * (0.35 + 0.65 * (k + 1) / tiers)
    d += `M${f(x)} ${f(top)}L${f(x + ww / 2)} ${f(bot)}H${f(x - ww / 2)}Z`
  }
  d += `M${f(x - 2)} ${f(y - 4)}H${f(x + 2)}V${f(y + 8)}H${f(x - 2)}Z`
  let snow = ''
  for (let k = 0; k < tiers; k++) {
    const top = y - h + (k * h) / tiers * 0.82
    const bot = top + h * 0.34
    const ww = w * (0.35 + 0.65 * (k + 1) / tiers)
    snow += `M${f(x + ww * 0.08)} ${f(top + h * 0.06)}L${f(x + ww / 2)} ${f(bot)}L${f(x + ww * 0.22)} ${f(bot - h * 0.03)}Z`
  }
  return [d, snow]
}
let fgTreeD = '', fgSnowD = ''
for (const [x, y, h] of [[40, 960, 300], [130, 975, 220], [-20, 990, 360], [1560, 965, 300], [1480, 985, 230], [1640, 990, 340]]) {
  const [d, s] = bigTree(x, y, h)
  fgTreeD += d
  fgSnowD += s
}

// ---------- stars and snowfall
let stars = ''
for (let i = 0; i < 60; i++) {
  stars += `<circle class="star" cx="${f(r(0, 1600))}" cy="${f(r(0, 460))}" r="${f(r(0.5, 1.5))}" style="animation-duration:${f(r(3, 7))}s;animation-delay:-${f(r(0, 7))}s"/>`
}
let snow = ''
for (let i = 0; i < 62; i++) {
  const near = rand() < 0.25
  snow += `<circle class="flake" cx="${f(r(-100, 1700))}" cy="-20" r="${f(near ? r(1.6, 2.6) : r(0.6, 1.3))}" style="--dx:${f(r(-60, 60))}px;animation-duration:${f(near ? r(9, 13) : r(16, 26))}s;animation-delay:-${f(r(0, 26))}s;opacity:${near ? 0.75 : 0.5}"/>`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050913"/><stop offset=".5" stop-color="#0b1427"/><stop offset="1" stop-color="#1a2a48"/></linearGradient>
<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55668a"/><stop offset=".22" stop-color="#2c3a58"/><stop offset="1" stop-color="#141c2e"/></linearGradient>
<linearGradient id="snow" gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="1000"><stop offset="0" stop-color="#c3d0e6"/><stop offset=".45" stop-color="#7d8fb0"/><stop offset="1" stop-color="#3b4a69"/></linearGradient>
<linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="820" y2="0"><stop offset="0" stop-color="#070c19" stop-opacity=".62"/><stop offset="1" stop-color="#070c19" stop-opacity=".38"/></linearGradient><linearGradient id="runfade" gradientUnits="userSpaceOnUse" x1="0" y1="300" x2="0" y2="900"><stop offset="0" stop-color="#eef3fb" stop-opacity=".22"/><stop offset=".35" stop-color="#eef3fb" stop-opacity=".7"/><stop offset="1" stop-color="#eef3fb" stop-opacity=".85"/></linearGradient>
<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a9bba"/><stop offset="1" stop-color="#3c4a68"/></linearGradient>
<radialGradient id="moonglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#dfe8ff" stop-opacity=".35"/><stop offset="1" stop-color="#dfe8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="warm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc77a" stop-opacity=".55"/><stop offset="1" stop-color="#ffc77a" stop-opacity="0"/></radialGradient>
<radialGradient id="pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd59a" stop-opacity=".5"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>
</defs>
<style>
.star{fill:#eef3ff;animation:tw 5s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.2}50%{opacity:1}}
.win{fill:#ffc56e}
.lamp{fill:#fff0cf}
.smoke{fill:#9aa8c2;opacity:0;animation:sm 8s ease-out infinite}
.bulb{animation:bu 3s ease-in-out infinite}
@keyframes bu{0%,100%{opacity:.6}50%{opacity:1}}
${villageCss}
@keyframes sm{0%{transform:translate(0,0) scale(.6);opacity:0}15%{opacity:.35}100%{transform:translate(26px,-70px) scale(2.4);opacity:0}}
.flake{fill:#eef4ff;animation:fall 20s linear infinite}
@keyframes fall{from{transform:translate(0,0)}to{transform:translate(var(--dx),1060px)}}
.skier,.chair{will-change:transform}
${chairCss}
${skierCss}
.land{transition:none}
@media (min-aspect-ratio:9/5){.land{transform:translateY(-50px)}}
@media (min-aspect-ratio:2/1){.land{transform:translateY(-110px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.flake{display:none}}
</style>
<rect width="1600" height="1000" fill="url(#sky)"/>
<g>${stars}</g>
<circle cx="1250" cy="160" r="120" fill="url(#moonglow)"/>
<circle cx="1250" cy="160" r="26" fill="#eef2fb"/>
<circle cx="1242" cy="152" r="5" fill="#d3dbea" opacity=".6"/><circle cx="1258" cy="170" r="3.5" fill="#d3dbea" opacity=".6"/>
<g class="land">
<path d="${farD}" fill="url(#far)"/>
<path d="${mountainD}" fill="url(#snow)"/>
<path d="${forestD}" fill="#0e1628" opacity=".82"/>
<g fill="url(#runfade)" opacity=".78">${gladeBlobs}</g>
<path d="${apronD}" fill="url(#runfade)"/><ellipse cx="760" cy="905" rx="300" ry="34" fill="url(#pool)" opacity=".7"/>
<g fill="url(#runfade)">${runFill}</g>
<path d="${shadeD}" fill="url(#shade)"/>
<g fill="none" stroke="#ffffff" stroke-width=".5" opacity=".25">${cord}</g>
<g fill="url(#pool)">${pools}</g>
<path d="${treeD}" fill="#0b1220"/>
<path d="${tipD}" fill="#9fb0cc" opacity=".55"/>
<g fill="#0a0f1a">${stations}</g>
<g stroke="#0a0f1a" stroke-width=".8" fill="none">${cables}</g>
<g fill="#0a0f1a">${towers}</g>
${chairs}
<g class="lamp">${lamps}</g>
${skiers}
<path d="${fgGround}" fill="url(#fg)"/>
<g transform="translate(690 942) scale(1.3) translate(-690 -942)">${village}</g>
<path d="${fgTreeD}" fill="#070c17"/>
<path d="${fgSnowD}" fill="#a8b8d4" opacity=".7"/>
</g>
<g>${snow}</g>
</svg>`

const compact = svg.replace(/\n\s*/g, '')
if (compact.length > 131072) throw new Error(`scene is ${compact.length} chars`)
writeFileSync(out, `// Generated: a ski mountain at night.\nexport const SCENE = ${JSON.stringify(compact)}\n`)
writeFileSync(out.replace(/\.ts$/, '.preview.svg'), compact)
console.log('scene chars:', compact.length, 'trees:', treesArr.length)
