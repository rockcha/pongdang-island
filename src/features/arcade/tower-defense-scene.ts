import Phaser from 'phaser'
import { gameIsCovered } from './game-interaction'
import { createDefenseAudio } from './tower-defense-audio'
import { advanceDefenseClock } from './tower-defense-clock'
import { WallStroke } from './tower-defense-placement'
import { towerOriginY } from './tower-defense-towers'
import { DEFENSE_ART, towerFrame } from './tower-defense-assets'
import {
  BUILDINGS,
  TOWER_KINDS,
  FIELD,
  GRID,
  HOME,
  MONSTERS,
  SITES,
  ENEMY_LIMIT,
  canPlace,
  cellAt,
  rangeOf,
  type BuildKind,
  type DefenseState,
} from './tower-defense-engine'

// One sprite per pooled slot, one cached background, shared health/effect layers.
// No Arcade Physics bodies, per-unit tweens, DOM enemies or individual pathfinding.
export function mountTowerDefense(
  parent: HTMLElement,
  read: () => DefenseState,
  selection: () => number | null,
  onSelect: (cell: number) => void,
  notify: () => void,
  readTool: () => BuildKind | null,
  onError: (message: string) => void = () => {},
  readDragCell: () => number | null | undefined = () => undefined,
  onPaintWall: (cell: number) => void = onSelect,
) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const density = window.devicePixelRatio > 1 ? 2 : 1
  class DefenseScene extends Phaser.Scene {
    private marks!: Phaser.GameObjects.Graphics
    private bars!: Phaser.GameObjects.Graphics
    private effects!: Phaser.GameObjects.Graphics
    private walls = new Map<number, Phaser.GameObjects.Image>()
    private dragging = false
    private gesturePointer: number | null = null
    private wallStroke = new WallStroke(onPaintWall)
    private audio?: ReturnType<typeof createDefenseAudio>
    private lastEffectId = 0
    private castle!: Phaser.GameObjects.Image
    private hovered: number | null = null
    private ghost!: Phaser.GameObjects.Sprite
    private units: (Phaser.GameObjects.Sprite | undefined)[] = new Array(ENEMY_LIMIT)
    private towers = new Map<number, Phaser.GameObjects.Sprite>()
    private badges = new Map<number, Phaser.GameObjects.Text>()
    private castleBadge!: Phaser.GameObjects.Text
    private used = new Uint8Array(ENEMY_LIMIT)
    private unitSizes = new Uint8Array(ENEMY_LIMIT)
    private airBadges: (Phaser.GameObjects.Text | undefined)[] = new Array(ENEMY_LIMIT)
    private shadows!: Phaser.GameObjects.Graphics
    private accumulator = 0
    private notified = 0
    private owner?: DefenseState
    private previewKey = ''
    private wallKey = ''
    private coverageAt = 0
    private covered = false
    private slowFrames = 0
    private failed = false
    preload() {
      this.load.on('loaderror', () => {
        this.failed = true
        onError('전장 이미지를 불러오지 못했어요. 다시 시작해 주세요.')
      })
      for (const kind of [...TOWER_KINDS, 'enemies'] as const)
        this.load.spritesheet(kind, DEFENSE_ART[kind], {
          frameWidth: 256,
          frameHeight: 256,
        })
      this.load.svg('field', DEFENSE_ART.field, {
        width: FIELD.width * density,
        height: FIELD.height * density,
      })
      this.load.svg('castle', DEFENSE_ART.castle, { width: 256, height: 256 })
      this.load.svg('wall', DEFENSE_ART.wall, { width: 256, height: 256 })
    }
    create() {
      if (this.failed) return
      this.audio = createDefenseAudio()
      this.events.once('shutdown', () => this.audio?.dispose())
      this.cameras.main
        .setZoom(density)
        .setScroll((-FIELD.width * (density - 1)) / 2, (-FIELD.height * (density - 1)) / 2)
      this.add
        .image(0, 0, 'field')
        .setOrigin(0)
        .setDisplaySize(FIELD.width, FIELD.height)
        .setDepth(0)
      const h = SITES[HOME]
      this.castle = this.add
        .image(h.x, h.y, 'castle')
        .setDisplaySize(64, 64)
        .setRotation(0)
        .setDepth(2)
      this.castleBadge = this.add
        .text(h.x + 18, h.y + 12, '', {
          fontFamily: 'sans-serif',
          fontSize: 11,
          color: '#ffffff',
          backgroundColor: '#a68c53',
          padding: { x: 3, y: 1 },
        })
        .setDepth(8)
        .setVisible(false)
      this.marks = this.add.graphics().setDepth(1)
      this.bars = this.add.graphics().setDepth(6)
      this.shadows = this.add.graphics().setDepth(3)
      this.effects = this.add.graphics().setDepth(7)
      this.ghost = this.add
        .sprite(0, 0, 'octopus', 0)
        .setDisplaySize(49, 49)
        .setAlpha(0.5)
        .setDepth(5)
        .setVisible(false)
      const pointCell = (p: Phaser.Input.Pointer) => {
        const col = Math.floor((p.x / density - GRID.x) / GRID.cell)
        const row = Math.floor((p.y / density - GRID.y) / GRID.cell)
        return col >= 0 && col < GRID.columns && row >= 0 && row < GRID.rows
          ? cellAt(col, row)
          : null
      }
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (this.covered || (!p.wasTouch && p.button !== 0) || this.dragging) return
        const cell = pointCell(p)
        this.hovered = cell
        this.dragging = true
        this.gesturePointer = p.id
        if (readTool() === 'wall') this.wallStroke.start(cell)
      })
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (this.covered) return
        this.hovered = pointCell(p)
        if (this.dragging && p.id === this.gesturePointer) {
          if (readTool() === 'wall') this.wallStroke.move(this.hovered)
          else this.wallStroke.end()
        }
      })
      this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.id !== this.gesturePointer) return
        const cell = pointCell(p),
          commit = this.dragging
        const painting = this.wallStroke.active
        if (!this.covered && painting && readTool() === 'wall') this.wallStroke.move(cell)
        this.wallStroke.end()
        this.dragging = false
        this.gesturePointer = null
        if (!this.covered && commit && !painting && cell !== null) onSelect(cell)
      })
      this.input.on('gameout', () => {
        this.dragging = false
        this.gesturePointer = null
        this.wallStroke.end()
        this.hovered = null
      })
      const stopGesture = () => {
        this.dragging = false
        this.gesturePointer = null
        this.wallStroke.end()
      }
      this.input.on('pointerupoutside', stopGesture)
      this.game.canvas.addEventListener('pointercancel', stopGesture)
      this.game.canvas.addEventListener('touchcancel', stopGesture)
      window.addEventListener('blur', stopGesture)
      this.events.once('shutdown', () => {
        this.game.canvas.removeEventListener('pointercancel', stopGesture)
        this.game.canvas.removeEventListener('touchcancel', stopGesture)
        window.removeEventListener('blur', stopGesture)
      })
      notify()
    }
    private preview(s: DefenseState) {
      const external = readDragCell(),
        tool = readTool(),
        selected =
          external !== undefined
            ? external
            : tool || this.dragging
              ? this.hovered
              : (selection() ?? this.hovered),
        key = `${s.version}:${s.gold}:${s.phase}:${selected}:${tool}`
      if (key === this.previewKey) return
      this.previewKey = key
      this.marks.clear()
      this.ghost.setVisible(false)
      const b = s.buildings.find((b) => b.cell === selected),
        editable = s.phase === 'build' || s.phase === 'combat',
        candidate = editable && tool && selected !== null && selected !== HOME && !b ? selected : -1
      const valid = candidate >= 0 && tool ? !canPlace(s, candidate, tool) : true
      if (selected === null || selected === HOME) return
      const p = SITES[selected]
      if (!p) return
      const kind = b?.kind ?? tool,
        r = b ? rangeOf(b) : kind ? BUILDINGS[kind].range[0] * GRID.cell : 0,
        color = valid ? 0x4f9c7b : 0xc97765
      if (!kind) return
      if (r) {
        this.marks.fillStyle(color, 0.09).fillCircle(p.x, p.y, r)
        this.marks.lineStyle(1.3, color, 0.7).strokeCircle(p.x, p.y, r)
      }
      this.marks.fillStyle(color, 0.12).fillRoundedRect(p.x - 17, p.y - 17, 34, 34, 5)
      this.marks.lineStyle(2, color).strokeRoundedRect(p.x - 17, p.y - 17, 34, 34, 5)
      if (candidate >= 0)
        this.ghost
          .setTexture(kind, 0)
          .setOrigin(0.5, towerOriginY(kind))
          .setDisplaySize(kind === 'wall' ? 36 : 54, kind === 'wall' ? 36 : 54)
          .setPosition(p.x, p.y)
          .setTint(valid ? 0xffffff : 0xe0a291)
          .setAlpha(valid ? 0.7 : 0.4)
          .setVisible(true)
      if (!valid)
        this.marks
          .lineStyle(2, 0xc97765)
          .lineBetween(p.x - 4, p.y - 4, p.x + 4, p.y + 4)
          .lineBetween(p.x + 4, p.y - 4, p.x - 4, p.y + 4)
    }
    update(time: number, delta: number) {
      if (this.failed) return
      const s = read()
      if (this.owner !== s) {
        this.owner = s
        this.accumulator = 0
        this.previewKey = ''
        this.wallKey = ''
        this.lastEffectId = 0
        this.wallStroke.end()
        this.dragging = false
        this.gesturePointer = null
      }
      // Dialog/style queries are throttled, never repeated for each unit or fixed step.
      if (time - this.coverageAt > 100) {
        this.covered = gameIsCovered(parent) || document.hidden
        this.coverageAt = time
      }
      if (!this.covered) {
        this.accumulator = advanceDefenseClock(s, this.accumulator, delta / 1000)
      } else this.accumulator = 0
      if (delta > 28) this.slowFrames = Math.min(40, this.slowFrames + 1)
      else this.slowFrames = Math.max(0, this.slowFrames - 1)
      this.preview(s)
      this.castleBadge
        .setVisible(s.castleLevel > 0)
        .setText(s.castleLevel ? String(s.castleLevel) : '')
      const wallKey = `${s.version}`
      if (wallKey !== this.wallKey) {
        this.wallKey = wallKey
        for (const [cell, sprite] of this.walls)
          if (!s.buildings.some((b) => b.cell === cell && b.kind === 'wall')) {
            sprite.destroy()
            this.walls.delete(cell)
          }
        for (const b of s.buildings)
          if (b.kind === 'wall' && !this.walls.has(b.cell)) {
            const p = SITES[b.cell]
            this.walls.set(
              b.cell,
              this.add.image(p.x, p.y, 'wall').setDisplaySize(36, 36).setDepth(2),
            )
          }
      }
      for (const [cell, sprite] of this.towers)
        if (!s.buildings.some((b) => b.cell === cell && b.kind !== 'wall')) {
          sprite.destroy()
          this.towers.delete(cell)
        }
      for (const [cell, badge] of this.badges)
        if (!s.buildings.some((b) => b.cell === cell && b.level > 0)) {
          badge.destroy()
          this.badges.delete(cell)
        }
      for (const b of s.buildings) {
        if (b.kind === 'wall') continue
        const p = SITES[b.cell]
        let sprite = this.towers.get(b.cell)
        if (!sprite) {
          sprite = this.add
            .sprite(p.x, p.y, b.kind, 0)
            .setOrigin(0.5, towerOriginY(b.kind))
            .setDisplaySize(54, 54)
            .setDepth(3)
          this.towers.set(b.cell, sprite)
        }
        if (sprite.texture.key !== b.kind)
          sprite.setTexture(b.kind).setOrigin(0.5, towerOriginY(b.kind))
        const placement = s.effects.find((e) => e.kind === 'build' && e.x === p.x && e.y === p.y)
        const age = placement ? placement.duration - placement.life : 1
        const size =
          !reduced && age < 0.22 ? 54 * (0.94 + 0.12 * Math.sin((Math.PI * age) / 0.22)) : 54
        if (sprite.displayWidth !== size) sprite.setDisplaySize(size, size)
        sprite
          .setFrame(towerFrame(b.flash, reduced))
          .setRotation(b.kind === 'anemone' || b.kind === 'frost' ? 0 : b.aim + Math.PI / 2)
        if (b.level) {
          let badge = this.badges.get(b.cell)
          if (!badge) {
            badge = this.add
              .text(p.x + 12, p.y + 9, '', {
                fontFamily: 'sans-serif',
                fontSize: 11,
                color: '#ffffff',
                backgroundColor: '#a68c53',
                padding: { x: 3, y: 1 },
              })
              .setDepth(8)
            this.badges.set(b.cell, badge)
          }
          badge.setText(String(b.level))
        }
      }
      const alpha = s.phase === 'combat' ? Math.min(1, this.accumulator / 0.05) : 1
      this.used.fill(0)
      this.bars.clear()
      this.shadows.clear()
      for (const e of s.enemies) {
        if (e.hp <= 0) continue
        this.used[e.slot] = 1
        let sprite = this.units[e.slot]
        if (!sprite) {
          sprite = this.add.sprite(e.x, e.y, 'enemies', 0).setDepth(4)
          this.units[e.slot] = sprite
        }
        const x = e.px + (e.x - e.px) * alpha,
          y = e.py + (e.y - e.py) * alpha,
          size =
            e.kind === 'abyss'
              ? 90
              : e.kind === 'overlord'
                ? 80
                : e.kind === 'boss'
                  ? 68
                  : e.kind === 'mini'
                    ? 29
                    : e.kind === 'swarm'
                      ? 33
                      : ['shark', 'mako', 'dolphin'].includes(e.kind)
                        ? 62
                        : 45
        const frame = MONSTERS[e.kind].frame + (reduced ? 0 : Math.floor(s.elapsed * 6 + e.id) % 4),
          rotation = e.angle - Math.PI / 2
        if (!sprite.visible) sprite.setVisible(true)
        if (sprite.x !== x || sprite.y !== y) sprite.setPosition(x, y)
        if (this.unitSizes[e.slot] !== size) {
          sprite.setDisplaySize(size, size)
          this.unitSizes[e.slot] = size
        }
        if (Number(sprite.frame.name) !== frame) sprite.setFrame(frame)
        if (sprite.rotation !== rotation) sprite.setRotation(rotation)
        const airborne = MONSTERS[e.kind].layer === 'air'
        sprite.setDepth(airborne ? 5 : 4)
        let airBadge = this.airBadges[e.slot]
        if (airborne) {
          this.shadows.fillStyle(0x476a79, 0.18).fillEllipse(x, y + 13, size * 0.55, size * 0.18)
          if (!airBadge) {
            airBadge = this.add
              .text(0, 0, '✦ 공중', {
                fontFamily: 'sans-serif',
                fontSize: 9,
                color: '#315e78',
                backgroundColor: '#e7f5ff',
                padding: { x: 3, y: 1 },
              })
              .setOrigin(0.5, 1)
              .setDepth(9)
            this.airBadges[e.slot] = airBadge
          }
          airBadge.setPosition(x, y - size * 0.55 - 6).setVisible(true)
        } else airBadge?.setVisible(false)
        const tint =
          e.kind === 'abyss' && e.phaseFlags & 4
            ? 0xf4c7a4
            : e.kind === 'mako' && e.age % 6 < 1 && !reduced
              ? 0xffdda4
              : 0xffffff
        if (sprite.tintTopLeft !== tint) sprite.setTint(tint)
        if (e.slowRemaining > 0) {
          this.bars.lineStyle(1.5, 0x92dae7, 0.8).strokeEllipse(x, y + 6, size * 0.65, size * 0.32)
        }
        const boss = MONSTERS[e.kind].boss,
          barWidth = boss ? 40 : 22,
          barY = y - size * (boss || airborne ? 0.55 : 0.38)
        if (e.shield > 0) {
          this.bars.lineStyle(1.6, 0x91c8e2, 0.65).strokeCircle(x, y, size * 0.34)
          this.bars
            .fillStyle(0x8fbace, 0.8)
            .fillRect(x - barWidth / 2, barY - 3, barWidth * Math.min(1, e.shield / e.shieldMax), 2)
        }
        if (e.rushing && !reduced && e.speed > 0)
          this.bars
            .lineStyle(2, 0xe1c38d, 0.45)
            .lineBetween(
              x - Math.cos(e.angle) * 10,
              y - Math.sin(e.angle) * 10,
              x - Math.cos(e.angle) * 23,
              y - Math.sin(e.angle) * 23,
            )
        if (boss || airborne || e.hp < e.maxHp) {
          this.bars.fillStyle(0x65806e, 0.5).fillRect(x - barWidth / 2, barY, barWidth, 3)
          this.bars
            .fillStyle(0x70a186)
            .fillRect(x - barWidth / 2, barY, barWidth * Math.max(0, e.hp / e.maxHp), 3)
        }
      }
      for (let i = 0; i < ENEMY_LIMIT; i++) {
        if (!this.used[i]) {
          this.units[i]?.setVisible(false)
          this.airBadges[i]?.setVisible(false)
        }
      }
      this.effects.clear()
      this.castle.clearTint()
      const previousEffectId = this.lastEffectId
      for (const effect of s.effects) {
        if (effect.kind === 'breach') this.castle.setTint(0xf0a18b)
        if (effect.id > previousEffectId) {
          if (
            !this.covered &&
            (effect.kind === 'purchase' ||
              effect.kind === 'breach' ||
              effect.kind === 'beam' ||
              effect.kind === 'blast')
          )
            this.audio?.play(effect.kind)
          this.lastEffectId = Math.max(this.lastEffectId, effect.id)
        }
      }
      for (const b of s.buildings) {
        const p = SITES[b.cell],
          c = BUILDINGS[b.kind],
          r = rangeOf(b)
        if (b.charge > 0) {
          const progress = 1 - b.charge / c.chargeTime
          const alpha = c.attack === 'snipe' ? 0.5 + 0.4 * progress : 0.2 + 0.5 * progress
          const target = c.attack === 'snipe' ? s.byId.get(b.chargeTarget) : undefined
          const tx = target?.x ?? p.x + Math.cos(b.aim) * r
          const ty = target?.y ?? p.y + Math.sin(b.aim) * r
          this.effects
            .lineStyle(1.5, c.attack === 'snipe' ? 0x789fb6 : c.color, alpha)
            .lineBetween(p.x, p.y, tx, ty)
          this.effects.fillStyle(c.color, alpha).fillCircle(p.x, p.y, 3 + 3 * progress)
          if (target) {
            const ring = 15 - progress * 6
            this.effects.lineStyle(1.5, 0x789fb6, alpha).strokeCircle(tx, ty, ring)
            for (let i = 0; i < 4; i++) {
              const angle = (i * Math.PI) / 2
              this.effects.lineBetween(
                tx + Math.cos(angle) * (ring + 3),
                ty + Math.sin(angle) * (ring + 3),
                tx + Math.cos(angle) * (ring + 7),
                ty + Math.sin(angle) * (ring + 7),
              )
            }
          }
        }
        if (c.attack === 'flame' && b.flash > 0) {
          const alpha = Math.min(1, b.flash / 0.2),
            spread = c.area
          for (let i = 0; i < 5; i++) {
            const a = b.aim - spread + (2 * spread * i) / 5,
              z = a + (2 * spread) / 5
            this.effects
              .fillStyle(i % 2 ? 0xf0bf7a : c.color, 0.21 * alpha)
              .fillTriangle(
                p.x + Math.cos(b.aim) * 20,
                p.y + Math.sin(b.aim) * 20,
                p.x + Math.cos(a) * r,
                p.y + Math.sin(a) * r,
                p.x + Math.cos(z) * r,
                p.y + Math.sin(z) * r,
              )
          }
          this.effects
            .fillStyle(0xf5dca1, 0.45 * alpha)
            .fillCircle(p.x + Math.cos(b.aim) * 23, p.y + Math.sin(b.aim) * 23, 4)
          if (!reduced)
            for (let i = -1; i <= 1; i++) {
              const angle = b.aim + i * 0.18,
                distance = r * (0.6 + 0.15 * Math.sin(s.elapsed * 18 + i))
              this.effects
                .lineStyle(3, 0xffdf97, 0.35 * alpha)
                .lineBetween(
                  p.x + Math.cos(angle) * 22,
                  p.y + Math.sin(angle) * 22,
                  p.x + Math.cos(angle) * distance,
                  p.y + Math.sin(angle) * distance,
                )
            }
        } else if (b.flash > 0.25 && (c.attack === 'single' || c.attack === 'blast') && !reduced) {
          const a = b.flash / 0.4,
            t = 1 - a
          for (const side of [-1, 1])
            this.effects
              .fillStyle(c.color, a * 0.55)
              .fillCircle(
                p.x + Math.cos(b.aim) * (23 + 12 * t) + Math.sin(b.aim) * side * 4,
                p.y + Math.sin(b.aim) * (23 + 12 * t) - Math.cos(b.aim) * side * 4,
                2 * a,
              )
        }
      }
      for (const p of s.projectiles) {
        const angle = Math.atan2(p.ty - p.sy, p.tx - p.sx)
        const dx = Math.cos(angle),
          dy = Math.sin(angle)
        if (p.source === 'harpoon') {
          this.effects
            .lineStyle(3, 0x6e929b, 1)
            .lineBetween(p.x - dx * 10, p.y - dy * 10, p.x + dx * 7, p.y + dy * 7)
          this.effects
            .fillStyle(0xd8eff0)
            .fillTriangle(
              p.x + dx * 13,
              p.y + dy * 13,
              p.x + dx * 3 - dy * 4,
              p.y + dy * 3 + dx * 4,
              p.x + dx * 3 + dy * 4,
              p.y + dy * 3 - dx * 4,
            )
          if (!reduced)
            this.effects
              .lineStyle(1, p.color, 0.4)
              .lineBetween(p.x - dx * 12, p.y - dy * 12, p.x - dx * 26, p.y - dy * 26)
          continue
        }
        if (p.source === 'sniper') {
          this.effects.lineStyle(2, 0xf2ffff, 1).lineBetween(p.x, p.y, p.x - dx * 20, p.y - dy * 20)
          this.effects.fillStyle(0xe3f9ff).fillCircle(p.x, p.y, 3)
          continue
        }
        if (p.source === 'plasma') {
          this.effects
            .lineStyle(5, p.color, 0.22)
            .lineBetween(p.x, p.y, p.x - dx * 12, p.y - dy * 12)
          this.effects
            .lineStyle(2, 0xeee0ff, 1)
            .lineBetween(p.x + dx * 3, p.y + dy * 3, p.x - dx * 6, p.y - dy * 6)
          continue
        }
        if (p.missile) {
          const angle = Math.atan2(p.ty - p.y, p.tx - p.x)
          this.effects
            .lineStyle(4, p.color, 1)
            .lineBetween(
              p.x - Math.cos(angle) * 4,
              p.y - Math.sin(angle) * 4,
              p.x + Math.cos(angle) * 4,
              p.y + Math.sin(angle) * 4,
            )
          this.effects
            .fillStyle(0xffd394, 0.9)
            .fillCircle(p.x - Math.cos(angle) * 6, p.y - Math.sin(angle) * 6, 2)
          if (!reduced)
            this.effects
              .lineStyle(2, p.color, 0.3)
              .lineBetween(
                p.x - Math.cos(angle) * 8,
                p.y - Math.sin(angle) * 8,
                p.x - Math.cos(angle) * 20,
                p.y - Math.sin(angle) * 20,
              )
          continue
        }
        if (p.source === 'seahorse') {
          this.effects.lineStyle(1, 0xd2f5e9, 0.9).strokeCircle(p.x, p.y, 3)
          if (!reduced)
            this.effects.fillStyle(p.color, 0.5).fillCircle(p.x - dx * 7, p.y - dy * 7, 1.8)
          continue
        }
        this.effects
          .fillStyle(p.color)
          .fillCircle(p.x, p.y, p.blast ? 4.5 : p.color === BUILDINGS.octopus.color ? 3.5 : 2.8)
        this.effects.fillStyle(0xfff9e9, 0.75).fillCircle(p.x - 1, p.y - 1, p.blast ? 1.6 : 1)
        if (!reduced)
          this.effects
            .lineStyle(1, p.color, 0.4)
            .lineBetween(p.x, p.y, p.x - (p.tx - p.sx) * 0.06, p.y - (p.ty - p.sy) * 0.06)
      }
      const budget = reduced ? 16 : this.slowFrames > 20 ? 24 : 64
      let decorations = 0
      for (let n = 0; n < s.effects.length; n++) {
        const e = s.effects[n],
          a = e.life / e.duration,
          t = 1 - a,
          r = e.kind === 'impact' ? 9 : e.kind === 'heal' ? 24 : 14
        if (
          (e.kind === 'pop' || e.kind === 'impact' || e.kind === 'heal') &&
          decorations++ >= budget
        )
          continue
        if (e.kind === 'impact' && e.source === 'anemone') {
          const mx = (e.x + e.tx) / 2,
            my = (e.y + e.ty) / 2
          const angle = Math.atan2(e.y - e.ty, e.x - e.tx)
          const bend = reduced ? 0 : Math.sin(t * 24) * 6
          this.effects
            .lineStyle(1.8, 0xf3edab, a)
            .lineBetween(e.tx, e.ty, mx - Math.sin(angle) * bend, my + Math.cos(angle) * bend)
          this.effects.lineBetween(
            mx - Math.sin(angle) * bend,
            my + Math.cos(angle) * bend,
            e.x,
            e.y,
          )
          continue
        }
        if (e.kind === 'impact' && e.source === 'harpoon') {
          for (let i = 0; i < (reduced ? 3 : 6); i++) {
            const angle = (i * Math.PI) / 3
            this.effects
              .lineStyle(1.5, 0xb9dcdf, a)
              .lineBetween(
                e.x + Math.cos(angle) * 4,
                e.y + Math.sin(angle) * 4,
                e.x + Math.cos(angle) * (5 + t * 15),
                e.y + Math.sin(angle) * (5 + t * 15),
              )
          }
          continue
        }
        if (e.kind === 'pulse' && e.source === 'frost') {
          const radius = e.radius * (0.25 + t * 0.75)
          this.effects.fillStyle(0xcceff6, a * 0.12).fillCircle(e.x, e.y, radius)
          this.effects.lineStyle(2, 0x79b6c8, a * 0.9).strokeCircle(e.x, e.y, radius)
          for (let i = 0; i < (reduced ? 3 : 6); i++) {
            const angle = (i * Math.PI) / 3,
              x = e.x + Math.cos(angle) * radius,
              y = e.y + Math.sin(angle) * radius
            this.effects
              .lineStyle(1.5, 0x80b9cc, a)
              .lineBetween(x - 3, y, x + 3, y)
              .lineBetween(x, y - 3, x, y + 3)
          }
          continue
        }
        if (e.kind === 'beam') {
          if (e.source === 'sniper') {
            this.effects.lineStyle(4, 0x729bb5, a * 0.65).lineBetween(e.x, e.y, e.tx, e.ty)
            this.effects.lineStyle(1.5, 0xf2ffff, a).lineBetween(e.x, e.y, e.tx, e.ty)
            this.effects
              .lineStyle(1.5, 0x8ab7cd, a)
              .lineBetween(e.tx - 6, e.ty, e.tx + 6, e.ty)
              .lineBetween(e.tx, e.ty - 6, e.tx, e.ty + 6)
            continue
          }
          this.effects.lineStyle(e.radius + 6, e.color, a * 0.16).lineBetween(e.x, e.y, e.tx, e.ty)
          this.effects.lineStyle(e.radius, e.color, a * 0.7).lineBetween(e.x, e.y, e.tx, e.ty)
          this.effects
            .lineStyle(Math.max(2, e.radius * 0.3), 0xf4fcff, a)
            .lineBetween(e.x, e.y, e.tx, e.ty)
          continue
        }
        if (e.kind === 'blast' || e.kind === 'pulse') {
          const radius = e.radius * (0.35 + 0.65 * t)
          this.effects
            .fillStyle(e.color, a * (e.kind === 'blast' ? 0.18 : 0.07))
            .fillCircle(e.x, e.y, radius)
          this.effects
            .lineStyle(e.kind === 'blast' ? 2.5 : 2, e.color, a)
            .strokeCircle(e.x, e.y, radius)
          if (!reduced)
            this.effects.lineStyle(1, e.color, a * 0.4).strokeCircle(e.x, e.y, radius * 1.18)
          if (e.kind === 'blast' && !reduced)
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3,
                distance = radius * 0.85
              this.effects
                .lineStyle(2, 0xf1d3a3, a)
                .lineBetween(
                  e.x + Math.cos(angle) * distance,
                  e.y + Math.sin(angle) * distance,
                  e.x + Math.cos(angle) * (distance + 5),
                  e.y + Math.sin(angle) * (distance + 5),
                )
            }
          continue
        }
        if (e.kind === 'build') {
          for (let i = 0; i < (reduced ? 4 : 9); i++) {
            const angle = (i * Math.PI * 2) / 9,
              distance = 10 + 22 * t
            this.effects
              .fillStyle(e.color, a * 0.6)
              .fillCircle(
                e.x + Math.cos(angle) * distance,
                e.y + Math.sin(angle) * distance * 0.5,
                3 + 5 * t,
              )
          }
          continue
        }
        if (e.kind === 'purchase') {
          this.effects.lineStyle(1.5, e.color, a).strokeCircle(e.x, e.y, 12 + 19 * t)
          for (let i = 0; i < (reduced ? 3 : 6); i++) {
            const angle = (i * Math.PI) / 3,
              x = e.x + Math.cos(angle) * (13 + 15 * t),
              y = e.y + Math.sin(angle) * (13 + 15 * t) - 12 * t
            this.effects
              .lineStyle(2, e.color, a)
              .lineBetween(x - 3 * a, y, x + 3 * a, y)
              .lineBetween(x, y - 3 * a, x, y + 3 * a)
          }
          continue
        }
        if (e.kind === 'breach') {
          this.effects.fillStyle(e.color, a * 0.18).fillCircle(e.x, e.y, 24 + 20 * t)
          this.effects.lineStyle(3, e.color, a).strokeCircle(e.x, e.y, 20 + 30 * t)
        }
        this.effects.lineStyle(1.3, e.color, a * 0.8).strokeCircle(e.x, e.y, 3 + r * t)
        if (!reduced && e.kind !== 'heal')
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2 + e.x
            this.effects
              .fillStyle(e.color, a)
              .fillCircle(e.x + Math.cos(angle) * r * t, e.y + Math.sin(angle) * r * t, 2 * a)
          }
      }
      if (time - this.notified >= 150) {
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
    backgroundColor: '#d5e9df',
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60 },
    // Rotated sprites corrupt in multi-texture batches on the tested GL backend.
    // Enemies still batch together because every species shares one atlas.
    render: { antialias: true, maxTextures: 1 },
  })
}
