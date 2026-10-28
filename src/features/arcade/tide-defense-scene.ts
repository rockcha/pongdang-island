import Phaser from 'phaser'
import {
  FIELD,
  GRID,
  ENTRANCE,
  ISLAND,
  SITES,
  routePoint,
  stepDefense,
  towerRange,
  TOWERS,
  type DefenseState,
  type WallPreview,
} from './tide-defense-engine'

export function mountDefense(
  parent: HTMLElement,
  read: () => DefenseState,
  selected: () => number | null,
  notify: () => void,
  preview: () => WallPreview | null = () => null,
) {
  class DefenseScene extends Phaser.Scene {
    private ink!: Phaser.GameObjects.Graphics
    private terrain!: Phaser.GameObjects.Graphics
    private lastRoute?: DefenseState['route']
    private lastPreview?: WallPreview | null
    private fish = new Map<number, Phaser.GameObjects.Image>()
    private notified = 0
    create() {
      const board = this.add.graphics()
      board.fillStyle(0x1c5265).fillRect(0, 0, FIELD.width, FIELD.height)
      board.fillStyle(0x2a6572).fillRoundedRect(18, 28, 384, 464, 22)
      for (const [cell, p] of SITES.entries()) {
        board
          .fillStyle((cell + Math.floor(cell / GRID.columns)) % 2 ? 0x3d7b82 : 0x36727c, 0.6)
          .fillRoundedRect(p.x - 19, p.y - 19, 38, 38, 5)
        board.lineStyle(1, 0xa0c9bb, 0.18).strokeRoundedRect(p.x - 20, p.y - 20, 40, 40, 5)
      }
      this.terrain = this.add.graphics()
      const art = this.add.graphics()
      for (const [key, color] of [
        ['fish', 0xb3e1d4],
        ['swift', 0xf3bf77],
        ['armored', 0xe4a185],
        ['boss', 0xd67570],
      ] as const) {
        art.clear()
        art.fillStyle(color)
        if (key === 'armored' || key === 'boss') {
          art.fillEllipse(22, 22, 29, 24).fillCircle(5, 12, 6).fillCircle(39, 12, 6)
          art.lineStyle(3, color).lineBetween(8, 22, 0, 30).lineBetween(35, 22, 43, 30)
          art
            .fillStyle(0x263e51)
            .fillRoundedRect(10, 4, 24, 6, 2)
            .fillTriangle(12, 6, 22, -1, 32, 6)
        } else {
          art
            .fillTriangle(10, 22, 1, 11, 1, 33)
            .fillEllipse(24, 22, key === 'swift' ? 34 : 28, key === 'swift' ? 16 : 25)
          art.fillStyle(0xffffff, 0.35).fillEllipse(24, 17, 19, 8)
        }
        art.fillStyle(0x1d3e4b).fillCircle(31, 18, 2.5)
        art.generateTexture('tide-' + key, 44, 44)
      }
      art.destroy()
      this.add
        .text(8, SITES[ENTRANCE].y - 28, '입구 →', {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: '#d3ece0',
        })
        .setDepth(3)
      this.add
        .text(389, SITES[ISLAND].y - 28, '우리 섬', {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: '#f3dfae',
        })
        .setOrigin(0.5)
        .setDepth(3)
      this.ink = this.add.graphics().setDepth(2)
      notify()
    }
    drawTerrain(s: DefenseState, ghost: WallPreview | null) {
      if (this.lastRoute === s.route && this.lastPreview === ghost) return
      this.lastRoute = s.route
      this.lastPreview = ghost
      const map = this.terrain.clear(),
        path = s.route.map((p) => new Phaser.Math.Vector2(p.x, p.y))
      map.lineStyle(28, 0x76b5b0, 0.6).strokePoints(path, false)
      for (const p of s.route) map.fillStyle(0x76b5b0, 0.6).fillCircle(p.x, p.y, 14)
      map.lineStyle(2, 0xc2e7cd, 0.55).strokePoints(path, false)
      for (let d = 90; d < s.routeLength - 40; d += 80) {
        const p = routePoint(d, s.route),
          a = p.angle
        map
          .fillStyle(0xe1efcb, 0.75)
          .fillTriangle(
            p.x + Math.cos(a) * 5,
            p.y + Math.sin(a) * 5,
            p.x + Math.cos(a + 2.4) * 5,
            p.y + Math.sin(a + 2.4) * 5,
            p.x + Math.cos(a - 2.4) * 5,
            p.y + Math.sin(a - 2.4) * 5,
          )
      }
      for (const cell of s.walls) {
        const p = SITES[cell]
        map.fillStyle(0x173f4b, 0.3).fillRoundedRect(p.x - 17, p.y - 12, 34, 32, 8)
        map.fillStyle(0xeaa789).fillRoundedRect(p.x - 17, p.y - 17, 34, 34, 8)
        map
          .lineStyle(3, 0xffd2ad, 0.8)
          .lineBetween(p.x, p.y + 10, p.x, p.y - 10)
          .lineBetween(p.x, p.y + 2, p.x - 9, p.y - 5)
          .lineBetween(p.x, p.y - 3, p.x + 9, p.y - 10)
      }
      const home = SITES[ISLAND]
      map.fillStyle(0xe7d598).fillCircle(home.x, home.y, 15)
      map
        .fillStyle(0x7c9b71)
        .fillTriangle(home.x - 11, home.y + 5, home.x, home.y - 9, home.x + 11, home.y + 5)
      if (ghost && SITES[ghost.cell]) {
        const p = SITES[ghost.cell],
          color = ghost.valid ? 0xf3d397 : 0xf2a099
        if (ghost.plan)
          map.lineStyle(4, color, 0.95).strokePoints(
            ghost.plan.points.map((p) => new Phaser.Math.Vector2(p.x, p.y)),
            false,
          )
        map.fillStyle(color, 0.35).fillRoundedRect(p.x - 18, p.y - 18, 36, 36, 7)
        map.lineStyle(2, color).strokeRoundedRect(p.x - 18, p.y - 18, 36, 36, 7)
        if (!ghost.valid)
          map
            .lineStyle(3, color)
            .lineBetween(p.x - 7, p.y - 7, p.x + 7, p.y + 7)
            .lineBetween(p.x + 7, p.y - 7, p.x - 7, p.y + 7)
      }
    }
    update(time: number, delta: number) {
      const s = read(),
        previous = s.phase
      stepDefense(s, delta / 1000)
      const ink = this.ink
      if (!ink) return
      this.drawTerrain(s, s.phase === 'build' ? preview() : null)
      ink.clear()
      const site = selected(),
        tower = s.towers.find((t) => t.site === site)
      if (site !== null && s.walls.includes(site)) {
        const p = SITES[site]
        ink
          .fillStyle(tower ? TOWERS[tower.kind].color : 0xeff5d8, 0.12)
          .fillCircle(p.x, p.y, tower ? towerRange(tower) : 108)
        ink.lineStyle(1.5, 0xf9f2ca, 0.75).strokeCircle(p.x, p.y, tower ? towerRange(tower) : 108)
      }
      const alive = new Set<number>()
      for (const e of s.enemies) {
        alive.add(e.id)
        let sprite = this.fish.get(e.id)
        if (!sprite) {
          sprite = this.add.image(0, 0, 'tide-' + e.kind).setDepth(1)
          this.fish.set(e.id, sprite)
        }
        const p = routePoint(e.distance, s.route),
          size = e.kind === 'boss' ? 1.1 : e.kind === 'swift' ? 0.65 : 0.75
        sprite
          .setPosition(p.x, p.y)
          .setRotation(p.angle)
          .setScale(size, size * (1 + Math.sin(time / 110 + e.id) * 0.04))
          .setTint(e.slowTime > 0 ? 0x9cddf2 : 0xffffff)
        const width = e.kind === 'boss' ? 50 : 27,
          y = p.y - (e.kind === 'boss' ? 31 : 20)
        ink.fillStyle(0x153f4b, 0.8).fillRoundedRect(p.x - width / 2, y, width, 4, 2)
        ink
          .fillStyle(e.kind === 'boss' ? 0xf5b378 : 0xddf5bc)
          .fillRoundedRect(p.x - width / 2, y, width * Math.max(0, e.hp / e.maxHp), 4, 2)
      }
      for (const [id, image] of this.fish)
        if (!alive.has(id)) {
          image.destroy()
          this.fish.delete(id)
        }
      for (const e of s.effects) {
        const alpha = e.life / e.duration
        if (e.kind === 'net') {
          ink.lineStyle(2, e.color, alpha * 0.65).strokeCircle(e.from.x, e.from.y, (1 - alpha) * 90)
          continue
        }
        if (e.kind === 'pop') {
          for (let i = 0; i < 6; i++)
            ink
              .fillStyle(e.color, alpha)
              .fillCircle(
                e.to.x + Math.cos(i) * (1 - alpha) * 25,
                e.to.y + Math.sin(i) * (1 - alpha) * 25,
                3,
              )
          continue
        }
        if (e.kind === 'lightning') {
          ink
            .lineStyle(2.5, e.color, alpha)
            .beginPath()
            .moveTo(e.from.x, e.from.y)
            .lineTo((e.from.x + e.to.x) / 2 + 9, (e.from.y + e.to.y) / 2)
            .lineTo(e.to.x, e.to.y)
            .strokePath()
          continue
        }
        const progress = 1 - alpha
        ink
          .fillStyle(0xffffff, 0.9)
          .fillCircle(
            e.from.x + (e.to.x - e.from.x) * progress,
            e.from.y + (e.to.y - e.from.y) * progress,
            3.5,
          )
        ink.lineStyle(1, e.color, alpha * 0.3).lineBetween(e.from.x, e.from.y, e.to.x, e.to.y)
      }
      if (time - this.notified > 120 || previous !== s.phase) {
        this.notified = time
        notify()
      }
    }
  }
  return new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: FIELD.width,
    height: FIELD.height,
    backgroundColor: '#1c5265',
    scene: DefenseScene,
    audio: { noAudio: true },
    banner: false,
    render: { antialias: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60 },
  })
}
