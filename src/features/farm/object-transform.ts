import {canFlipFarmArt,canRotateFarmObject,placementValid,type FarmRotation,type TopviewState} from './topview-model'

export function transformFarmObject(state:TopviewState,id:number,action:'rotate'|'flip'){
 const object=state.objects.find(item=>item.id===id)
 if(!object||object.constructionReadyAt)return state
 if(action==='flip'&&!canFlipFarmArt(object.kind)||action==='rotate'&&!canRotateFarmObject(object.kind))return state
 const rotation=action==='rotate'?(((object.rotation??0)+90)%360) as FarmRotation:object.rotation
 if(!placementValid(state,object.kind,object.x,object.y,id,rotation))return state
 return {...state,objects:state.objects.map(item=>item.id===id?{...item,rotation,flipped:action==='flip'?!item.flipped:item.flipped}:item)}
}
