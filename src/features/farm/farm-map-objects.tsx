import { memo, useMemo, type RefObject } from 'react'
import { TopviewArt } from './topview-art'
import { FarmConstructionEffect } from './construction'
import { farmCrops } from './crop-catalog'
import { cropIsRotten, type FarmSimulation } from './farm-simulation'
import { farmFenceConnectionIndex, type FenceConnections } from './fence-art'
import {
  TILE,
  objectFootprint,
  objectArtHeight,
  topviewItems,
  type TopviewObject,
} from './topview-model'

export type FarmMapActions = {
  activate: (x: number, y: number, keyboard?: boolean) => void
  hover: (x: number, y: number) => void
  collect: (object: TopviewObject) => void
  claim: (object: TopviewObject) => void
}
type ObjectProps = {
  object: TopviewObject
  editing: boolean
  moving: boolean
  selected: boolean
  researching: boolean
  artInteractive: boolean
  crop?: FarmSimulation['cropJobs'][number]['crop']
  stage: 'empty' | 'growing' | 'ready' | 'rotten'
  progress: number
  connections?: FenceConnections
  actions: RefObject<FarmMapActions>
}
// Time is deliberately absent: artwork only changes at a visible growth boundary.
const FarmMapObject = memo(function FarmMapObject({
  object: o,
  editing,
  moving,
  selected,
  researching,
  artInteractive,
  crop,
  stage,
  progress,
  connections,
  actions,
}: ObjectProps) {
  const item = { ...topviewItems[o.kind], ...objectFootprint(o) },
    animal = item.group === '동물',
    building = item.group === '건물'
  const height = objectArtHeight(o.kind, o.rotation),
    bottom = (o.y + item.h) * TILE
  return (
    <g
      data-object-id={o.id}
      role="button"
      tabIndex={0}
      aria-label={`${item.name} (${o.x},${o.y})`}
      onClick={() => actions.current.activate(o.x, o.y)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          actions.current.activate(o.x, o.y, true)
        }
      }}
      onPointerEnter={() => actions.current.hover(o.x, o.y)}
      className={`top-farm-object ${animal ? 'top-farm-animal' : ''} ${researching ? 'top-farm-research-active' : ''}`}
      style={{ animationDelay: `${o.id * 0.37}s` }}
    >
      <rect
        data-object-footprint={building || undefined}
        x={o.x * TILE - (building ? 0 : 3)}
        y={building ? o.y * TILE : Math.min(o.y * TILE, bottom - height) - (animal ? 12 : 0)}
        width={building ? item.w * TILE : Math.max(44, item.w * TILE + 6)}
        height={building ? item.h * TILE : Math.max(44, height + (animal ? 12 : 0))}
        fill="transparent"
      />
      <svg
        data-object-art="true"
        pointerEvents={artInteractive ? undefined : 'none'}
        filter={selected ? 'url(#farm-selection-outline)' : undefined}
        x={o.x * TILE}
        y={bottom - height}
        width={item.w * TILE}
        height={height}
        overflow="visible"
        opacity={o.constructionReadyAt ? 0.25 : moving ? 0.3 : 1}
      >
        <TopviewArt
          kind={o.kind}
          idle={animal && !editing}
          idlePhase={o.id}
          fenceNetwork
          fenceConnections={connections}
          rotation={o.rotation}
          flipped={o.flipped}
          crop={crop}
          progress={progress}
          stage={stage}
        />
      </svg>
      {o.constructionReadyAt && <FarmConstructionEffect object={o} />}
      {building && selected && (
        <text
          pointerEvents="none"
          x={(o.x + item.w / 2) * TILE}
          y={bottom + 9}
          textAnchor="middle"
          fill="#fff4d9"
          stroke="#627b50"
          strokeWidth="2.5"
          paintOrder="stroke"
          fontSize="12"
        >
          {item.name}
        </text>
      )}
    </g>
  )
})
export function FarmMapObjects({
  objects,
  simulation,
  researchJobs,
  clock,
  editing,
  mode,
  toolMenu,
  selected,
  actions,
}: {
  objects: TopviewObject[]
  simulation: FarmSimulation
  researchJobs: Record<number, unknown>
  clock: number
  editing: boolean
  mode: string
  toolMenu: string | null
  selected: number | null
  actions: RefObject<FarmMapActions>
}) {
  const connections = useMemo(() => farmFenceConnectionIndex(objects), [objects])
  return (
    <>
      {objects.map((o) => {
        const job = simulation.cropJobs[o.id],
          growth = job ? 1 - (job.readyAt - clock) / (farmCrops[job.crop].growSeconds * 1000) : 0
        return (
          <FarmMapObject
            key={o.id}
            object={o}
            editing={editing}
            moving={mode === 'move' && o.id === selected}
            selected={o.id === selected}
            researching={!!(researchJobs[o.id] || simulation.processingJobs[o.id])}
            artInteractive={
              !(topviewItems[o.kind].group === '건물' && editing && toolMenu !== 'move')
            }
            crop={job?.crop}
            stage={
              job && cropIsRotten(job, clock)
                ? 'rotten'
                : job
                  ? job.readyAt <= clock
                    ? 'ready'
                    : 'growing'
                  : 'empty'
            }
            progress={growth >= 1 ? 1 : growth >= 0.5 ? 0.5 : 0}
            connections={connections.get(o.id)}
            actions={actions}
          />
        )
      })}
    </>
  )
}
