import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { petUsesAtlas, type PetClip, type PetSpeciesId } from './pet-catalog'
import { petAtlasFrame } from './pet-atlas'
import { petDrawLayout, petFrameDrawLayout, petBlinkEyes } from './pet-draw-layout'
import { loadPetImage, readyPetImage } from './pet-sprite-images'
import { createPetBlinkSchedule, petIdleFrame, petBlinkStep } from './pet-idle-animation'
import { petNeedsFrame } from './pet-needs-animation'
import restingEyes from './pet-resting-eyes.json'

export function usePetReactionReady(
  speciesId: PetSpeciesId | undefined,
  motion: 'happy' | 'eat' = 'happy',
) {
  const [ready, setReady] = useState<string | null>(null)
  const url = speciesId ? petUsesAtlas(speciesId) ? `/pets/${speciesId}_atlas16_v1_sprite.png` : `/pets/${speciesId}_${motion}8_v1_sprite.png` : null
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
  const atlas = petUsesAtlas(speciesId)
  const sheet = atlas ? 'atlas16' :
    clip === 'idleA' || clip === 'idleB'
      ? 'idle8'
      : clip === 'hungry' || clip === 'lonely'
        ? 'needs8'
        : clip === 'eat'
          ? 'eat8'
          : 'happy8'
  useLayoutEffect(() => {
    const node = canvas.current
    if (!node) return
    let img: HTMLImageElement | undefined, blinkImg: HTMLImageElement | undefined
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      start = 0,
      lastFrame = ''
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    function paint() {
      if (stopped || !node || !img) return
      const columns = 4,
        cw = img.width / columns,
        ch = img.height / (atlas ? 4 : 2)
      const elapsed = performance.now() - start
      const idle = sheet === 'idle8'
      const local = atlas ? petAtlasFrame(clip, elapsed, blinkSchedule, reduced) : idle
        ? petIdleFrame(elapsed, clip === 'idleB', blinkSchedule, reduced)
        : clip === 'hungry' || clip === 'lonely'
          ? petNeedsFrame(elapsed, speciesId, clip, reduced)
          : reduced
          ? 0
          : clip === 'happy' || clip === 'eat'
            ? Math.min(7, Math.floor(elapsed / 375))
            : 0
      const resting = clip === 'idleA' || clip === 'idleB' || clip === 'hungry' || clip === 'lonely'
      // Resting animations must never replace the torso/tail silhouette.
      // Hold the emotional base pose and composite only its eyelids.
      const f = resting ? atlas ? clip === 'hungry' ? 4 : clip === 'lonely' ? 8 : 0 : sheet === 'needs8' && clip === 'lonely' ? 4 : 0 : local,
        ctx = node.getContext('2d')
      const blink = sheet === 'needs8' && f % 4 === 0 && blinkImg
        ? petBlinkStep(elapsed, blinkSchedule, reduced) : null
      const eyeFrame = resting && (atlas ? local !== f : idle && local >= 5) ? local : null
      const frameKey = `${f}:${blink}:${eyeFrame}`
      if (ctx && !document.hidden && frameKey !== lastFrame) {
        const kind =
          sheet === 'idle8'
            ? 'idle'
            : sheet === 'needs8'
              ? 'needs'
              : sheet === 'eat8'
                ? 'eat'
                : 'happy'
        const layout = petFrameDrawLayout(speciesId, kind, f)
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
        if (eyeFrame !== null) {
          const pose = petFrameDrawLayout(speciesId, kind, eyeFrame)
          const allEyes = restingEyes[speciesId]
          const regions = allEyes[String(atlas ? f : 0) as keyof typeof allEyes] as number[][]
          for (const [x,y,w,h] of regions) {
            const dx = layout.x + x * layout.scale, dy = layout.y + y * layout.scale
            const sx = x + (layout.x-pose.x)/layout.scale, sy = y + (layout.y-pose.y)/layout.scale
            for (let ring=0;ring<8;ring++) {
              const radius=1-ring*.025
              ctx.save();ctx.globalAlpha=ring===7?1:.18;ctx.beginPath()
              ctx.ellipse(dx+w*layout.scale/2,dy+h*layout.scale/2,w*layout.scale*radius/2,h*layout.scale*radius/2,0,0,Math.PI*2)
              ctx.clip()
              ctx.drawImage(img,eyeFrame%4*cw+sx,Math.floor(eyeFrame/4)*ch+sy,w,h,dx,dy,w*layout.scale,h*layout.scale)
              ctx.restore()
            }
          }
        }
        if (blink !== null && blinkImg) {
          // Replace only the eye regions: body, mouth and gesture pixels stay
          // on the approved emotional pose throughout a blink.
          const draw = petDrawLayout(speciesId, 'needsBlink')
          const frame = (clip === 'lonely' ? 4 : 0) + [1,2,3][blink]
          for (const [x,y,w,h] of petBlinkEyes(speciesId)) {
            const base = petDrawLayout(speciesId, kind)
            const dx = draw.x + x * draw.scale + layout.x - base.x, dy = draw.y + y * draw.scale + layout.y - base.y
            // Feather the outer fur edge while keeping the eyelid itself
            // opaque. This avoids a visible oval seam around a blink.
            for (let ring=0;ring<8;ring++) {
              const radius=1-ring*.025
              ctx.save()
              ctx.globalAlpha=ring===7 ? 1 : .18
              ctx.beginPath()
              ctx.ellipse(dx + w * draw.scale / 2, dy + h * draw.scale / 2, w * draw.scale * radius / 2, h * draw.scale * radius / 2, 0, 0, Math.PI * 2)
              ctx.clip()
              ctx.drawImage(blinkImg, frame % 4 * draw.cell + x, Math.floor(frame / 4) * draw.cell + y, w, h, dx, dy, w * draw.scale, h * draw.scale)
              ctx.restore()
            }
          }
        }
        lastFrame = frameKey
      }
      if (!reduced) timer = setTimeout(paint, atlas || idle || sheet === 'needs8' ? 50 : 100)
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
    if (sheet === 'needs8' && !reduced) {
      const blinkUrl = `/pets/${speciesId}_needs_blink8_v1_sprite.png`
      blinkImg = readyPetImage(blinkUrl)
      if (!blinkImg) loadPetImage(blinkUrl).then(loaded => { if (!stopped) blinkImg = loaded }).catch(() => {})
    }
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
        lastFrame = ''
        paint()
      }
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [speciesId, sheet, clip, blinkSchedule, atlas])
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
