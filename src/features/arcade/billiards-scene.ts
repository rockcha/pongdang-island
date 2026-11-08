import Phaser from 'phaser'
import {
  CUE_GRAB_DISTANCE,
  cueDrag,
  shotStrength,
  shoot,
  stepBilliards,
  TABLE,
  type Billiards,
} from './billiards-model'
const MARGIN = 70,
  WIDTH = TABLE.width + MARGIN * 2,
  HEIGHT = TABLE.height + MARGIN * 2
export function mountBilliards(
  host: HTMLElement,
  state: Billiards,
  changed: () => void,
  paused: () => boolean,
) {
  class BilliardsScene extends Phaser.Scene {
    private g!: Phaser.GameObjects.Graphics
    private cueGraphics!: Phaser.GameObjects.Graphics
    private label!: Phaser.GameObjects.Text
    private drag: { x: number; y: number } | null = null
    private origin = { x: 0, y: 0 }
    private pointerId: number | null = null
    private direction = { x: 0, y: -1 }
    create() {
      this.g = this.add.graphics()
      this.cueGraphics = this.add.graphics()
      this.label = this.add
        .text(WIDTH / 2, 22, '', {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#73553d',
        })
        .setOrigin(0.5)
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        const ball = state.balls[0],
          x = p.x - MARGIN,
          y = p.y - MARGIN
        if (
          paused() ||
          state.phase !== 'aim' ||
          this.drag ||
          p.y < 54 ||
          p.y > HEIGHT - 4 ||
          Math.hypot(x - ball.x, y - ball.y) < CUE_GRAB_DISTANCE
        )
          return
        this.origin = { x, y }
        this.pointerId = p.id
        this.updateDrag(p)
      })
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.id === this.pointerId) this.updateDrag(p)
      })
      this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.id !== this.pointerId) return
        this.updateDrag(p)
        if (this.drag && !paused())
          shoot(state, state.balls[0].x - this.drag.x, state.balls[0].y - this.drag.y)
        this.cancelDrag()
        changed()
      })
      this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => {
        if (p.id === this.pointerId) this.cancelDrag()
      })
      this.game.events.on('blur', this.cancelDrag, this)
      this.events.once('shutdown', () => this.game.events.off('blur', this.cancelDrag, this))
      changed()
    }
    private updateDrag(p: Phaser.Input.Pointer) {
      const ball = state.balls[0],
        aim = cueDrag(ball, this.origin, { x: p.x - MARGIN, y: p.y - MARGIN })
      this.direction = { x: aim.nx, y: aim.ny }
      this.drag = { x: ball.x - aim.dx, y: ball.y - aim.dy }
    }
    private cancelDrag() {
      this.drag = null
      this.pointerId = null
    }
    update(time: number, delta: number) {
      const before = JSON.stringify([state.phase, state.hits, state.foul, state.message])
      if (!paused()) stepBilliards(state, delta / 1000)
      else this.cancelDrag()
      if (before !== JSON.stringify([state.phase, state.hits, state.foul, state.message])) changed()
      const g = this.g
      g.clear()
      this.cueGraphics.clear()
      g.fillStyle(0x9c6842)
      g.fillRoundedRect(MARGIN + 4, MARGIN + 4, 352, 512, 18)
      g.fillStyle(0x163f42)
      g.fillRoundedRect(MARGIN + 16, MARGIN + 16, 328, 488, 14)
      g.fillStyle(0x286664)
      g.fillRoundedRect(MARGIN + 28, MARGIN + 28, 304, 464, 5)
      g.lineStyle(1, 0xffffff, 0.08)
      g.strokeCircle(MARGIN + 180, MARGIN + 260, 60)
      for (let i = 1; i <= 7; i++) {
        g.fillStyle(0xe7cca1)
        g.fillCircle(MARGIN + 10, MARGIN + 64 * i, 2)
        g.fillCircle(MARGIN + 350, MARGIN + 64 * i, 2)
      }
      for (const b of state.balls) {
        const x = b.x + MARGIN,
          y = b.y + MARGIN
        g.fillStyle(0x062929, 0.35)
        g.fillCircle(x + 2, y + 3, 13)
        g.fillStyle(b.kind === 'red' ? 0xe5544c : b.kind === 'yellow' ? 0xf0c34d : 0xfff9ec)
        g.fillCircle(x, y, 12)
        g.fillStyle(0xffffff, 0.65)
        g.fillCircle(x - 4, y - 4, 3)
        if (b.kind === 'red' && state.hits.includes(b.id)) {
          g.lineStyle(2, 0xc9ffca)
          g.strokeCircle(x, y, 16)
        }
        if (b.kind === 'yellow' && state.foul) {
          g.lineStyle(3, 0xff7664)
          g.strokeCircle(x, y, 17)
        }
      }
      const b = state.balls[0],
        stroke = state.stroke
      let x = b.x,
        y = b.y,
        power = 0,
        pull = 0,
        tip = 20,
        cueAlpha = 1,
        flash = 0
      if (this.drag) {
        const dx = b.x - this.drag.x,
          dy = b.y - this.drag.y,
          d = Math.hypot(dx, dy)
        if (d > 2) this.direction = { x: dx / d, y: dy / d }
        ;({ power, pull } = shotStrength(d))
        tip += pull * 110
      }
      if (stroke) {
        x = stroke.x
        y = stroke.y
        const d = Math.hypot(stroke.dx, stroke.dy)
        this.direction = { x: stroke.dx / d, y: stroke.dy / d }
        const strength = shotStrength(d)
        power = strength.power
        pull = strength.pull
        const progress = Math.min(1, stroke.elapsed / strength.impactMs)
        tip = 20 + pull * 110 - (8 + pull * 110) * progress * progress
        if (stroke.elapsed >= strength.impactMs) {
          const after = stroke.elapsed - strength.impactMs
          const follow = Math.min(1, after / 100)
          tip = 12 - (5 + power * 12) * (1 - Math.pow(1 - follow, 2))
          cueAlpha = Math.max(0, 1 - Math.max(0, after - 90) / 110)
          flash = Math.max(0, 1 - after / 90)
        }
      }
      const visible = state.phase === 'aim' || !!(stroke && cueAlpha > 0)
      if (visible) {
        const { x: nx, y: ny } = this.direction
        const c = this.cueGraphics
        // Keep the tip anchored at the ball; shorten the off-table tail near screen edges.
        const roomX =
          nx > 0 ? (x + MARGIN - 4) / nx : nx < 0 ? (WIDTH - 4 - x - MARGIN) / -nx : Infinity
        const roomY =
          ny > 0 ? (y + MARGIN - 54) / ny : ny < 0 ? (HEIGHT - 4 - y - MARGIN) / -ny : Infinity
        tip = Math.min(tip, Math.max(12, Math.min(roomX, roomY) - 40))
        const tipX = x + MARGIN - nx * tip,
          tipY = y + MARGIN - ny * tip
        const edgeX = nx > 0 ? (tipX - 4) / nx : nx < 0 ? (WIDTH - 4 - tipX) / -nx : Infinity
        const edgeY = ny > 0 ? (tipY - 54) / ny : ny < 0 ? (HEIGHT - 4 - tipY) / -ny : Infinity
        const length = Math.max(0, Math.min(160, edgeX, edgeY))
        const segment = (from: number, to: number, width: number, color: number) => {
          c.lineStyle(width, color, cueAlpha)
          c.lineBetween(
            tipX - nx * length * from,
            tipY - ny * length * from,
            tipX - nx * length * to,
            tipY - ny * length * to,
          )
        }
        segment(0, 1, 6, 0x583829)
        segment(0, 0.72, 4, 0xc79a5a)
        segment(0, 0.35, 3, 0xf1dfb3)
        segment(0.73, 0.96, 6, 0x412c28)
        segment(0.7, 0.73, 6, 0xd8c8a4)
        segment(0, 0.04, 3, 0xfaf3db)
        c.fillStyle(0x65b3c9, cueAlpha)
        c.fillCircle(tipX, tipY, 2)
        if (flash > 0) {
          c.lineStyle(1.5, 0xffe4a0, flash)
          c.strokeCircle(x + MARGIN - nx * 12, y + MARGIN - ny * 12, 3 + (1 - flash) * 10)
        }
        if (this.drag) {
          for (let length = 20; length < 210; length += 9) {
            const px = x + nx * length,
              py = y + ny * length
            if (
              px < 40 ||
              px > 320 ||
              py < 40 ||
              py > 480 ||
              state.balls.some((o) => o.id !== 0 && Math.hypot(o.x - px, o.y - py) < 24)
            )
              break
            g.fillStyle(0xffffff, 0.6)
            g.fillCircle(px + MARGIN, py + MARGIN, 1.6)
          }
        }
      }
      if (this.drag || (stroke && state.phase === 'striking')) {
        const barX = WIDTH / 2 - 110,
          barY = 42
        g.fillStyle(0xe7dbcb)
        g.fillRoundedRect(barX, barY, 220, 8, 4)
        const color = power < 0.35 ? 0x4faaa2 : power < 0.7 ? 0xc7a144 : 0xd97943
        if (power > 0) {
          g.fillStyle(color)
          g.fillRoundedRect(barX, barY, Math.max(4, 220 * power), 8, 4)
        }
        if (power >= 0.999) {
          g.lineStyle(2, 0xd97943, 0.45 + Math.sin(time / 130) * 0.2)
          g.strokeRoundedRect(barX - 3, barY - 3, 226, 14, 7)
        }
      }
      this.label.setText(
        this.drag
          ? power === 0
            ? '취소 구간 · 더 당겨주세요'
            : `약하게 ━ ${Math.round(power * 100)}% ━ 세게`
          : state.phase === 'aim'
            ? '흰 공에서 떨어진 곳을 누르고 뒤로 당겨주세요'
            : '',
      )
    }
  }
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#fff8ec',
    scene: BilliardsScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true },
    banner: false,
  })
}
