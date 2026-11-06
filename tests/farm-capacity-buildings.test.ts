import {expect,it} from 'vitest'
import {initialTopview,topviewItems,objectFootprint,type TopviewState} from '@/features/farm/topview-model'
import {farmLimits,farmBuildingStorageError,simulateFarm} from '@/features/farm/farm-simulation'
import {buyFarmItem} from '@/features/farm/farm-stock'
import {buildingCapacity,isUpgradeable} from '@/features/farm/building-upgrades'
import {finishFarmConstruction} from '@/features/farm/construction-model'
import {isBasicFarmBuilding} from '@/features/farm/building-rules'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {TopviewArt} from '@/features/farm/topview-art'

it('starts with one completed hut and ranch and allows buying additional 1x1 buildings',()=>{
 const initial=initialTopview()
 expect(farmLimits(initial)).toMatchObject({plots:8,animals:4})
 for(const kind of ['office','livestockOffice'] as const){
  const starters=initial.objects.filter(o=>o.kind===kind)
  expect(starters).toHaveLength(1)
  expect(starters[0].constructionReadyAt).toBeUndefined()
  expect(topviewItems[kind]).toMatchObject({price:5000,w:1,h:1,purchaseLimit:Infinity})
  expect(isBasicFarmBuilding(kind)).toBe(false)
  expect(isUpgradeable(kind)).toBe(false)
  expect(objectFootprint({kind})).toEqual({w:1,h:1})
  const purchased=buyFarmItem(initial,kind,2)
  expect(purchased.gold).toBe(initial.gold-10000)
  expect(purchased.stored.filter(k=>k===kind)).toHaveLength(2)
 }
})
it('adds fixed capacity per completed building, blocks capacity bypass and excessive recovery',()=>{
 const state:TopviewState={...initialTopview(),objects:[...initialTopview().objects.filter(o=>o.kind!=='office'&&o.kind!=='livestockOffice'),
  {id:40,kind:'office',x:6,y:6,level:9},{id:41,kind:'office',x:7,y:6,constructionReadyAt:60000},
  {id:42,kind:'livestockOffice',x:4,y:9,level:9},{id:43,kind:'livestockOffice',x:5,y:9,constructionReadyAt:60000}]}
 expect(buildingCapacity(state.objects.find(o=>o.id===40)!)).toBe(4)
 expect(farmLimits(state)).toMatchObject({plots:8,animals:4})
 expect(simulateFarm(state,40,{type:'upgrade'},0).state).toBe(state)
 const done=finishFarmConstruction(state,60000)
 expect(farmLimits(done)).toMatchObject({plots:12,animals:6})
 const crowded={...state,objects:[...state.objects,{id:44,kind:'plot' as const,x:8,y:13}]}
 expect(farmBuildingStorageError(crowded,40)).toContain('한도를 초과')
})
it('makes counter artwork taller while keeping its base and previews',()=>{
 for(const kind of ['seedShop','store'] as const){
  expect(renderToStaticMarkup(createElement(TopviewArt,{kind}))).toContain('translate(0 -60) scale(1 1.5)')
  expect(renderToStaticMarkup(createElement(TopviewArt,{kind,compact:true}))).not.toContain('scale(1 1.5)')
 }
})
