import type {PracticeState} from './practice-state'
/** Acquisition history belongs to this run and survives sales and replacements. */
export function acquiredItemIds(state:PracticeState){return new Set([...(state.acquiredIds??[]),...state.weapons.map(item=>item.id),...state.armor.map(item=>item.id),...state.spells.map(item=>item.id)])}
export function recordAcquired(state:PracticeState,...ids:string[]){return [...new Set([...acquiredItemIds(state),...ids])]}
