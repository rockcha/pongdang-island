import {FarmCategoryIcon} from './category-icon'
import type {FarmTerrain} from './topview-model'

export function FarmTerrainBadge({terrain}:{terrain:FarmTerrain}){
 const label=terrain==='land'?'육지용':'바다용'
 return <span className="farm-terrain-badge" data-terrain={terrain} role="img" aria-label={label} title={label}><FarmCategoryIcon kind={terrain} size={20}/></span>
}
