import { BrickPractice } from './brick-breaker-model'

export const BRICK_ENGINE_VERSION = 2
export const BRICK_TICK = 1 / 120
// A full 30-minute run can contain 60 target updates per second.
export const MAX_BRICK_INPUTS = 120000
export const MAX_BRICK_REPLAY_BYTES = 8000000
export type BrickInput = {
  tick: number
  action: 'direction' | 'target' | 'launch' | 'next'
  value?: number
}
export type BrickReplay = { ticks: number; inputs: BrickInput[] }
export function brickRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export class BrickSession {
  readonly model: BrickPractice
  ticks = 0
  inputs: BrickInput[] = []
  direction: -1 | 0 | 1 = 0
  target: number | null = null
  private accumulator = 0
  constructor(seed: number) {
    this.model = new BrickPractice(brickRandom(seed))
  }
  command(action: BrickInput['action'], value?: number) {
    if (action === 'direction' && value === this.direction && this.target === null) return
    if (action === 'target' && value === this.target) return
    const last = this.inputs[this.inputs.length - 1]
    if (action === 'target' && last?.action === 'target' && this.ticks - last.tick < 2) return
    if (this.inputs.length >= MAX_BRICK_INPUTS) throw new Error('INPUT_LIMIT')
    this.inputs.push({ tick: this.ticks, action, ...(value === undefined ? {} : { value }) })
    this.apply(action, value)
  }
  apply(action: BrickInput['action'], value?: number) {
    if (action === 'target') {
      this.target = value ?? this.model.paddleX
      this.direction = 0
    } else if (action === 'direction') {
      this.direction = (value ?? 0) as -1 | 0 | 1
      this.target = null
    } else if (action === 'launch') this.model.launch()
    else {
      this.direction = 0
      this.target = null
      this.model.nextRound()
    }
  }
  step() {
    if (this.target !== null) this.model.moveTarget(this.target, BRICK_TICK)
    else if (this.direction)
      this.model.moveInput(this.model.paddleX + this.direction * 420 * BRICK_TICK, BRICK_TICK)
    this.model.step(BRICK_TICK)
    this.ticks++
  }
  advance(seconds: number) {
    this.accumulator += Math.max(0, Math.min(0.05, seconds))
    while (this.accumulator >= BRICK_TICK) {
      this.step()
      this.accumulator -= BRICK_TICK
    }
  }
  replay(): BrickReplay {
    return { ticks: this.ticks, inputs: this.inputs.map((input) => ({ ...input })) }
  }
}
/** Inputs, movement speed, damage and rewards all use the same simulation as the browser. */
export function verifyBrickReplay(seed: number, replay: BrickReplay, elapsedSeconds: number) {
  if (
    !replay ||
    !Number.isInteger(replay.ticks) ||
    replay.ticks < 0 ||
    replay.ticks > 216000 ||
    replay.ticks / 120 > elapsedSeconds + 2 ||
    !Array.isArray(replay.inputs) ||
    replay.inputs.length > MAX_BRICK_INPUTS
  )
    throw new Error('INVALID_REPLAY')
  const session = new BrickSession(seed)
  let previous = -1
  for (const input of replay.inputs) {
    if (
      !Number.isInteger(input.tick) ||
      input.tick < previous ||
      input.tick > replay.ticks ||
      !['direction', 'target', 'launch', 'next'].includes(input.action) ||
      (input.action === 'direction' && ![-1, 0, 1].includes(input.value!)) ||
      (input.action === 'target' &&
        (!Number.isFinite(input.value) || input.value! < 0 || input.value! > 360))
    )
      throw new Error('INVALID_INPUT')
    previous = input.tick
  }
  let index = 0
  for (let tick = 0; tick <= replay.ticks; tick++) {
    while (index < replay.inputs.length && replay.inputs[index].tick === tick) {
      const input = replay.inputs[index++]
      session.apply(input.action, input.value)
    }
    if (tick < replay.ticks) session.step()
    session.model.drainImpacts()
    session.model.drainFeedback()
    session.model.drainSongs()
    session.model.drainAnchorSlams()
    session.model.drainTorpedoBlasts()
    session.model.drainPaddleHit()
  }
  return {
    score: 0,
    reward: session.model.reward,
    round: session.model.round,
    lives: session.model.lives,
  }
}
