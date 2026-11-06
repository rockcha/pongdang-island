import {initialTopview,cellKey} from '@/features/farm/topview-model'

// A purchased, developed farm for move/recovery/production regression scenarios.
// Starter layout is covered separately; these scenarios require owned animals.
export function developedFarmFixture(){
 const state=initialTopview()
 state.land=Array.from({length:16*12},(_,i)=>cellKey(i%16+4,Math.floor(i/16)+4))
 state.paths=Array.from({length:16},(_,i)=>cellKey(i+4,11))
 state.objects=[
  {id:1,kind:'office',x:6,y:6},{id:2,kind:'store',x:11,y:6},
  {id:3,kind:'barn',x:15,y:6},{id:4,kind:'cow',x:16,y:9},{id:5,kind:'chicken',x:14,y:10},
  {id:10,kind:'plot',x:9,y:13},{id:11,kind:'plot',x:10,y:13},{id:12,kind:'plot',x:11,y:13},{id:13,kind:'plot',x:9,y:14},
  {id:17,kind:'bench',x:6,y:15},{id:18,kind:'coop',x:13,y:8},
  {id:21,kind:'mill',x:6,y:13},{id:23,kind:'seedShop',x:8,y:6},
  {id:26,kind:'warehouse',x:18,y:6},{id:27,kind:'livestockOffice',x:4,y:9},{id:28,kind:'kitchen',x:14,y:6},
 ]
 return state
}
