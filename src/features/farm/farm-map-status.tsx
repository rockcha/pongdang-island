import { memo, useMemo, type RefObject } from 'react'
import { FarmAnimalStatus } from './animal-status'
import { isFarmAnimal } from './animal-catalog'
import { FarmConstructionStatus } from './construction'
import { BuildingUpgradeEffect } from './building-upgrade-effect'
import { FarmJobStatus, type FarmCompletedWork } from './job-status'
import { farmResearchJobs } from './research-jobs'
import { CROP_FRESH_MS, type FarmSimulation } from './farm-simulation'
import type { TopviewObject } from './topview-model'
import type { FarmMapActions } from './farm-map-objects'

// Finished/empty indicators do not need a new render on every clock tick.
// Ripe crops still wake at the warning and spoilage boundaries.
export function farmStatusTime(
  object: TopviewObject,
  simulation: FarmSimulation,
  researchJobs: ReturnType<typeof farmResearchJobs>,
  now: number,
) {
  const id = object.id,
    crop = simulation.cropJobs[id]
  if (crop && crop.harvestingAt === undefined) {
    const rottenAt = crop.readyAt + CROP_FRESH_MS
    return now < crop.readyAt
      ? now
      : now >= rottenAt
        ? rottenAt
        : now >= rottenAt - 15000
          ? now
          : crop.readyAt
  }
  const deadlines = [
    object.constructionReadyAt,
    simulation.animalJobs[id],
    simulation.animalPurchaseJobs[id]?.readyAt,
    simulation.upgradeJobs[id]?.readyAt,
    researchJobs[id]?.readyAt,
    simulation.processingJobs[id]?.readyAt,
    simulation.millJobs[id]?.readyAt,
    simulation.butcherJobs?.[id]?.readyAt,
  ].filter((time): time is number => time !== undefined)
  return deadlines.some((time) => time > now) ? now : Math.max(0, ...deadlines)
}
const FarmObjectStatus = memo(function FarmObjectStatus({
  object: o,
  simulation,
  researchJobs,
  now,
  completed,
  revealTime,
  actions,
}: {
  object: TopviewObject
  simulation: FarmSimulation
  researchJobs: ReturnType<typeof farmResearchJobs>
  now: number
  completed?: FarmCompletedWork
  revealTime: boolean
  actions: RefObject<FarmMapActions>
}) {
  const activate = () => actions.current.activate(o.x, o.y, true)
  return (
    <g>
      {o.constructionReadyAt && <FarmConstructionStatus object={o} now={now} />}
      {isFarmAnimal(o.kind) && (
        <FarmAnimalStatus
          object={o}
          readyAt={simulation.animalJobs[o.id]}
          now={now}
          onActivate={() => actions.current.collect(o)}
          revealTime={revealTime}
        />
      )}
      {simulation.animalPurchaseJobs[o.id] && (
        <FarmAnimalStatus
          object={o}
          readyAt={simulation.animalPurchaseJobs[o.id].readyAt}
          now={now}
          purchase={simulation.animalPurchaseJobs[o.id].animal}
          purchaseCount={simulation.animalPurchaseJobs[o.id].quantity??1}
          onClaim={() => actions.current.claim(o)}
        />
      )}
      {simulation.upgradeJobs[o.id] && (
        <BuildingUpgradeEffect
          object={o}
          job={simulation.upgradeJobs[o.id]}
          now={now}
          onActivate={() => actions.current.activate(o.x, o.y)}
        />
      )}
      <FarmJobStatus
        object={o}
        simulation={simulation}
        researchJobs={researchJobs}
        now={now}
        completed={completed}
        onActivate={activate}
      />
    </g>
  )
})
export function FarmMapStatus({
  objects,
  simulation,
  researchJobs,
  clock,
  completedWork,
  inspectedAnimal,
  actions,
}: {
  objects: TopviewObject[]
  simulation: FarmSimulation
  researchJobs: ReturnType<typeof farmResearchJobs>
  clock: number
  completedWork: FarmCompletedWork[]
  inspectedAnimal: number | null
  actions: RefObject<FarmMapActions>
}) {
  const completed = useMemo(
    () => new Map(completedWork.map((work) => [work.objectId, work])),
    [completedWork],
  )
  return (
    <>
      {objects.map((o) => (
        <FarmObjectStatus
          key={o.id}
          object={o}
          simulation={simulation}
          researchJobs={researchJobs}
          now={farmStatusTime(o, simulation, researchJobs, clock)}
          completed={completed.get(o.id)}
          revealTime={inspectedAnimal === o.id}
          actions={actions}
        />
      ))}
    </>
  )
}
