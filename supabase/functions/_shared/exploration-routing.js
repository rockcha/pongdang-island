import {newGrowthExplorationModel,applyExplorationAction,normalizeExplorationSpells} from './exploration-engine.js'
import {applyExplorationAction as applyV1} from './exploration-engine-v1.js'
import {newExplorationModel as newV2,applyExplorationAction as applyV2} from './exploration-engine-v2.js'

// Cached clients without growth UI must keep the previous rules until refreshed.
export function newRunModel(growthVersion,random=Math.random){
 if(growthVersion===undefined)return newV2(random)
 if(growthVersion!==1)throw Error('INVALID_EXPLORATION_ACTION')
 return newGrowthExplorationModel(random)
}

// A saved run's marker chooses its engine; restoration never adds the marker.
export function applyRunAction(model,action,now=Date.now(),random=Math.random){
 const advance=model.version===1?applyV1:model.version===2&&!model.state.growth?applyV2:model.version===2&&model.state.growth.version===1?applyExplorationAction:null
 if(!advance)throw Error('ENGINE_VERSION_MISMATCH')
 return advance({...model,state:normalizeExplorationSpells(model.state)},action,now,random)
}
