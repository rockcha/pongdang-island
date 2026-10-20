import {
  BOARD,
  BRICK,
  BRICK_COUNT,
  BALL_SPEED_MULTIPLIER,
  STAR_SHOT,
  TORPEDO_HAZARD,
} from './brick-breaker-config'
import { advanceWave, advanceDash, advanceStar } from './brick-breaker-projectiles'
import type { WaveShot, DashShot, StarShot } from './brick-breaker-projectiles'
import { advanceAnchor, advanceSwimmer, advanceTorpedo } from './brick-breaker-hazards'
import { brickRound, roundBrickHp, MAX_BRICK_ROUNDS } from './brick-breaker-rounds'
export { BOARD, BRICK, BRICK_COUNT } from './brick-breaker-config'
export type Brick = { id: number; x: number; y: number; hp: number; maxHp: number }
export type BrickImpact = {
  brickId: number
  x: number
  y: number
  hp: number
  destroyed: boolean
  source: 'ball' | 'torpedo' | 'wave' | 'dash' | 'star' | 'song'
}
export const ITEM_KINDS = [
  'item',
  'wide',
  'shield',
  'split',
  'magnet',
  'wave',
  'dash',
  'star',
  'pirate',
  'whale',
  'treasure',
  'heart',
] as const
export const HAZARD_KINDS = [
  'shark',
  'urchin',
  'ink',
  'seaweed',
  'puffer',
  'sticky',
  'shrink',
  'anchor',
  'jelly',
  'torpedo',
  'poison',
] as const
export type DropKind = (typeof ITEM_KINDS)[number] | (typeof HAZARD_KINDS)[number]
export const isItem = (kind: DropKind) => ITEM_KINDS.some((item) => item === kind)
export type Drop = {
  id: number
  kind: DropKind
  x: number
  y: number
  warning: number
  vx?: number
  vy?: number
  rotation?: number
  age?: number
  targetX?: number
  targetY?: number
  originX?: number
  originY?: number
  bottle?: boolean
  emitted?: number
}
export const POISON_POURS = [1.25, 1.95, 2.66] as const
export function pufferRadius(age: number) {
  return 12 + 3 * (1 - Math.cos((age * Math.PI * 2) / 1.2))
}
export function pufferFrame(age: number) {
  return Math.floor((age % 1.2) / 0.3) % 4
}
export function itemDrop(roll: number): (typeof ITEM_KINDS)[number] {
  return ITEM_KINDS[
    Math.max(0, Math.min(ITEM_KINDS.length - 1, Math.floor(roll * ITEM_KINDS.length)))
  ]
}
export type Ball = { x: number; y: number; vx: number; vy: number; held?: boolean; offset?: number }
export function hazardTouches(drop: Drop, paddleX: number, paddleY: number, paddleWidth: number) {
  if (drop.bottle) return false
  const dx = Math.max(0, Math.abs(drop.x - paddleX) - Math.max(12, paddleWidth / 2 - 5)),
    dy = Math.max(0, Math.abs(drop.y - paddleY) - 4)
  if (drop.kind === 'shark') return (dx / 9) ** 2 + (dy / 17) ** 2 <= 1
  const radius =
    drop.kind === 'puffer'
      ? pufferRadius(drop.age ?? 0) * 0.5
      : drop.kind === 'anchor'
        ? 11
        : drop.kind === 'urchin'
          ? 6
          : drop.kind === 'jelly'
            ? 9
            : 8
  return dx * dx + dy * dy <= radius * radius
}
export type Shot = { id: number; x: number; y: number }
export type DropFeedback = { kind: 'item' | 'hazard'; message: string }
export type BrickPhase = 'ready' | 'playing' | 'round-clear' | 'over' | 'banked'
export type BrickEffect = { kind: DropKind; label: string; seconds?: number }
export type BrickScore = {
  phase: BrickPhase
  round: number
  lives: number
  remaining: number
  testMode?: boolean
  held?: boolean
  reward?: number
  roundReward?: number
  effects?: BrickEffect[]
}
export function brickDrop(roll: number): Drop['kind'] | null {
  return roll < 0.15 ? 'shark' : roll < 0.3 ? 'item' : null
}

/** Deterministic simulation shared by practice, real play and server verification. */
export class BrickPractice {
  private paddleHit = false
  drainPaddleHit() {
    const hit = this.paddleHit
    this.paddleHit = false
    return hit
  }
  phase: BrickPhase = 'ready'
  round = 1
  lives = 3
  paddleX = 180
  invulnerable = 0
  reward = 0
  testMode = false
  labMode = false
  previewKind: DropKind | null = null
  previewSeconds = 0
  balls: Ball[] = [{ x: 180, y: 450, vx: 0, vy: 0 }]
  get ball() {
    return this.balls[0]
  }
  set ball(value: Ball) {
    this.balls = [value]
  }
  wideSeconds = 0
  shrinkSeconds = 0
  fastSeconds = 0
  inkSeconds = 0
  stickySeconds = 0
  shield = false
  splitArmed = false
  magnetArmed = false
  private anchorSlams: { x: number; y: number }[] = []
  private torpedoBlasts: { x: number; y: number }[] = []
  private songs: { y: number }[] = []
  inkPatches: { x: number; y: number; radius: number }[] = []
  get paddleWidth() {
    return this.shrinkSeconds > 0 ? 54 : this.wideSeconds > 0 ? 124 : BOARD.paddleWidth
  }
  bricks: Brick[] = []
  drops: Drop[] = []
  shots: Shot[] = []
  waveShots: WaveShot[] = []
  dashShots: DashShot[] = []
  starShots: StarShot[] = []
  height: number = BOARD.height
  get paddleY() {
    return this.height - (BOARD.height - BOARD.paddleY)
  }
  private impacts: BrickImpact[] = []
  private feedback: DropFeedback[] = []
  private serial = 0
  private random: () => number
  constructor(random: () => number = Math.random) {
    this.random = random
    this.buildRound()
  }
  enterLaboratory() {
    this.labMode = true
    this.testMode = true
    this.buildRound()
    this.phase = 'playing'
    this.balls = []
  }
  previewSkill(kind: DropKind) {
    if (!this.labMode) return
    this.spawnDrop(kind, this.paddleX, 48)
  }
  activeEffects(): BrickEffect[] {
    const effects: BrickEffect[] = []
    for (const [kind, label, seconds] of [
      ['wide', '긴 널판지', this.wideSeconds],
      ['shrink', '널판지 축소', this.shrinkSeconds],
      ['seaweed', '공 속도 증가', this.fastSeconds],
      ['ink', '먹물', this.inkSeconds],
      ['sticky', '끈끈이', this.stickySeconds],
    ] as const) {
      if (seconds > 0) effects.push({ kind, label, seconds: Math.ceil(seconds) })
    }
    if (this.shield) effects.push({ kind: 'shield', label: '보호막 1회' })
    if (this.splitArmed) effects.push({ kind: 'split', label: '다음 패들에서 분열' })
    else if (this.balls.length > 1) effects.push({ kind: 'split', label: '공 2개' })
    if (this.magnetArmed || this.balls.some((ball) => ball.held))
      effects.push({ kind: 'magnet', label: this.magnetArmed ? '자석 대기' : '공 발사 대기' })
    return effects
  }
  score(): BrickScore {
    return {
      phase: this.phase,
      round: this.round,
      lives: this.lives,
      remaining: this.bricks.length,
      testMode: this.testMode,
      held: this.balls.some((b) => b.held),
      reward: this.reward,
      roundReward: brickRound(this.round).reward,
      effects: this.activeEffects(),
    }
  }
  resize(height: number) {
    const previous = this.height
    this.height = Math.max(280, height)
    for (const brick of this.bricks) {
      brick.x = BRICK.left + (brick.id % BRICK.columns) * (BRICK.width + BRICK.gapX)
      brick.y = this.brickTop() + Math.floor(brick.id / BRICK.columns) * (BRICK.height + BRICK.gapY)
    }
    if (this.phase === 'ready') this.resetBall()
    else {
      for (const ball of this.balls) ball.y *= this.height / previous
      for (const drop of this.drops) drop.y *= this.height / previous
      for (const shot of this.shots) shot.y *= this.height / previous
    }
    for (const shot of this.waveShots) shot.y *= this.height / previous
    for (const shot of this.dashShots) shot.y *= this.height / previous
    for (const shot of this.starShots) shot.y *= this.height / previous
    for (const patch of this.inkPatches) patch.y *= this.height / previous
    this.move(this.paddleX)
  }
  drainImpacts() {
    const events = this.impacts
    this.impacts = []
    return events
  }
  drainFeedback() {
    const events = this.feedback
    this.feedback = []
    return events
  }
  drainSongs() {
    const events = this.songs
    this.songs = []
    return events
  }
  drainAnchorSlams() {
    const events = this.anchorSlams
    this.anchorSlams = []
    return events
  }
  drainTorpedoBlasts() {
    const events = this.torpedoBlasts
    this.torpedoBlasts = []
    return events
  }
  spawnTestDrop(kind: Drop['kind']) {
    if (this.phase !== 'ready' && this.phase !== 'playing') return
    this.testMode = true
    if (this.drops.length >= 30) return
    this.launch()
    this.spawnDrop(kind, this.paddleX, Math.max(32, this.paddleY - 150))
  }
  private spawnDrop(kind: DropKind, x: number, y: number) {
    const count = kind === 'urchin' ? 3 : kind === 'puffer' ? 2 : 1
    if (this.drops.length + count > 30) return
    if (kind === 'poison') {
      this.drops.push({
        id: ++this.serial,
        kind,
        x,
        y,
        age: 0,
        warning: 0,
        bottle: true,
        emitted: 0,
      })
      return
    }
    if (kind === 'torpedo') {
      this.drops.push({
        id: ++this.serial,
        kind,
        x,
        y,
        originX: x,
        originY: y,
        targetX: x < BOARD.width / 2 ? TORPEDO_HAZARD.edge : BOARD.width - TORPEDO_HAZARD.edge,
        targetY: this.paddleY,
        age: 0,
        warning: 0,
      })
      return
    }
    if (kind === 'shark') {
      const targetX = this.paddleX,
        targetY = this.paddleY,
        dx = targetX - x,
        dy = targetY - y,
        distance = Math.hypot(dx, dy) || 1
      this.drops.push({
        id: ++this.serial,
        kind,
        x,
        y,
        age: 0,
        warning: 0.45,
        targetX,
        targetY,
        vx: (dx / distance) * 440,
        vy: (dy / distance) * 440,
      })
      return
    }
    for (let i = 0; i < count; i++)
      this.drops.push({
        id: ++this.serial,
        kind,
        x,
        y,
        age: 0,
        warning: 0,
        ...(kind === 'urchin'
          ? {
              vx: (i - 1) * 55 + (this.random() - 0.5) * 30,
              vy: -110 - this.random() * 90,
              rotation: (i * Math.PI * 2) / 3,
            }
          : kind === 'puffer'
            ? { vx: i === 0 ? -12 : 12, vy: 38 }
            : kind === 'anchor'
              ? { vy: 6 }
              : kind === 'jelly'
                ? { originX: x }
                : {}),
      })
  }
  move(x: number) {
    this.paddleX = Math.max(
      this.paddleWidth / 2 + 8,
      Math.min(BOARD.width - this.paddleWidth / 2 - 8, x),
    )
    if (this.phase === 'ready') this.ball.x = this.paddleX
    for (const b of this.balls)
      if (b.held) {
        b.offset = Math.max(
          -this.paddleWidth / 2 + 6,
          Math.min(this.paddleWidth / 2 - 6, b.offset ?? 0),
        )
        b.x = this.paddleX + b.offset
        b.y = this.paddleY - 12
      }
  }
  moveTarget(x: number, seconds: number) {
    const distance = 960 * (this.stickySeconds > 0 ? 0.5 : 1) * Math.max(0, Math.min(0.05, seconds))
    this.move(this.paddleX + Math.max(-distance, Math.min(distance, x - this.paddleX)))
  }
  moveInput(x: number, seconds: number) {
    const max = 420 * 0.5 * Math.max(0, Math.min(0.1, seconds))
    this.move(
      this.stickySeconds > 0 ? this.paddleX + Math.max(-max, Math.min(max, x - this.paddleX)) : x,
    )
  }
  launch() {
    if (this.labMode) return
    const boost = this.fastSeconds > 0 ? 1.5 : 1
    if (this.phase === 'playing') {
      for (const b of [...this.balls])
        if (b.held) {
          const angle = ((b.offset ?? 0) / (this.paddleWidth / 2)) * 0.8,
            speed = (this.speed() + 35) * BALL_SPEED_MULTIPLIER * boost
          b.held = false
          b.vx = Math.sin(angle) * speed
          b.vy = -Math.cos(angle) * speed
          this.splitFromPaddle(b)
        }
      return
    }
    if (this.phase !== 'ready') return
    this.phase = 'playing'
    this.ball.vx = 105 * BALL_SPEED_MULTIPLIER * boost * (this.random() < 0.5 ? -1 : 1)
    this.ball.vy = -this.speed() * BALL_SPEED_MULTIPLIER * boost
  }
  nextRound() {
    if (this.phase !== 'round-clear') return
    if (this.round >= MAX_BRICK_ROUNDS) {
      this.phase = 'banked'
      return
    }
    this.round++
    this.buildRound()
  }
  bank() {
    if (this.phase === 'round-clear') this.phase = 'banked'
  }
  private speed() {
    return Math.min(330, 225 + (this.round - 1) * 15)
  }
  private buildRound() {
    this.bricks = Array.from({ length: BRICK_COUNT }, (_, id) => {
      const row = Math.floor(id / BRICK.columns),
        col = id % BRICK.columns,
        hp = this.labMode ? 4 : roundBrickHp(this.round, id)
      return {
        id,
        x: BRICK.left + col * (BRICK.width + BRICK.gapX),
        y: this.brickTop() + row * (BRICK.height + BRICK.gapY),
        hp,
        maxHp: hp,
      }
    })
    this.impacts = []
    this.feedback = []
    this.songs = []
    this.anchorSlams = []
    this.torpedoBlasts = []
    this.clearEffects()
    this.invulnerable = 0
    this.drops = []
    this.shots = []
    this.phase = 'ready'
    this.resetBall()
  }
  private brickTop() {
    return Math.max(34, Math.min(78, 48 + (this.height - 230) * 0.27) - BRICK.height * 1.5)
  }
  private resetBall() {
    this.ball = { x: this.paddleX, y: this.paddleY - 16, vx: 0, vy: 0 }
  }
  private clearEffects() {
    this.wideSeconds = 0
    this.shrinkSeconds = 0
    this.fastSeconds = 0
    this.inkSeconds = 0
    this.stickySeconds = 0
    this.inkPatches = []
    this.shield = false
    this.splitArmed = false
    this.magnetArmed = false
    this.waveShots = []
    this.dashShots = []
    this.starShots = []
  }
  damage(missedBall = false) {
    if (this.phase !== 'playing' || (!missedBall && this.invulnerable > 0)) return false
    if (this.testMode) {
      this.invulnerable = 1.1
      if (missedBall) {
        this.resetBall()
        this.phase = 'ready'
        this.launch()
      }
      return true
    }
    this.lives--
    this.invulnerable = 1.1
    if (this.lives <= 0) {
      this.phase = 'over'
      this.clearEffects()
      this.drops = []
      this.shots = []
    } else if (missedBall) {
      // Only a lost final ball needs replacing. Hazard hits keep the live board intact.
      this.phase = 'ready'
      this.resetBall()
      this.launch()
    }
    return true
  }
  hitBrick(id: number, source: BrickImpact['source'] = 'ball') {
    if (this.phase !== 'playing') return
    const brick = this.bricks.find((b) => b.id === id)
    if (!brick) return
    brick.hp = source === 'dash' ? 0 : brick.hp - 1
    this.impacts.push({
      brickId: id,
      x: brick.x + BRICK.width / 2,
      y: brick.y + BRICK.height / 2,
      hp: brick.hp,
      destroyed: brick.hp === 0,
      source,
    })
    if (this.impacts.length > 64) this.impacts.shift()
    if (brick.hp > 0) return
    if (this.labMode) {
      this.bricks = this.bricks.filter((b) => b.id !== id)
      return
    }
    this.bricks = this.bricks.filter((b) => b.id !== id)
    if (!this.bricks.length) {
      this.reward += brickRound(this.round).reward
      this.phase = 'round-clear'
      this.drops = []
      this.shots = []
      this.clearEffects()
      return
    }
    const category = brickDrop(this.random())
    if (category) {
      const kind =
        category === 'item'
          ? itemDrop(this.random())
          : HAZARD_KINDS[
              Math.min(HAZARD_KINDS.length - 1, Math.floor(this.random() * HAZARD_KINDS.length))
            ]
      this.spawnDrop(kind, brick.x + BRICK.width / 2, brick.y + BRICK.height / 2)
    }
  }
  private fire() {
    for (const side of [-1, 1])
      this.shots.push({
        id: ++this.serial,
        x: this.paddleX + side * (this.paddleWidth / 2 - 9),
        y: this.paddleY - 14,
      })
  }
  private collect(drop: Drop) {
    if (this.labMode) {
      this.previewKind = drop.kind
      this.previewSeconds = 2
    }
    if (isItem(drop.kind)) {
      let message = '수중 미사일 발사!'
      if (drop.kind === 'item') this.fire()
      if (drop.kind === 'pirate') {
        if (!this.labMode) this.reward += 20
        message = '해적의 동전! +20 골드'
      }
      if (drop.kind === 'treasure') {
        if (!this.labMode) this.reward += 50
        message = '해적의 보물! +50 골드'
      }
      if (drop.kind === 'whale') {
        const bottomY = Math.max(...this.bricks.map((brick) => brick.y))
        const bottom = this.bricks.filter((brick) => Math.abs(brick.y - bottomY) < 0.1)
        if (bottom.length) {
          this.songs.push({ y: bottomY + BRICK.height / 2 })
          for (const brick of bottom) this.hitBrick(brick.id, 'song')
        }
        message = '혹등고래의 노래! 가장 아래 줄에 피해 1'
      }
      if (drop.kind === 'wide') {
        this.shrinkSeconds = 0
        this.wideSeconds = 8
        this.move(this.paddleX)
        message = '널판지가 길어졌어요!'
      }
      if (drop.kind === 'shield') {
        this.shield = true
        message = '물방울 보호막!'
      }
      if (drop.kind === 'heart') {
        message = this.testMode
          ? '하트는 무한이에요!'
          : this.lives >= 3
            ? '하트가 가득해요!'
            : '하트 +1!'
        if (!this.testMode) this.lives = Math.min(3, this.lives + 1)
      }
      if (drop.kind === 'magnet') {
        const held = this.balls.some((b) => b.held)
        if (!held) this.magnetArmed = true
        message = held ? '이미 공을 붙잡고 있어요!' : '다음 공을 붙잡아요!'
      }
      if (drop.kind === 'wave') {
        this.waveShots.push({
          id: ++this.serial,
          x: this.paddleX,
          y: this.paddleY - 18,
          age: 0,
          hitIds: new Set(),
        })
        message = '관통 파도 발사!'
      }
      if (drop.kind === 'dash') {
        this.dashShots.push({ id: ++this.serial, x: this.paddleX, y: this.paddleY - 24, age: 0 })
        message = '돌진하는 퐁이!'
      }
      if (drop.kind === 'star') {
        STAR_SHOT.angles.forEach((angle, i) =>
          this.starShots.push({
            id: ++this.serial,
            x: this.paddleX,
            y: this.paddleY - 18,
            vx: Math.sin(angle) * STAR_SHOT.speed,
            vy: -Math.cos(angle) * STAR_SHOT.speed,
            age: 0,
            delay: i * STAR_SHOT.interval,
          }),
        )
        message = '불가사리 표창 5연발!'
      }
      if (drop.kind === 'split') {
        if (this.balls.length < 2) this.splitArmed = true
        message = this.balls.length < 2 ? '다음 패들에서 공 2개!' : '이미 공이 2개예요!'
      }
      this.feedback.push({ kind: 'item', message })
      return
    }
    if (this.invulnerable > 0) return
    if (drop.kind === 'anchor') this.anchorSlams.push({ x: drop.x, y: this.paddleY })
    if (this.shield) {
      this.shield = false
      this.invulnerable = 0.6
      this.feedback.push({ kind: 'item', message: '보호막이 막아줬어요!' })
      return
    }
    const damageMessages: Partial<Record<DropKind, string>> = {
      poison: '독극물에 닿았어요! 생명 −1',
      shark: '상어에게 물렸어요 ㅠ',
      anchor: '무거운 닻에 쾅! 생명 −1',
      torpedo: '어뢰 폭발! 생명 −1',
      urchin: '성게에 콕! 생명 −1',
      puffer: '복어에 콕! 생명 −1',
      jelly: '독해파리에 찌릿! 생명 −1',
    }
    const damageMessage = damageMessages[drop.kind]
    if (damageMessage) {
      if (this.damage()) this.feedback.push({ kind: 'hazard', message: damageMessage })
      return
    }
    let message = ''
    if (drop.kind === 'sticky') {
      this.stickySeconds = 6
      message = '끈적끈적! 움직임이 느려요'
    }
    if (drop.kind === 'shrink') {
      this.wideSeconds = 0
      this.shrinkSeconds = 6
      message = '널판지가 줄었어요!'
    }
    if (drop.kind === 'ink') {
      this.inkSeconds = 6
      message = '먹물 때문에 안 보여요!'
      this.inkPatches = Array.from({ length: 2 }, (_, i) => ({
        x: 70 + this.random() * 220,
        y: 80 + (this.height - 180) * (0.2 + i * 0.38),
        radius: 38 + this.random() * 12,
      }))
    }
    if (drop.kind === 'seaweed') {
      if (this.fastSeconds <= 0)
        for (const b of this.balls) {
          b.vx *= 1.5
          b.vy *= 1.5
        }
      this.fastSeconds = 6
      message = '공이 너무 빨라요!'
    }
    this.feedback.push({ kind: 'hazard', message })
  }
  private splitFromPaddle(ball: Ball) {
    if (!this.splitArmed || this.balls.length >= 2 || this.phase !== 'playing') return
    this.splitArmed = false
    const speed = Math.hypot(ball.vx, ball.vy),
      angle = Math.max(-0.8, Math.min(0.8, Math.atan2(ball.vx, -ball.vy)))
    ball.vx = Math.sin(angle - 0.28) * speed
    ball.vy = -Math.cos(angle - 0.28) * speed
    this.balls.push({
      x: ball.x,
      y: ball.y,
      vx: Math.sin(angle + 0.28) * speed,
      vy: -Math.cos(angle + 0.28) * speed,
    })
    this.feedback.push({ kind: 'item', message: '진주 분열!' })
  }
  step(seconds: number) {
    // Small physics steps prevent tunnelling through bricks or the paddle at low FPS.
    let remaining = Math.min(0.1, Math.max(0, seconds))
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120)
      remaining -= dt
      this.tick(dt)
    }
  }
  private tick(dt: number) {
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    if (this.phase !== 'playing') return
    this.previewSeconds = Math.max(0, this.previewSeconds - dt)
    this.wideSeconds = Math.max(0, this.wideSeconds - dt)
    this.shrinkSeconds = Math.max(0, this.shrinkSeconds - dt)
    this.move(this.paddleX)
    this.inkSeconds = Math.max(0, this.inkSeconds - dt)
    this.stickySeconds = Math.max(0, this.stickySeconds - dt)
    if (this.fastSeconds > 0) {
      this.fastSeconds = Math.max(0, this.fastSeconds - dt)
      if (this.fastSeconds === 0)
        for (const b of this.balls) {
          b.vx /= 1.5
          b.vy /= 1.5
        }
    }
    for (const b of [...this.balls]) {
      if (b.held) continue
      const oldX = b.x,
        oldY = b.y
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.x < 14) {
        b.x = 14
        b.vx = Math.abs(b.vx)
      } else if (b.x > 346) {
        b.x = 346
        b.vx = -Math.abs(b.vx)
      }
      if (b.y < 20) {
        b.y = 20
        b.vy = Math.abs(b.vy)
      }
      if (
        b.vy > 0 &&
        oldY <= this.paddleY - 11 &&
        b.y >= this.paddleY - 11 &&
        Math.abs(b.x - this.paddleX) < this.paddleWidth / 2 + 5
      ) {
        this.paddleHit = true
        if (this.magnetArmed) {
          this.magnetArmed = false
          b.held = true
          b.offset = Math.max(
            -this.paddleWidth / 2 + 6,
            Math.min(this.paddleWidth / 2 - 6, b.x - this.paddleX),
          )
          b.x = this.paddleX + b.offset
          b.y = this.paddleY - 12
          b.vx = 0
          b.vy = 0
          this.feedback.push({ kind: 'item', message: '공을 붙잡았어요!' })
          continue
        }
        const angle =
          Math.max(-1, Math.min(1, (b.x - this.paddleX) / (this.paddleWidth / 2))) * 1.03
        const speed = (this.speed() + 35) * BALL_SPEED_MULTIPLIER * (this.fastSeconds > 0 ? 1.5 : 1)
        b.vx = Math.sin(angle) * speed
        b.vy = -Math.cos(angle) * speed
        b.y = this.paddleY - 12
        this.splitFromPaddle(b)
      }
      if (b.y > this.height + 8) {
        if (this.balls.length > 1) {
          this.balls = this.balls.filter((ball) => ball !== b)
          continue
        }
        this.invulnerable = 0
        this.damage(true)
        return
      }
      for (const brick of this.bricks) {
        if (
          b.x + 6 < brick.x ||
          b.x - 6 > brick.x + BRICK.width ||
          b.y + 6 < brick.y ||
          b.y - 6 > brick.y + BRICK.height
        )
          continue
        const side = oldX + 6 <= brick.x || oldX - 6 >= brick.x + BRICK.width
        if (side) {
          b.vx = -b.vx
          b.x = oldX
        } else {
          b.vy = -b.vy
          b.y = oldY
        }
        this.hitBrick(brick.id)
        break
      }
      if (this.phase !== 'playing') return
    }
    if (this.phase !== 'playing') return
    for (const shot of [...this.shots]) {
      shot.y -= 520 * dt
      const hit = this.bricks.find(
        (brick) =>
          Math.abs(shot.x - (brick.x + BRICK.width / 2)) <= BRICK.width / 2 + 3 &&
          shot.y >= brick.y - 5 &&
          shot.y <= brick.y + BRICK.height + 5,
      )
      if (hit) {
        this.shots = this.shots.filter((s) => s.id !== shot.id)
        this.hitBrick(hit.id, 'torpedo')
      }
      if (this.phase !== 'playing') return
    }
    this.shots = this.shots.filter((s) => s.y > -20)
    for (const shot of this.waveShots) {
      for (const brick of advanceWave(shot, dt, this.bricks)) {
        this.hitBrick(brick.id, 'wave')
        if (this.phase !== 'playing') return
      }
    }
    this.waveShots = this.waveShots.filter((shot) => shot.y > -40)
    for (const shot of [...this.dashShots]) {
      const brick = advanceDash(shot, dt, this.bricks)
      if (brick) {
        this.dashShots = this.dashShots.filter((active) => active.id !== shot.id)
        this.hitBrick(brick.id, 'dash')
      }
      if (this.phase !== 'playing') return
    }
    this.dashShots = this.dashShots.filter((shot) => shot.y > -40)
    for (const shot of [...this.starShots]) {
      const brick = advanceStar(shot, dt, this.bricks)
      if (brick) {
        this.starShots = this.starShots.filter((active) => active.id !== shot.id)
        this.hitBrick(brick.id, 'star')
      }
      if (this.phase !== 'playing') return
    }
    this.starShots = this.starShots.filter(
      (shot) => shot.y > -30 && shot.x > -30 && shot.x < BOARD.width + 30,
    )
    for (const drop of [...this.drops]) {
      if (drop.warning > 0) {
        drop.warning = Math.max(0, drop.warning - dt)
        continue
      }
      drop.age = (drop.age ?? 0) + dt
      if (drop.kind === 'poison' && drop.bottle) {
        while (
          (drop.emitted ?? 0) < POISON_POURS.length &&
          drop.age >= POISON_POURS[drop.emitted ?? 0]
        ) {
          const index = drop.emitted ?? 0
          drop.emitted = index + 1
          if (this.drops.length < 30)
            this.drops.push({
              id: ++this.serial,
              kind: 'poison',
              x: drop.x - 19 + ((index % 3) - 1) * 4,
              y: drop.y + 3,
              age: 0,
              warning: 0,
              vy: 105 + (index % 3) * 12,
            })
        }
        if (drop.age >= 4.2) this.drops = this.drops.filter((active) => active.id !== drop.id)
        continue
      }
      if (drop.kind === 'torpedo') {
        if (advanceTorpedo(drop)) {
          this.torpedoBlasts.push({ x: drop.x, y: drop.y })
          this.drops = this.drops.filter((active) => active.id !== drop.id)
          if (Math.hypot(drop.x - this.paddleX, drop.y - this.paddleY) <= TORPEDO_HAZARD.radius)
            this.collect(drop)
          if (this.phase !== 'playing') return
        }
        continue
      }
      if (drop.kind === 'poison') {
        drop.vy = Math.min(230, (drop.vy ?? 105) + 55 * dt)
        drop.y += drop.vy * dt
      } else if (drop.kind === 'urchin') {
        drop.vy = (drop.vy ?? -130) + 260 * dt
        drop.x += (drop.vx ?? 0) * dt
        drop.y += drop.vy * dt
        drop.rotation = (drop.rotation ?? 0) + dt * 5
        if (drop.x < 20) {
          drop.x = 20
          drop.vx = Math.abs(drop.vx ?? 0)
        } else if (drop.x > 340) {
          drop.x = 340
          drop.vx = -Math.abs(drop.vx ?? 0)
        }
      } else if (drop.kind === 'puffer' || drop.kind === 'jelly') {
        advanceSwimmer(drop, dt)
      } else if (drop.kind === 'anchor') {
        advanceAnchor(drop, dt)
        if (drop.y >= this.height - 12) {
          this.anchorSlams.push({ x: drop.x, y: this.height - 12 })
          this.drops = this.drops.filter((d) => d.id !== drop.id)
          continue
        }
      } else if (drop.kind === 'shark') {
        drop.x += (drop.vx ?? 0) * dt
        drop.y += (drop.vy ?? 440) * dt
      } else drop.y += 145 * dt
      const hit = isItem(drop.kind)
        ? Math.abs(drop.y - this.paddleY) < 20 &&
          Math.abs(drop.x - this.paddleX) < this.paddleWidth / 2 + 10
        : hazardTouches(drop, this.paddleX, this.paddleY, this.paddleWidth)
      if (hit) {
        this.drops = this.drops.filter((d) => d.id !== drop.id)
        this.collect(drop)
        if (this.phase !== 'playing') return
      }
    }
    this.drops = this.drops.filter(
      (d) =>
        d.y < this.height + 50 &&
        (d.kind !== 'shark' || (d.x > -60 && d.x < BOARD.width + 60 && d.y > -60)),
    )
  }
}
