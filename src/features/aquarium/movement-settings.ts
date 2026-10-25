import type {Species,OwnedCollectible} from '@/features/collection/api'
import reviewedArtwork from './artwork-facing.json'

const artworkFacing = new Map(reviewedArtwork.map(art => [art.path, art.facing]))

export function speciesFacing(species:Species){
 const reviewed=artworkFacing.get(species.sprite_sheet_path||species.thumbnail_path)
 // Reviewed artwork wins over stale DB values. All other artwork starts right-facing.
 return (reviewed??species.facing_direction)==='left'?'left':'right'
}

export function movementSettings(species:Species){
 const fixedKind=species.kind==='decoration'||(species.kind==='map'||species.kind==='relic')
 const type=fixedKind?'fixed':species.movement_type??'swim'
 return {type,travel:fixedKind?'both':species.travel_direction??'both',
  flip:!fixedKind&&type!=='fixed'&&(species.kind==='fish'||species.flip_with_direction===true)}
}
export function shouldFlipSpecies(species:Species,direction:number){
 if(!movementSettings(species).flip||direction===0)return false
 return speciesFacing(species)==='left'?direction>0:direction<0
}

export function canArrangeSpecies(species:Species){
 return species.kind==='decoration'||species.kind==='trash'||(species.kind==='fish'&&species.movement_type==='fixed')
}
export function isPositionFixed(item:OwnedCollectible){
 return item.species.kind==='trash'?item.position_locked===true:canArrangeSpecies(item.species)
}
