export const BOARD = {
  width: 360,
  height: 520,
  paddleY: 459,
  paddleWidth: 82,
  ballRadius: 6,
} as const
export const BRICK = {
  width: 42,
  height: 20,
  rows: 4,
  columns: 6,
  gapX: 2,
  gapY: 3,
  left: 49,
} as const
export const BRICK_COUNT = BRICK.rows * BRICK.columns
export const BALL_SPEED_MULTIPLIER = 1.482
export const WAVE_SHOT = { speed: 420, hitRadius: 10, displaySize: 52, frameMs: 100 } as const
export const DASH_SHOT = { speed: 150, hitRadius: 12, displaySize: 56, frameMs: 80 } as const
export const STAR_SHOT = {
  speed: 500,
  hitRadius: 7,
  displaySize: 30,
  interval: 0.075,
  angles: [-0.18, -0.09, 0, 0.09, 0.18],
} as const
export const TORPEDO_DISPLAY_SIZE = 40
export const TORPEDO_HAZARD = {
  countdown: 10,
  radius: 92,
  edge: 24,
} as const
