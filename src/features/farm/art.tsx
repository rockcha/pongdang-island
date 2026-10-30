import { memo } from 'react'
import assets from '../my-island/farm-isometric-assets.json'
import { facilityFor, footprint, type Placement, type Cell } from '../my-island/island-model'
import { tilePoints, toIso } from './isometric'
import type { CropJob, AnimalJob } from './model'
import { buildingRegistration, spritePlacement } from './sprite-registration'
const images = assets as Record<string, string[]>
export function FarmSprite({
  id,
  rotation = 0,
  stage = 0,
  size = 100,
  height = size,
  ground,
}: {
  id: string
  rotation?: number
  stage?: number
  size?: number
  height?: number
  ground?: [number, number]
}) {
  const frames = images[id]
  if (!frames) return null
  const index =
    frames.length === 3 ? Math.min(2, Math.max(0, stage)) : (((rotation / 90) % 4) + 4) % 4
  const contact = ground ?? buildingRegistration[id]?.[index]?.front ?? [128, 240]
  return (
    <image
      href={frames[index]}
      x={(-size * contact[0]) / 256}
      y={(-height * contact[1]) / 256}
      width={size}
      height={height}
      data-farm-sprite={id}
      data-facing={rotation}
      preserveAspectRatio="none"
    />
  )
}
export function WhiteFence({ p }: { p: Placement }) {
  const corners = [
    [p.x, p.y + 1],
    [p.x + 1, p.y + 1],
    [p.x + 1, p.y],
    [p.x, p.y],
  ]
  const n = ((p.rotation ?? 0) / 90) % 4,
    [a, b] = [corners[n], corners[(n + 1) % 4]].map(([x, y]) => toIso(x, y))
  return (
    <g data-white-fence="true" strokeLinejoin="round">
      <path
        d={`M${a.x} ${a.y - 10}L${b.x} ${b.y - 10}M${a.x} ${a.y - 19}L${b.x} ${b.y - 19}`}
        stroke="#bbac8a"
        strokeWidth="5"
      />
      <path
        d={`M${a.x} ${a.y - 12}L${b.x} ${b.y - 12}M${a.x} ${a.y - 21}L${b.x} ${b.y - 21}`}
        stroke="#fffaf0"
        strokeWidth="4"
      />
      {[0, 0.5, 1].map((t) => {
        const x = a.x + (b.x - a.x) * t,
          y = a.y + (b.y - a.y) * t
        return (
          <path
            key={t}
            d={`M${x - 3} ${y}v-26l3-4 3 4v26Z`}
            fill="#fffdf2"
            stroke="#d7c9ac"
            strokeWidth="1"
          />
        )
      })}
    </g>
  )
}
export function FarmObject({
  p,
  crop,
  animal,
  now,
  level = 1,
}: {
  p: Placement
  crop?: CropJob
  animal?: AnimalJob
  now: number
  level?: number
}) {
  const f = facilityFor(p.id),
    size = footprint(p),
    registration = spritePlacement(p),
    anchor = registration.anchor
  if (!f) return null
  if (f.id === 'farm-white-fence') return <WhiteFence p={p} />
  if (f.id === 'farm-plot') {
    const ready = !!crop && Date.parse(crop.ready_at) <= now
    const progress = crop
      ? (now - Date.parse(crop.planted_at)) /
        (Date.parse(crop.ready_at) - Date.parse(crop.planted_at))
      : 0
    return (
      <g data-isometric-plot="true">
        <polygon points={tilePoints(p.x, p.y)} fill="#9e6840" stroke="#c5915a" strokeWidth="2" />
        {[0.23, 0.48, 0.73].map((t) => {
          const a = toIso(p.x + 0.12, p.y + t),
            b = toIso(p.x + 0.9, p.y + t)
          return (
            <path
              key={t}
              d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
              stroke="#6f472d"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )
        })}
        {crop && (
          <g transform={`translate(${anchor.x} ${anchor.y})`}>
            <FarmSprite
              id={crop.crop_id}
              size={64}
              ground={registration.ground}
              stage={ready ? 2 : progress > 0.45 ? 1 : 0}
            />
            {ready && <ReadyBubble text="수확" />}
          </g>
        )}
      </g>
    )
  }
  const spriteSize = registration.size
  return (
    <>
      {registration.building && (
        <polygon
          points={tilePoints(p.x + 0.08, p.y + 0.08, size.w - 0.16, size.h - 0.16)}
          fill="#456d37"
          opacity=".07"
        />
      )}
      <g
        transform={`translate(${anchor.x} ${anchor.y})`}
        data-ground-anchor={`${anchor.x},${anchor.y}`}
      >
        {!registration.building && (
          <ellipse
            cx="0"
            cy="-3"
            rx={spriteSize * 0.28}
            ry={spriteSize * 0.08}
            fill="#456d37"
            opacity=".13"
          />
        )}
        <FarmSprite
          id={f.id}
          rotation={p.rotation}
          size={spriteSize}
          height={registration.height}
          ground={registration.ground}
        />
        {['farm-office', 'farm-store', 'farm-barn'].includes(f.id) && level > 1 && (
          <BuildingDetails
            key={level}
            level={level}
            size={registration.height}
            rotation={p.rotation ?? 0}
          />
        )}
        {animal && Date.parse(animal.ready_at) <= now && (
          <ReadyBubble text="받기" y={-spriteSize * 0.8} />
        )}
      </g>
    </>
  )
}
function BuildingDetails({
  level,
  size,
  rotation,
}: {
  level: number
  size: number
  rotation: number
}) {
  const side = rotation === 90 || rotation === 180 ? -1 : 1
  const crate = toIso(side > 0 ? -0.12 : -0.75, side > 0 ? -0.75 : -0.12)
  const plant = toIso(side > 0 ? -0.75 : -0.12, side > 0 ? -0.12 : -0.75)
  return (
    <g data-building-level={level}>
      <g transform={`translate(${crate.x} ${crate.y})`}>
        <path d="m-9-14 9-5 9 5-9 5Z" fill="#dcb27b" />
        <path d="m-9-14 9 5v9l-9-5Z" fill="#b8844c" />
        <path d="m0-9 9-5v9L0 0Z" fill="#a77443" />
        <path d="m-6-11 4 2m5 0 4-2" fill="none" stroke="#edcf97" strokeWidth="1.5" />
      </g>
      {level >= 3 && (
        <g transform={`translate(${plant.x} ${plant.y})`}>
          <path d="M-7-12H7L4 0H-4Z" fill="#bd815f" />
          <ellipse cy="-14" rx="9" ry="6" fill="#6f9b53" />
          <ellipse cx="-4" cy="-17" rx="4" ry="5" fill="#8fb56b" />
        </g>
      )}
      {level >= 4 && (
        <g transform={`translate(${plant.x} ${plant.y - 20})`} fill="#f2c9b0">
          {[-5, 0, 5].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={i % 2 ? -3 : 0} r="3.2" />
              <circle cx={x} cy={i % 2 ? -3 : 0} r="1" fill="#f8e5a1" />
            </g>
          ))}
        </g>
      )}
      {level >= 5 && (
        <g
          transform={`translate(0 ${-size * 0.88})`}
          fill="#e5bf5c"
          stroke="#bf9745"
          strokeWidth=".8"
        >
          <path d="M0 14V2m0 3q-13-2-10-9Q0-3 0 5m0 0Q11-8 13-2 1 10 0 5" />
          <path
            className="iso-upgrade-glint"
            d="m-17 2 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z"
            stroke="none"
            fill="#fff2b0"
          />
        </g>
      )}
    </g>
  )
}
function ReadyBubble({ text, y = -65 }: { text: string; y?: number }) {
  return (
    <g transform={`translate(12 ${y})`} className="farm-ready-bubble">
      <rect x="-16" y="-11" width="32" height="17" rx="7" fill="#fffbe9" stroke="#c0a76d" />
      <text textAnchor="middle" y="1" fontSize="10" fill="#8c623b">
        {text}
      </text>
    </g>
  )
}
const tileColors: Record<string, string> = {
  grass: '#91bb60',
  dirt: '#bf9967',
  gravel: '#d0c6aa',
  sand: '#e3cf9e',
  stone: '#c8cfb5',
  brick: '#c99875',
  wood: '#c29e70',
  moonstone: '#a9c3bd',
  'star-mosaic': '#d6c88f',
  'teal-glass': '#8eb4aa',
  'shell-mosaic': '#dfc9b0',
}
export const Ground = memo(function Ground({
  cells,
  paving,
  editing,
}: {
  cells: Cell[]
  paving: { x: number; y: number; type: string }[]
  editing: boolean
}) {
  const set = new Set(cells.map((c) => `${c.x},${c.y}`)),
    floors = new Map(paving.map((p) => [`${p.x},${p.y}`, p.type]))
  return (
    <g data-isometric-ground="true">
      {cells.map((c) => {
        const a = toIso(c.x, c.y + 1),
          b = toIso(c.x + 1, c.y + 1),
          d = toIso(c.x + 1, c.y),
          floor = floors.get(`${c.x},${c.y}`)
        return (
          <g key={`${c.x},${c.y}`}>
            {!set.has(`${c.x},${c.y + 1}`) && (
              <path d={`M${a.x} ${a.y}L${b.x} ${b.y}v13L${a.x} ${a.y + 13}Z`} fill="#b99662" />
            )}
            {!set.has(`${c.x + 1},${c.y}`) && (
              <path d={`M${d.x} ${d.y}L${b.x} ${b.y}v13L${d.x} ${d.y + 13}Z`} fill="#c6a66c" />
            )}
            <polygon
              points={tilePoints(c.x, c.y)}
              fill={
                floor ? (tileColors[floor] ?? '#c5cdb2') : (c.x + c.y) % 2 ? '#9dc66c' : '#a5cd73'
              }
              stroke={editing ? '#d7e9b1' : '#a3c86d'}
              strokeWidth={editing ? 1 : 0.5}
            />
          </g>
        )
      })}
    </g>
  )
})
