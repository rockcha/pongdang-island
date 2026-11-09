import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PetClip, PetSpeciesId } from './pet-catalog'
import { petDrawLayout } from './pet-draw-layout'
import { loadPetImage, readyPetImage } from './pet-sprite-images'
import { createPetBlinkSchedule, petIdleFrame } from './pet-idle-animation'

export function usePetReactionReady(
  speciesId: PetSpeciesId | undefined,
  motion: 'happy' | 'eat' = 'happy',
) {
  const [ready, setReady] = useState<string | null>(null)
  const url = speciesId ? `/pets/${speciesId}_${motion}8_v1_sprite.png` : null
  useEffect(() => {
    if (!url) return
    let alive = true
    loadPetImage(url)
      .then(() => {
        if (alive) setReady(url)
      })
      .catch(() => {
        if (alive) setReady(null)
      })
    return () => {
      alive = false
    }
  }, [url])
  return !!url && ready === url
}

export function PetSprite({
  speciesId,
  clip,
  label,
}: {
  speciesId: PetSpeciesId
  clip: PetClip
  label: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [failed, setFailed] = useState(false)
  const [blinkSchedule] = useState(() =>
    createPetBlinkSchedule(Math.floor(Math.random() * 0xffffffff)),
  )
  const sheet =
    clip === 'idleA' || clip === 'idleB'
      ? 'idle8'
      : clip === 'hungry'
        ? 'hungry4'
        : clip === 'eat'
          ? 'eat8'
          : 'happy8'
  useLayoutEffect(() => {
    const node = canvas.current
    if (!node) return
    let img: HTMLImageElement | undefined
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      start = 0,
      lastFrame = -1
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    function paint() {
      if (stopped || !node || !img) return
      const columns = sheet === 'hungry4' ? 2 : 4,
        cw = img.width / columns,
        ch = img.height / 2
      const elapsed = performance.now() - start
      const idle = sheet === 'idle8'
      const local = idle
        ? petIdleFrame(elapsed, clip === 'idleB', blinkSchedule, reduced)
        : reduced
          ? 0
          : clip === 'happy' || clip === 'eat'
            ? Math.min(7, Math.floor(elapsed / 375))
            : Math.floor(elapsed / 300) % 4
      const f = local,
        ctx = node.getContext('2d')
      if (ctx && !document.hidden && f !== lastFrame) {
        const kind =
          sheet === 'idle8'
            ? 'idle'
            : sheet === 'hungry4'
              ? 'hungry'
              : sheet === 'eat8'
                ? 'eat'
                : 'happy'
        const layout = petDrawLayout(speciesId, kind)
        ctx.clearRect(0, 0, 640, 640)
        ctx.drawImage(
          img,
          (f % columns) * cw,
          Math.floor(f / columns) * ch,
          cw,
          ch,
          layout.x,
          layout.y,
          layout.size,
          layout.size,
        )
        lastFrame = f
      }
      if (!reduced) timer = setTimeout(paint, idle ? 50 : 100)
    }
    const begin = (loaded: HTMLImageElement) => {
      if (!stopped) {
        img = loaded
        setFailed(false)
        start = performance.now()
        paint()
      }
    }
    const url = `/pets/${speciesId}_${sheet}_v${sheet === 'idle8' ? 2 : 1}_sprite.png`
    const cached = readyPetImage(url)
    if (cached) begin(cached)
    else
      loadPetImage(url)
        .then(begin)
        .catch(() => {
          if (!stopped) setFailed(true)
        })
    const visible = () => {
      if (!document.hidden) {
        clearTimeout(timer)
        lastFrame = -1
        paint()
      }
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [speciesId, sheet, clip, blinkSchedule])
  return (
    <>
      <canvas
        className="pet-art"
        ref={canvas}
        hidden={failed}
        width={640}
        height={640}
        role="img"
        aria-label={label}
      />
      {failed && (
        <img
          className="pet-art"
          src={`/pets/${speciesId}_v1_thumbnail.png`}
          alt={`${label} (정지 이미지)`}
        />
      )}
    </>
  )
}
