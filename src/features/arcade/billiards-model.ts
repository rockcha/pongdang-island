export const TABLE = { width: 360, height: 520, radius: 12, inset: 28 }
export const CUE_GRAB_DISTANCE = 30
/** Clicking selects a side; only additional outward dragging adds shot power. */
export function cueDrag(
  ball: { x: number; y: number },
  start: { x: number; y: number },
  pointer: { x: number; y: number },
) {
  const initial = Math.hypot(start.x - ball.x, start.y - ball.y)
  const distance = Math.hypot(pointer.x - ball.x, pointer.y - ball.y)
  const nx = distance > 0 ? (ball.x - pointer.x) / distance : (ball.x - start.x) / (initial || 1)
  const ny = distance > 0 ? (ball.y - pointer.y) / distance : (ball.y - start.y) / (initial || 1)
  const pull = distance < CUE_GRAB_DISTANCE ? 0 : Math.max(0, distance - initial)
  return { nx, ny, dx: nx * pull, dy: ny * pull }
}
export const SHOT = {
  maxPull: 100,
  deadZone: 10,
  maxSpeed: 920,
  rollingDeceleration: 105,
  cushionRestitution: 0.93,
  ballRestitution: 0.97,
}
/** The preview and physics share one power curve, including the cancel zone. */
export function shotStrength(distance: number) {
  const pull = Math.max(0, Math.min(distance / SHOT.maxPull, 1))
  const active = Math.max(
    0,
    (pull - SHOT.deadZone / SHOT.maxPull) / (1 - SHOT.deadZone / SHOT.maxPull),
  )
  const power = active > 0 ? 0.04 + 0.96 * Math.pow(active, 1.55) : 0
  return { pull, power, speed: power * SHOT.maxSpeed, impactMs: 260 - power * 140 }
}
export type Ball = {
  id: number
  kind: 'cue' | 'red' | 'yellow'
  x: number
  y: number
  vx: number
  vy: number
}
export type Billiards = {
  lives: number
  shotCount: number
  balls: Ball[]
  phase: 'aim' | 'striking' | 'moving' | 'lost'
  message: string
  hits: number[]
  foul: boolean
  score: number
  stroke: { dx: number; dy: number; elapsed: number; x: number; y: number } | null
}
export function createBilliards(): Billiards {
  return {
    lives: 5,
    shotCount: 0,
    balls: [
      [180, 390],
      [170, 240],
      [195, 205],
      [290, 100],
    ].map(([x, y], id) => ({
      id,
      kind: id === 0 ? 'cue' : id === 3 ? 'yellow' : 'red',
      x,
      y,
      vx: 0,
      vy: 0,
    })),
    phase: 'aim',
    message: '흰 공에서 떨어진 곳을 누르고 뒤로 당겨 시작하세요.',
    hits: [],
    foul: false,
    score: 0,
    stroke: null,
  }
}
export function shoot(state: Billiards, dx: number, dy: number) {
  if (
    state.phase !== 'aim' ||
    state.lives <= 0 ||
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    Math.hypot(dx, dy) <= SHOT.deadZone
  )
    return false
  state.shotCount++
  state.hits = []
  state.foul = false
  state.stroke = { dx, dy, elapsed: 0, x: state.balls[0].x, y: state.balls[0].y }
  state.phase = 'striking'
  state.message = '큐를 밀어 넣어요.'
  return true
}
export function stepBilliards(state: Billiards, dt: number) {
  if (dt <= 0 || !Number.isFinite(dt)) return
  const time = Math.min(dt, 0.05)
  let movementTime = time
  if (state.stroke) state.stroke.elapsed += time * 1000
  if (state.phase === 'striking') {
    if (!state.stroke) return
    const { dx, dy } = state.stroke,
      d = Math.hypot(dx, dy),
      { speed, impactMs } = shotStrength(d)
    if (state.stroke.elapsed < impactMs) return
    movementTime = Math.min(time, (state.stroke.elapsed - impactMs) / 1000)
    state.balls[0].vx = (dx / d) * speed
    state.balls[0].vy = (dy / d) * speed
    state.phase = 'moving'
    state.message = '빨간 공 두 개를 맞혀주세요.'
  }
  if (state.phase !== 'moving') return
  const steps = Math.max(1, Math.ceil(movementTime / (1 / 240))),
    delta = movementTime / steps
  for (let step = 0; step < steps; step++) {
    for (const b of state.balls) {
      const speed = Math.hypot(b.vx, b.vy)
      if (speed > 0) {
        const movingFor = Math.min(delta, speed / SHOT.rollingDeceleration)
        const travel = speed * movingFor - 0.5 * SHOT.rollingDeceleration * movingFor * movingFor
        b.x += (b.vx / speed) * travel
        b.y += (b.vy / speed) * travel
        const ratio = Math.max(0, speed - SHOT.rollingDeceleration * delta) / speed
        b.vx *= ratio
        b.vy *= ratio
      }
      const lo = TABLE.inset + TABLE.radius,
        hiX = TABLE.width - lo,
        hiY = TABLE.height - lo
      if (b.x < lo || b.x > hiX) {
        b.x = Math.max(lo, Math.min(hiX, b.x))
        b.vx *= -SHOT.cushionRestitution
      }
      if (b.y < lo || b.y > hiY) {
        b.y = Math.max(lo, Math.min(hiY, b.y))
        b.vy *= -SHOT.cushionRestitution
      }
    }
    for (let i = 0; i < state.balls.length; i++)
      for (let j = i + 1; j < state.balls.length; j++) {
        const a = state.balls[i],
          b = state.balls[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy)
        if (d >= TABLE.radius * 2) continue
        const nx = d ? dx / d : 1,
          ny = d ? dy / d : 0,
          overlap = (TABLE.radius * 2 - d) / 2
        a.x -= nx * overlap
        a.y -= ny * overlap
        b.x += nx * overlap
        b.y += ny * overlap
        const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
        if (approach > 0) {
          const impulse = (approach * (1 + SHOT.ballRestitution)) / 2
          a.vx -= impulse * nx
          a.vy -= impulse * ny
          b.vx += impulse * nx
          b.vy += impulse * ny
          const other = a.kind === 'cue' ? b : b.kind === 'cue' ? a : null
          if (other?.kind === 'yellow') {
            state.foul = true
            state.message = '상대 공 접촉! 이번 샷은 −1점이에요.'
          }
          if (other?.kind === 'red' && !state.hits.includes(other.id)) {
            state.hits.push(other.id)
            if (!state.foul)
              state.message =
                state.hits.length === 2
                  ? '빨간 공 두 개 접촉! 공이 멈추면 득점해요.'
                  : '첫 번째 빨간 공에 맞았어요!'
          }
        }
      }
  }
  if (state.balls.every((b) => b.vx === 0 && b.vy === 0)) {
    const success = state.hits.length === 2 && !state.foul
    if (success) state.score++
    else {
      state.lives--
      if (state.foul) state.score--
    }
    state.phase = state.lives <= 0 ? 'lost' : 'aim'
    state.stroke = null
    state.message = success
      ? '득점! +1 · 목숨 유지! 같은 자리에서 계속 쳐보세요.'
      : state.foul
        ? '노란 공 접촉 · −1점 / 목숨 −1'
        : '득점 실패 · 목숨 −1'
    if (state.phase === 'lost') state.message += ' · 도전 종료'
  }
}
