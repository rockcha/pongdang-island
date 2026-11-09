import { describe, it, expect } from 'vitest'
import {
  createBilliards,
  cueDrag,
  canGrabCue,
  shoot,
  stepBilliards,
  SHOT,
  shotStrength,
  TABLE,
  type Billiards,
} from '../src/features/arcade/billiards-model'
function stop(s: Billiards) {
  for (const b of s.balls) {
    b.vx = 0
    b.vy = 0
  }
  stepBilliards(s, 1 / 240)
}
function contact(s: Billiards, id: number, onContact?: Parameters<typeof stepBilliards>[2]) {
  s.phase = 'moving'
  s.balls.forEach((b, i) => Object.assign(b, { x: 60 + i * 65, y: 100, vx: 0, vy: 0 }))
  Object.assign(s.balls[0], { x: 150, y: 350, vx: 100, vy: 0 })
  Object.assign(s.balls[id], { x: 173, y: 350 })
  stepBilliards(s, 1 / 240, onContact)
}
describe('four-ball practice', () => {
  it('only allows grabbing the existing cue, with a forgiving touch margin', () => {
    const start = { x: 100, y: 100 },
      end = { x: 100, y: 230 }
    expect(canGrabCue({ x: 115, y: 170 }, start, end)).toBe(true)
    expect(canGrabCue({ x: 200, y: 170 }, start, end)).toBe(false)
    expect(canGrabCue({ x: 100, y: 60 }, start, end)).toBe(false)
    expect(canGrabCue(start, start, start)).toBe(false)
  })
  it('rotates around the white ball without adding power at the same radius', () => {
    const ball = { x: 200, y: 200 },
      start = { x: 200, y: 300 }
    const aim = cueDrag(ball, start, { x: 300, y: 200 })
    expect(aim.nx).toBe(-1)
    expect(Math.hypot(aim.dx, aim.dy)).toBe(0)
  })
  it('places the cue on click without firing and measures only added pull', () => {
    const s = createBilliards(),
      ball = s.balls[0]
    const start = { x: ball.x + 100, y: ball.y }
    const click = cueDrag(ball, start, start)
    expect(click.nx).toBe(-1)
    expect(shoot(s, click.dx, click.dy)).toBe(false)
    expect(s.shotCount).toBe(0)
    const pulled = cueDrag(ball, start, { x: start.x + 80, y: start.y })
    expect(pulled.dx).toBe(-80)
    expect(pulled.dy).toBeCloseTo(0)
    expect(shoot(s, pulled.dx, pulled.dy)).toBe(true)
  })
  it('cancels power when dragging inward or across the white ball', () => {
    const ball = { x: 180, y: 260 },
      start = { x: 280, y: 260 }
    for (const pointer of [{ x: 240, y: 260 }, ball, { x: 160, y: 260 }]) {
      const aim = cueDrag(ball, start, pointer)
      expect(Math.hypot(aim.dx, aim.dy)).toBe(0)
      expect(Number.isFinite(aim.nx)).toBe(true)
    }
  })
  it('starts a five-life game with four separated balls', () => {
    const s = createBilliards()
    expect(s.lives).toBe(5)
    expect(s.score).toBe(0)
    expect(s.balls.map((b) => b.kind)).toEqual(['cue', 'red', 'red', 'yellow'])
    s.balls.forEach((b, i) =>
      s.balls
        .slice(i + 1)
        .forEach((o) => expect(Math.hypot(b.x - o.x, b.y - o.y)).toBeGreaterThan(TABLE.radius * 2)),
    )
  })
  it.each([20, 50, 100])('starts movement only at impact for pull %i', (pull) => {
    const s = createBilliards()
    expect(shoot(s, 1, 1)).toBe(false)
    expect(shoot(s, 0, -pull)).toBe(true)
    expect(shoot(s, 0, -pull)).toBe(false)
    expect(s.phase).toBe('striking')
    expect(s.lives).toBe(5)
    const impactMs = shotStrength(pull).impactMs
    let elapsed = 0
    while (elapsed < impactMs - 1) {
      const ms = Math.min(10, impactMs - 1 - elapsed)
      stepBilliards(s, ms / 1000)
      elapsed += ms
    }
    expect(s.balls[0].y).toBe(390)
    stepBilliards(s, 0.002)
    expect(s.phase).toBe('moving')
    expect(s.balls[0].y).toBeLessThan(390)
  })
  it('offers fine low-power control, a cancel zone and a capped maximum', () => {
    const s = createBilliards()
    expect(shoot(s, SHOT.deadZone, 0)).toBe(false)
    expect(s.lives).toBe(5)
    expect(shotStrength(SHOT.deadZone).power).toBe(0)
    expect(shotStrength(25).power).toBeLessThan(0.2)
    expect(shotStrength(45).power).toBeGreaterThan(0.5)
    expect(shotStrength(60).power).toBe(1)
    expect(shotStrength(1000).speed).toBe(SHOT.maxSpeed)
    expect(shotStrength(20).impactMs).toBeGreaterThan(shotStrength(100).impactMs)
    let last = 0
    for (let distance = 11; distance <= SHOT.maxPull; distance++) {
      const power = shotStrength(distance).power
      expect(power).toBeGreaterThan(last)
      last = power
    }
  })
  it('uses equal rolling deceleration for weak and strong shots', () => {
    for (const speed of [100, 500]) {
      const s = createBilliards()
      s.phase = 'moving'
      s.balls[0].vx = speed
      stepBilliards(s, 0.05)
      stepBilliards(s, 0.05)
      expect(s.balls[0].vx).toBeCloseTo(speed - SHOT.rollingDeceleration * 0.1, 6)
    }
  })
  it('stops gently at the same distance across frame rates', () => {
    for (const fps of [30, 60, 120]) {
      const s = createBilliards()
      s.balls = [s.balls[0]]
      Object.assign(s.balls[0], { x: 80, y: 400, vx: 200, vy: 0 })
      s.phase = 'moving'
      for (let i = 0; i < fps * 3; i++) stepBilliards(s, 1 / fps)
      expect(s.balls[0].vx).toBe(0)
      expect(s.balls[0].x).toBeCloseTo(80 + 200 ** 2 / (2 * SHOT.rollingDeceleration), 5)
    }
  })
  it('awards ten points immediately per distinct red, without extra settlement points', () => {
    const s = createBilliards()
    contact(s, 1)
    contact(s, 1)
    expect(s.hits).toEqual([1])
    contact(s, 2)
    expect(s.score).toBe(20)
    stop(s)
    expect(s.phase).toBe('aim')
    expect(s.score).toBe(20)
    expect(s.lives).toBe(5)
    const positions = s.balls.map((b) => [b.x, b.y])
    stepBilliards(s, 0.05)
    expect(s.score).toBe(20)
    expect(shoot(s, 0, -50)).toBe(true)
    expect(s.balls.map((b) => [b.x, b.y])).toEqual(positions)
  })
  it('subtracts ten points only once for yellow, preserving earned red points', () => {
    const s = createBilliards()
    contact(s, 1)
    contact(s, 2)
    contact(s, 3)
    contact(s, 3)
    stop(s)
    expect(s.foul).toBe(true)
    expect(s.score).toBe(10)
    expect(s.lives).toBe(4)
    stepBilliards(s, 0.05)
    expect(s.score).toBe(10)
    expect(s.lives).toBe(4)
    expect(s.phase).toBe('aim')
  })
  it('allows red balls to hit the yellow ball', () => {
    const s = createBilliards()
    s.phase = 'moving'
    Object.assign(s.balls[1], { x: 200, y: 200, vx: 100 })
    Object.assign(s.balls[3], { x: 223, y: 200 })
    stepBilliards(s, 1 / 240)
    expect(s.foul).toBe(false)
    expect(s.hits).toHaveLength(0)
  })
  it('keeps the last life after scoring and continues at the same positions', () => {
    const s = createBilliards()
    s.lives = 1
    shoot(s, 0, -80)
    contact(s, 1)
    stop(s)
    expect(s.phase).toBe('lost')
    const t = createBilliards()
    t.lives = 1
    shoot(t, 0, -80)
    contact(t, 1)
    contact(t, 2)
    stop(t)
    expect(t.phase).toBe('aim')
    expect(t.lives).toBe(1)
    expect(t.score).toBe(20)
    const u = createBilliards()
    contact(u, 3)
    stop(u)
    const positions = u.balls.map((b) => [b.x, b.y])
    shoot(u, 40, -40)
    expect(u.foul).toBe(false)
    expect(u.hits).toEqual([])
    expect(u.balls.map((b) => [b.x, b.y])).toEqual(positions)
  })
  it('keeps balls on the pocketless table and eventually stops', () => {
    const s = createBilliards()
    shoot(s, -80, -80)
    for (let i = 0; i < 1200; i++) stepBilliards(s, 1 / 60)
    expect(s.phase).not.toBe('moving')
    for (const b of s.balls) {
      expect(b.x).toBeGreaterThanOrEqual(39)
      expect(b.x).toBeLessThanOrEqual(321)
      expect(b.y).toBeGreaterThanOrEqual(39)
      expect(b.y).toBeLessThanOrEqual(481)
    }
  })
})

it('ends after five misses, without spending life for starting or cancelling a shot', () => {
  const s = createBilliards()
  for (let i = 0; i < 5; i++) {
    expect(shoot(s, 0, 0)).toBe(false)
    expect(s.lives).toBe(5 - i)
    expect(shoot(s, 20, 0)).toBe(true)
    s.phase = 'moving'
    stop(s)
    expect(s.lives).toBe(4 - i)
  }
  expect(s.phase).toBe('lost')
  expect(s.score).toBe(0)
  expect(shoot(s, 20, 0)).toBe(false)
  stepBilliards(s, 0.05)
  expect(s.lives).toBe(0)
})

it('emits contact feedback once per target per shot and preserves a single red score', () => {
  const s = createBilliards(),
    events: number[] = []
  const feedback: NonNullable<Parameters<typeof stepBilliards>[2]> = (ball) => events.push(ball.id)
  contact(s, 1, feedback)
  contact(s, 1, feedback)
  expect(s.score).toBe(10)
  stop(s)
  expect(s.score).toBe(10)
  expect(s.lives).toBe(4)
  shoot(s, 20, 0)
  contact(s, 3, feedback)
  contact(s, 3, feedback)
  expect(s.score).toBe(0)
  contact(s, 1, feedback)
  expect(s.score).toBe(10)
  expect(events).toEqual([1, 3, 1])
})
