import type {Species} from '@/features/collection/api'

export function movementSettings(species:Species){
 const fixedKind=species.kind==='decoration'||species.kind==='map'
 const type=fixedKind?'fixed':species.movement_type??'swim'
 return {type,travel:fixedKind?'both':species.travel_direction??'both',
  flip:!fixedKind&&(species.flip_with_direction??(species.kind==='fish'&&type==='swim'))}
}
export function shouldFlipSpecies(species:Species,direction:number){
 return movementSettings(species).flip&&direction<0
}
