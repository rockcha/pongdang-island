type FlightPath = { source: string; sx: number; sy: number; tx: number; ty: number }

/** Shared by simulation and trail rendering, without allocating a point per sample. */
export function missilePoint(p: FlightPath, t: number, out: { x: number; y: number }) {
  const dx = p.tx - p.sx,
    dy = p.ty - p.sy,
    length = Math.hypot(dx, dy) || 1
  if (p.source === 'cruise') {
    const rise = Math.min(120, Math.max(60, length * 0.38)),
      u = 1 - t,
      cy1 = Math.max(8, p.sy - rise),
      cy2 = Math.max(8, p.ty - rise * 0.65)
    out.x = u * u * u * p.sx + 3 * u * u * t * p.sx + 3 * u * t * t * p.tx + t * t * t * p.tx
    out.y = u * u * u * p.sy + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * p.ty
  } else {
    const arc = Math.sin(t * Math.PI) * 18
    out.x = p.sx + dx * t - (dy / length) * arc
    out.y = p.sy + dy * t + (dx / length) * arc
  }
}
export function missileAngle(p: FlightPath, t: number) {
  const dx = p.tx - p.sx,
    dy = p.ty - p.sy,
    length = Math.hypot(dx, dy) || 1
  if (p.source === 'cruise') {
    const rise = Math.min(120, Math.max(60, length * 0.38)),
      u = 1 - t,
      cy1 = Math.max(8, p.sy - rise),
      cy2 = Math.max(8, p.ty - rise * 0.65)
    return Math.atan2(
      3 * u * u * (cy1 - p.sy) + 6 * u * t * (cy2 - cy1) + 3 * t * t * (p.ty - cy2),
      6 * u * t * dx,
    )
  }
  const bend = Math.cos(t * Math.PI) * Math.PI * 18
  return Math.atan2(dy + (dx / length) * bend, dx - (dy / length) * bend)
}
