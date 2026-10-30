import Phaser from 'phaser'
import { gameIsCovered } from './game-interaction'
import {
  BUILDINGS,
  ENEMY_COLORS,
  ENTRANCES,
  FIELD,
  GRID,
  HOME,
  ROCKS,
  SITES,
  cellAt,
  canPlace,
  rangeOf,
  stepDefense,
  type Building,
  type DefenseState,
  type Enemy,
  type BuildKind,
} from './tower-defense-engine'

type Ink = Phaser.GameObjects.Graphics

// Code-drawn shapes only: no sprites, textures, or per-enemy display objects.
function drawBuilding(ink: Ink, b: Building) {
  const { x, y } = SITES[b.cell],
    color = BUILDINGS[b.kind].color
  ink.fillStyle(0x567667, 0.2).fillEllipse(x, y + 17, 37, 10)
  if (b.kind === 'wall') {
    ink.fillStyle(0xb98171).fillRoundedRect(x - 18, y - 13, 36, 31, 7)
    ink.fillStyle(0xe7b59f).fillRoundedRect(x - 18, y - 18, 36, 30, 7)
    ink.lineStyle(1, 0xc9937f).strokeRoundedRect(x - 18, y - 18, 36, 30, 7)
    ink
      .lineStyle(2, 0xf9dac5)
      .lineBetween(x - 13, y - 5, x + 13, y - 5)
      .lineBetween(x, y - 15, x, y - 5)
      .lineBetween(x - 8, y - 5, x - 8, y + 9)
      .lineBetween(x + 8, y - 5, x + 8, y + 9)
    ink.lineStyle(2, 0xffedd9).lineBetween(x - 13, y - 14, x - 5, y - 14)
    return
  }
  ink.fillStyle(0x91ac98).fillEllipse(x, y + 9, 37, 20)
  ink.lineStyle(1, 0x6c9180).strokeEllipse(x, y + 9, 37, 20)
  ink.fillStyle(0xe1e2c3).fillEllipse(x, y + 5, 37, 19)
  ink.lineStyle(1, 0xb2bd9e).strokeEllipse(x, y + 5, 37, 19)
  ink
    .fillStyle(0xfff7dc)
    .fillCircle(x - 14, y + 5, 1.7)
    .fillCircle(x + 14, y + 5, 1.7)
  if (b.kind === 'shell') {
    for (let i = 0; i < 5; i++) {
      ink.fillStyle(0xbc9879).fillEllipse(x + (i - 2) * 5, y - 4 + Math.abs(i - 2) * 2, 12, 24)
      ink.fillStyle(0xf3d1aa).fillEllipse(x + (i - 2) * 5, y - 5 + Math.abs(i - 2) * 2, 10, 22)
    }
    ink
      .lineStyle(1, 0xd3ab84)
      .lineBetween(x - 12, y - 9, x, y + 7)
      .lineBetween(x, y - 17, x, y + 7)
      .lineBetween(x + 12, y - 9, x, y + 7)
  } else if (b.kind === 'jelly') {
    for (let i = 0; i < 4; i++)
      ink.lineStyle(2.5, 0xa7a0ca).lineBetween(x - 10 + i * 7, y - 1, x - 12 + i * 8, y + 9)
    ink.fillStyle(0x9a91ba).fillEllipse(x, y - 9, 35, 26)
    ink.fillStyle(0xcbc3ed).fillEllipse(x, y - 10, 33, 24)
    ink.fillStyle(0xece7fc).fillEllipse(x - 7, y - 16, 11, 5)
    ink.fillStyle(0x93b9c3).fillCircle(x, y, 9)
    ink.fillStyle(0xd7edf0).fillCircle(x, y - 1, 7)
    ink.fillStyle(0xffffff, 0.85).fillCircle(x - 2, y - 4, 2.5)
    if (b.flash > 0)
      ink
        .lineStyle(2, 0xe8e5ff, b.flash / 0.15)
        .strokeCircle(x, y - 1, 10 + (1 - b.flash / 0.15) * 12)
  } else {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      ink
        .lineStyle(2.5, 0xbba067)
        .lineBetween(
          x + Math.cos(a) * 12,
          y - 3 + Math.sin(a) * 12,
          x + Math.cos(a) * 19,
          y - 3 + Math.sin(a) * 19,
        )
    }
    ink.fillStyle(0xc2a15e).fillCircle(x, y - 3, 16)
    ink.fillStyle(0xf1d48c).fillCircle(x, y - 4, 15)
    ink.fillStyle(0xf6e6b8).fillEllipse(x, y + 2, 18, 11)
  }
  if (b.kind !== 'jelly') {
    const a = b.aim,
      c = Math.cos(a),
      sn = Math.sin(a),
      length = 21 - b.flash * 19
    for (const offset of b.kind === 'puffer' ? [-4.3, 4.3] : [0]) {
      const bx = x - sn * offset,
        by = y - 4 + c * offset,
        tx = bx + c * length,
        ty = by + sn * length
      ink.lineStyle(10, 0x567f72).lineBetween(bx, by + 2, tx, ty + 2)
      ink.lineStyle(7, 0x8db9a6).lineBetween(bx, by, tx, ty)
      ink.fillStyle(0xd9eee0).fillCircle(tx, ty, 3.6)
      ink.fillStyle(0x50786c).fillCircle(tx, ty, 2)
      if (b.flash > 0.08)
        ink.fillStyle(0xfff3ba, (b.flash - 0.08) / 0.07).fillCircle(tx + c * 5, ty + sn * 5, 4)
    }
    ink.fillStyle(b.kind === 'shell' ? 0xe9c580 : color).fillCircle(x, y - 4, 8)
    ink.lineStyle(1, 0xb69860).strokeCircle(x, y - 4, 8)
    ink.fillStyle(0xfff3c9, 0.8).fillCircle(x - 2, y - 7, 2)
  }
  for (let i = 0; i < b.level; i++)
    ink.fillStyle(0xa98b57).fillCircle(x - (b.level - 1) * 3 + i * 6, y + 17, 1.7)
}

function drawEnemy(ink: Ink, e: Enemy, elapsed: number) {
  const size = e.kind === 'boss' ? 22 : e.kind === 'swift' ? 12 : 15
  const bounce = Math.sin(elapsed * 9 + e.id * 0.8),
    x = e.x,
    y = e.y - bounce * 1.2
  const color = ENEMY_COLORS[e.kind],
    width = size * (1 + bounce * 0.035),
    height = size * (0.88 - bounce * 0.035)
  ink.fillStyle(0x60765d, 0.12).fillEllipse(x, e.y + size * 0.78, size * 1.65, 5)
  if (e.kind === 'swift') {
    ink.fillStyle(color).fillTriangle(x - 6, y + 7, x - 9, y + size + 5, x + 6, y + 10)
  } else {
    ink
      .fillStyle(color)
      .fillCircle(x - size * 0.85, y + 3, 4)
      .fillCircle(x + size * 0.85, y + 3, 4)
    ink.fillEllipse(x - 6, y + height - 1, 9, 5).fillEllipse(x + 6, y + height - 1, 9, 5)
  }
  ink.fillStyle(color).fillEllipse(x, y, width * 2, height * 2)
  ink
    .fillStyle(0xfff9ed, 0.4)
    .fillEllipse(x - width * 0.3, y - height * 0.4, width * 0.55, height * 0.35)
  if (e.kind === 'armored') {
    ink.fillStyle(0x9e97bf).fillRoundedRect(x - width, y - height, width * 2, height * 0.85, 6)
    ink.lineStyle(1, 0xe0d8ef).lineBetween(x - 7, y - height + 4, x + 7, y - height + 4)
  }
  if (e.kind === 'boss') {
    ink.fillStyle(0xe8c879).fillTriangle(x - 12, y - 17, x - 14, y - 29, x, y - 19)
    ink
      .fillTriangle(x + 12, y - 17, x + 14, y - 29, x, y - 19)
      .fillTriangle(x - 7, y - 18, x, y - 32, x + 7, y - 18)
    ink.fillRoundedRect(x - 12, y - 21, 24, 6, 2)
  }
  ink
    .fillStyle(0x605f58)
    .fillCircle(x - size * 0.28, y, 1.5)
    .fillCircle(x + size * 0.28, y, 1.5)
  ink.lineStyle(1.2, 0x8b7469).lineBetween(x - 2, y + 5, x + 2, y + 5)
  ink
    .fillStyle(0xe18d92, 0.48)
    .fillEllipse(x - size * 0.52, y + 4, 5, 3)
    .fillEllipse(x + size * 0.52, y + 4, 5, 3)
  if (e.slowedUntil > elapsed)
    ink.lineStyle(1.2, 0x97c8da, 0.7).strokeEllipse(x, y, width * 2 + 5, height * 2 + 5)
  if (e.hp < e.maxHp || e.kind === 'boss') {
    const bar = size * 1.7
    ink.fillStyle(0xc4cbb7).fillRoundedRect(x - bar / 2, y - size - 8, bar, 3, 1)
    ink
      .fillStyle(e.kind === 'boss' ? 0xd18366 : 0x749b73)
      .fillRect(x - bar / 2, y - size - 8, bar * Math.max(0, e.hp / e.maxHp), 3)
  }
}

function drawEffects(ink: Ink, s: DefenseState) {
  for (const e of s.effects) {
    const alpha = e.life / e.duration,
      p = 1 - alpha
    if (e.kind === 'pop') {
      const spread = 1 - (1 - p) ** 3
      // A small cream puff, soft ring and six disappearing crumbs.
      if (p < 0.45)
        ink.fillStyle(0xfff8e5, alpha * 0.85).fillCircle(e.tx, e.ty, e.size * (0.45 + spread * 0.5))
      ink.lineStyle(1.8, e.color, alpha * 0.7).strokeCircle(e.tx, e.ty, 3 + spread * e.size)
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + e.tx * 0.02,
          r = spread * e.size * 1.5
        ink
          .fillStyle(i % 2 ? e.color : 0xfff2cb, alpha)
          .fillCircle(
            e.tx + Math.cos(a) * r,
            e.ty + Math.sin(a) * r + p * 5,
            (2.8 + (i % 2)) * alpha + 0.3,
          )
      }
      continue
    }
    if (e.kind === 'splash') ink.lineStyle(2, e.color, alpha * 0.7).strokeCircle(e.tx, e.ty, p * 40)
    ink
      .fillStyle(e.color, alpha)
      .fillCircle(e.x + (e.tx - e.x) * p, e.y + (e.ty - e.y) * p, e.kind === 'splash' ? 5 : 3)
  }
}

export function mountTowerDefense(
  parent: HTMLElement,
  read: () => DefenseState,
  selection: () => number | null,
  onSelect: (cell: number) => void,
  notify: () => void,
  readTool: () => BuildKind = () => 'shell',
) {
  // Supersample the canvas on large / dense displays while keeping gameplay in world units.
  const density = Math.min(
    2,
    Math.max(1, Math.ceil((parent.clientWidth / FIELD.width) * (window.devicePixelRatio || 1))),
  )
  class DefenseScene extends Phaser.Scene {
    private marks!: Ink
    private towers!: Ink
    private ghost!: Ink
    private units!: Ink
    private effects!: Ink
    private owner?: DefenseState
    private accumulator = 0
    private notified = 0
    private hovered: number | null = null
    private previewKey = ''
    private previewValid = false
    create() {
      this.cameras.main
        .setZoom(density)
        .setScroll((-FIELD.width * (density - 1)) / 2, (-FIELD.height * (density - 1)) / 2)
      const bg = this.add.graphics()
      bg.fillStyle(0xdce9de).fillRect(0, 0, FIELD.width, FIELD.height)
      bg.fillStyle(0x8ea792, 0.18).fillRoundedRect(22, 24, FIELD.width - 44, FIELD.height - 44, 24)
      bg.fillStyle(0xede4c7).fillRoundedRect(22, 20, FIELD.width - 44, FIELD.height - 44, 22)
      bg.fillStyle(0xdde9cc).fillRoundedRect(28, 26, FIELD.width - 56, FIELD.height - 56, 18)
      for (const [i, p] of SITES.entries()) {
        if ((Math.floor(i / GRID.columns) + (i % GRID.columns)) % 2 === 0)
          bg.fillStyle(0xf3f2d9, 0.14).fillRect(p.x - 20, p.y - 20, 40, 40)
        bg.lineStyle(1, 0x819c73, 0.12).strokeRect(p.x - 20, p.y - 20, 40, 40)
        if (i % 7 === 0)
          bg.fillStyle(0xa0b98b, 0.3)
            .fillCircle(p.x + 10, p.y + 11, 1.2)
            .fillCircle(p.x + 13, p.y + 9, 1)
      }
      for (const i of ROCKS) {
        const p = SITES[i]
        bg.fillStyle(0xadb8a4).fillEllipse(p.x, p.y + 5, 39, 29)
        bg.fillStyle(0xcad0bc).fillEllipse(p.x - 3, p.y, 34, 25)
        bg.lineStyle(1, 0x95a18a, 0.7).strokeEllipse(p.x, p.y + 2, 36, 26)
        bg.fillStyle(0xe5e6cf, 0.7).fillEllipse(p.x - 5, p.y - 6, 12, 4)
      }
      this.marks = this.add.graphics().setDepth(3)
      this.towers = this.add.graphics().setDepth(4)
      this.ghost = this.add.graphics().setDepth(5).setAlpha(0.5)
      this.units = this.add.graphics().setDepth(6)
      this.effects = this.add.graphics().setDepth(7)
      const home = SITES[HOME]
      bg.fillStyle(0xe4b756).fillRoundedRect(home.x - 16, home.y - 12, 32, 25, 5)
      bg.lineStyle(3, 0xffe3a1).lineBetween(home.x - 12, home.y - 5, home.x + 12, home.y - 5)
      bg.fillStyle(0x8fcdb7).fillCircle(home.x, home.y + 2, 5)
      for (const [index, cell] of ENTRANCES.entries()) {
        const p = SITES[cell]
        bg.fillStyle(0xdce9de).fillRect(p.x + 20, p.y - 20, 18, 40)
        bg.fillStyle(0xc3d7bb).fillRoundedRect(p.x - 16, p.y - 17, 45, 34, 7)
        bg.fillStyle(0x78956b, 0.75).fillTriangle(
          p.x + 13,
          p.y,
          p.x + 20,
          p.y - 5,
          p.x + 20,
          p.y + 5,
        )
        this.add
          .text(p.x + 35, p.y - 6, String(index + 1), {
            fontFamily: 'sans-serif',
            fontSize: 10,
            color: '#7e8b70',
            resolution: density,
          })
          .setOrigin(0.5, 0)
      }
      this.add
        .text(home.x, FIELD.height - 15, '조개금고', {
          fontFamily: 'sans-serif',
          fontSize: 11,
          color: '#7e7355',
          resolution: density,
        })
        .setOrigin(0.5, 0)
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (gameIsCovered(parent)) return
        const col = Math.floor((pointer.x / density - GRID.x) / GRID.cell),
          row = Math.floor((pointer.y / density - GRID.y) / GRID.cell)
        if (col >= 0 && col < GRID.columns && row >= 0 && row < GRID.rows) {
          parent.focus({ preventScroll: true })
          onSelect(cellAt(col, row))
        }
      })
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        const col = Math.floor((pointer.x / density - GRID.x) / GRID.cell),
          row = Math.floor((pointer.y / density - GRID.y) / GRID.cell)
        this.hovered =
          col >= 0 && col < GRID.columns && row >= 0 && row < GRID.rows ? cellAt(col, row) : null
      })
      this.input.on('gameout', () => {
        this.hovered = null
      })
      notify()
    }
    update(time: number, delta: number) {
      const s = read(),
        phase = s.phase
      if (this.owner !== s) {
        this.owner = s
        this.accumulator = 0
        this.hovered = null
        this.previewKey = ''
      }
      if (!gameIsCovered(parent)) {
        this.accumulator += Math.min(delta, 250) / 1000
        for (let steps = 0; this.accumulator >= 0.05 && steps < 8; steps++) {
          stepDefense(s, 0.05)
          this.accumulator -= 0.05
        }
      } else this.accumulator = 0

      const marks = this.marks.clear(),
        selected = selection(),
        b = s.buildings.find((b) => b.cell === selected),
        tool = readTool()
      const ghost = this.ghost.clear(),
        towers = this.towers.clear()
      for (const tower of s.buildings) drawBuilding(towers, tower)
      const cell =
        b?.cell ?? (s.phase === 'build' ? (this.hovered ?? selected ?? cellAt(14, 2)) : null)
      if (cell !== null) {
        const p = SITES[cell],
          kind = b?.kind ?? tool,
          key = [s.version, s.gold, s.phase, cell, kind].join(':')
        if (this.previewKey !== key) {
          this.previewKey = key
          this.previewValid = !!b || !canPlace(s, cell, kind)
        }
        const tint = this.previewValid ? 0x4f9f74 : 0xd18172
        const range = b ? rangeOf(b) : BUILDINGS[kind].range
        if (range > 0) {
          marks.fillStyle(tint, 0.085).fillCircle(p.x, p.y, range)
          marks.lineStyle(1.6, tint, 0.85).strokeCircle(p.x, p.y, range)
          marks.lineStyle(1, tint, 0.25).strokeCircle(p.x, p.y, range - 4)
        }
        marks.lineStyle(2, tint, 0.9).strokeRoundedRect(p.x - 19, p.y - 19, 38, 38, 5)
        if (!b && s.phase === 'build' && !s.buildings.some((t) => t.cell === cell))
          drawBuilding(ghost, {
            cell,
            kind,
            level: 1,
            cooldown: 0,
            aim: -Math.PI / 2,
            flash: 0,
            spent: 0,
          })
      }
      const units = this.units.clear()
      for (const e of s.enemies) drawEnemy(units, e, s.elapsed)
      drawEffects(this.effects.clear(), s)
      if (time - this.notified > 100 || phase !== s.phase) {
        this.notified = time
        notify()
      }
    }
  }
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: FIELD.width * density,
    height: FIELD.height * density,
    scene: DefenseScene,
    backgroundColor: '#f1f4e8',
    audio: { noAudio: true },
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60 },
    render: { antialias: true },
  })
}
