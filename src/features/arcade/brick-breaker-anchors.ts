/** Align the head, ignoring animated arms and tail in the lower half of each cell. */
export function dashHeadOrigins(pixels: Uint8ClampedArray, width: number, height: number) {
  const w = Math.floor(width / 2),
    h = Math.floor(height / 2)
  return Array.from({ length: 4 }, (_, frame) => {
    const ox = (frame % 2) * w,
      oy = Math.floor(frame / 2) * h
    const rows: { center: number; width: number }[] = []
    for (let y = 0; y < Math.floor(h * 0.48); y++) {
      let left = w,
        right = -1
      for (let x = 0; x < w; x++)
        if (pixels[((oy + y) * width + ox + x) * 4 + 3] > 128) {
          left = Math.min(left, x)
          right = x
        }
      if (right >= left) rows.push({ center: (left + right) / 2, width: right - left + 1 })
    }
    const widest = Math.max(0, ...rows.map((row) => row.width))
    const head = rows.filter((row) => row.width >= widest * 0.8)
    return {
      x: head.length ? head.reduce((sum, row) => sum + row.center, 0) / head.length / w : 0.5,
      y: 0.5,
    }
  })
}
