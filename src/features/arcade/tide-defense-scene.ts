import Phaser from 'phaser'
import {
  FIELD,
  ROUTE,
  SITES,
  routePoint,
  stepDefense,
  towerRange,
  TOWERS,
  type DefenseState,
} from './tide-defense-engine'

export function mountDefense(
  parent: HTMLElement,
  read: () => DefenseState,
  selected: () => number | null,
  notify: () => void,
) {
  class DefenseScene extends Phaser.Scene {
    private ink!: Phaser.GameObjects.Graphics
    private fish = new Map<number, Phaser.GameObjects.Image>()
    private notified = 0
    create() {
      const board = this.add.graphics()
      const path = ROUTE.map(p => new Phaser.Math.Vector2(p.x, p.y))
      board.fillStyle(0x1c5265).fillRect(0, 0, FIELD.width, FIELD.height)
      board.fillStyle(0x8ec6b4).fillRoundedRect(10, 14, 400, 494, 40)
      board.fillStyle(0xd9d5ab).fillRoundedRect(18, 22, 384, 478, 35)
      board.lineStyle(68, 0xadd6c3, 1).strokePoints(path, false)
      board.lineStyle(50, 0x327b86, 1).strokePoints(path, false)
      for (const p of ROUTE.slice(1, -1)) board.fillStyle(0x327b86).fillCircle(p.x, p.y, 25)
      board.lineStyle(2, 0xb1e4d1, 0.2).strokePoints(path, false)
      for (let d = 90; d < 1350; d += 125) {
        const p = routePoint(d),
          a = p.angle
        const pt = (x: number, y: number) => ({
          x: p.x + Math.cos(a) * x - Math.sin(a) * y,
          y: p.y + Math.sin(a) * x + Math.cos(a) * y,
        })
        const tip = pt(5, 0),
          left = pt(-4, -4),
          right = pt(-4, 4)
        board.fillStyle(0xc9eee0, 0.35).fillTriangle(tip.x, tip.y, left.x, left.y, right.x, right.y)
      }
      for (const p of SITES) {
        board.fillStyle(0xa5b58a, 0.4).fillEllipse(p.x, p.y + 7, 60, 42)
        board.fillStyle(0xf0e3b7).fillCircle(p.x, p.y, 25)
        board.lineStyle(2, 0xc5b991).strokeCircle(p.x, p.y, 25)
      }
      for (const [x, y] of [
        [40, 265],
        [226, 470],
        [390, 407],
        [237, 320],
        [26, 424],
      ]) {
        board.lineStyle(3, 0x789d77).lineBetween(x, y + 10, x, y - 8)
        board
          .fillStyle(0x709e7c)
          .fillEllipse(x - 5, y - 7, 15, 6)
          .fillEllipse(x + 4, y - 11, 17, 6)
      }
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
        .text(17, 23, '입구 →', { fontFamily: 'sans-serif', fontSize: '10px', color: '#f3f0cf' })
        .setDepth(3)
      this.add
        .text(369, 492, '우리 섬', { fontFamily: 'sans-serif', fontSize: '10px', color: '#214a53' })
        .setOrigin(0.5)
        .setDepth(3)
      this.ink = this.add.graphics().setDepth(2)
      notify()
    }
    update(time: number, delta: number) {
      const s = read(),
        previous = s.phase
      stepDefense(s, delta / 1000)
      const ink = this.ink
      if (!ink) return
      ink.clear()
      const site = selected(),
        tower = s.towers.find((t) => t.site === site)
      if (site !== null) {
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
        const p = routePoint(e.distance),
          size = e.kind === 'boss' ? 1.6 : e.kind === 'swift' ? 0.85 : 1
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
