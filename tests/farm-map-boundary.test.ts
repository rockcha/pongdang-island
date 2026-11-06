import {expect,it} from 'vitest'
import {initialTopview,placementValid,adjacentLand} from '@/features/farm/topview-model'
import {applyLandStroke,landLine} from '@/features/farm/land-tools'

it('extends connected land across the previous east and south boundaries',()=>{
 const state={...initialTopview(),objects:[],land:['23,19'],paths:[],landStock:4}
 const cells=[{x:24,y:19},{x:25,y:19},{x:25,y:20},{x:25,y:21}]
 expect(adjacentLand(state,24,19)).toBe(true)
 const result=applyLandStroke(state,'place',cells)
 expect(result.changed).toEqual(cells)
 expect(result.state.landStock).toBe(0)
 expect(result.state.gold).toBe(state.gold)
 expect(placementValid(result.state,'flowers',25,21)).toBe(true)
 const outside=applyLandStroke({...result.state,landStock:2},'place',[{x:26,y:21},{x:25,y:22}])
 expect(outside.changed).toEqual([])
 expect(outside.blocked.every(cell=>cell.reason==='outside')).toBe(true)
})
it('permits sea decorations in the new area and rejects footprints beyond the map',()=>{
 const state={...initialTopview(),objects:[]}
 expect(placementValid(state,'duckBoat',25,21)).toBe(true)
 expect(placementValid(state,'woodBridge2',25,21)).toBe(false)
 expect(placementValid(state,'woodBridge2',24,21,undefined,90)).toBe(true)
 expect(placementValid(state,'duckBoat',26,21)).toBe(false)
 expect(landLine({x:24,y:20},{x:25,y:21})).toHaveLength(3)
})
