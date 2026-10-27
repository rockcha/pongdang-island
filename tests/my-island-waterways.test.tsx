import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {facilities,canPlace,footprint,parseState,defaultState,buyItem,addLand} from '@/features/my-island/island-model'
import {Building} from '@/features/my-island/island-art'
it('provides three bridge lengths with water-only placement and rotated footprints',()=>{
 for(const length of [1,2,3]){
  const id='wood-bridge-'+length,f=facilities.find(f=>f.id===id)!
  expect(f).toMatchObject({w:1,h:length,placementTerrain:'water',rotatable:true})
  expect(canPlace([],{id,x:20,y:15})).toBe(false)
  expect(canPlace([],{id,x:35,y:15})).toBe(true)
  expect(footprint({id,x:35,y:15,rotation:90})).toEqual({w:length,h:1})
  const html=renderToStaticMarkup(<svg><Building f={f} rotation={90}/></svg>)
  expect(html).toContain('data-waterway="bridge"')
 }
})
it('buys, places and reloads connected bridge pieces without overlap or inventing land',()=>{
 let state=buyItem(defaultState(),'wood-bridge-1','wood-bridge-1~first')!
 state=buyItem(state,'wood-bridge-3','wood-bridge-3~second')!
 const bridge={id:'wood-bridge-1~first',x:34,y:15,rotation:90},next={id:'wood-bridge-3~second',x:35,y:15,rotation:90}
 expect(canPlace(state.layout,bridge,state.land)).toBe(true)
 state.layout.push(bridge)
 expect(canPlace(state.layout,next,state.land)).toBe(true)
 state.layout.push(next)
 expect(parseState(state).layout).toEqual(state.layout)
 expect(canPlace(state.layout,{id:'stepping-stones',x:35,y:15})).toBe(false)
 expect(addLand({...state,landStock:1},{x:35,y:15})).toBeNull()
 expect(state.land).toEqual([])
})
it('uses distinct native artwork for water decorations and retains the existing lamp',()=>{
 for(const id of ['reeds','stepping-stones']){
  const f=facilities.find(f=>f.id===id)!
  expect(renderToStaticMarkup(<svg><Building f={f}/></svg>)).toContain('data-waterway=')
 }
 expect(canPlace([],{id:'reeds',x:20,y:15})).toBe(true)
 expect(canPlace([],{id:'reeds',x:35,y:15})).toBe(true)
 expect(canPlace([],{id:'stepping-stones',x:20,y:15})).toBe(false)
 expect(facilities.filter(f=>f.id==='lamp')).toHaveLength(1)
})
