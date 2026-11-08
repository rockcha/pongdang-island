import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {FarmFriendStrip} from '@/features/farm/farm-friends'
import {ProcessingWorkshop} from '@/features/farm/processing-workshop'
import {initialTopview,placementValid} from '@/features/farm/topview-model'

vi.mock('@/features/farm/trial-inventory',async original=>{
 const actual=await original<typeof import('@/features/farm/trial-inventory')>()
 return {...actual,initialFarmTrial:()=>{
  const state=actual.initialFarmTrial()
  state.stored=['mill','mill'];state.simulation.inventory.wheatSeed=4;state.simulation.inventory.fertilizer=2
  return state
 }}
})
afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))

it('closes storage on selection and places the held building with the map still usable',async()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('보관함')
 expect(screen.queryByRole('button',{name:/보관 개체 반값 판매/})).toBeNull()
 click('제분소 보관 2개 배치하기')
 expect(screen.queryByRole('region',{name:'보관함 메뉴'})).toBeNull()
 expect(screen.queryByRole('navigation',{name:'농사 도구'})).toBeNull()
 const state=initialTopview(),cell=state.land.map(key=>key.split(',').map(Number)).find(([x,y])=>placementValid(state,'mill',x,y))!
 await act(async()=>fireEvent.click(container.querySelector(`[data-farm-cell="${cell[0]},${cell[1]}"]`)!))
 expect(screen.getByRole('button',{name:`제분소 (${cell[0]},${cell[1]})`})).toBeTruthy()
 expect(screen.getByLabelText('제분소 보관 1개')).toBeTruthy()
 click('변경');expect(screen.getByRole('region',{name:'보관함 메뉴'})).toBeTruthy()
 click('완료');expect(screen.getByRole('navigation',{name:'농사 도구'})).toBeTruthy()
})

it('closes the farming menu for planting and fertilizer and lets Done restore the toolbar',async()=>{
 vi.useFakeTimers();vi.setSystemTime(1000)
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('농사');click('씨앗 심기');click('밀 4개')
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.queryByRole('region',{name:'농사 메뉴'})).toBeNull()
 expect(screen.queryByRole('navigation',{name:'농사 도구'})).toBeNull()
 await act(async()=>click('밭 (10,11)'))
 expect(screen.getByLabelText('보유 종자 3개')).toBeTruthy()
 click('완료');click('농사');click('비료 사용')
 expect(screen.queryByRole('region',{name:'농사 메뉴'})).toBeNull()
 await act(async()=>click('밭 (10,11)'))
 expect(container.querySelector('[data-fertilizer-effect="fertilizer"]')).toBeTruthy()
 expect(screen.getByLabelText('비료 보유 1개')).toBeTruthy()
 fireEvent.keyDown(container.querySelector('.top-farm')!,{key:'Escape'})
 expect(screen.getByRole('navigation',{name:'농사 도구'})).toBeTruthy()
 click('농사');click('개간하기')
 expect(screen.queryByRole('region',{name:'농사 메뉴'})).toBeNull()
 click('완료');expect(screen.getByRole('navigation',{name:'농사 도구'})).toBeTruthy()
})

it('collapses and expands friend visits without losing the selected farm',()=>{
 const visit=vi.fn(),data={self:{id:'self',nickname:'나',avatar_path:null},likeCount:0,friends:[{id:'friend',nickname:'친구',avatar_path:null}]}
 render(<MemoryRouter><FarmFriendStrip data={data} selected="friend" onVisit={visit}/></MemoryRouter>)
 expect(screen.getByRole('button',{name:'친구 농장 방문'}).getAttribute('aria-current')).toBe('page')
 click('친구 목록 접기');expect(screen.queryByRole('navigation',{name:'친구 농장'})).toBeNull()
 expect(screen.getByRole('button',{name:'친구 목록 펼치기'})).toHaveProperty('ariaExpanded','false')
 click('친구 목록 펼치기');click('친구 농장 방문');expect(visit).toHaveBeenCalledWith('friend')
})

it('defaults to craftable recipes, updates for inventory changes and can reveal all recipes from an empty result',()=>{
 const simulation=initialTopview().simulation
 for(const good of Object.keys(simulation.inventory))simulation.inventory[good as keyof typeof simulation.inventory]=0
 simulation.inventory.carrot=3
 const props={buildingId:28,kind:'kitchen' as const,simulation,now:0,onAction:vi.fn()}
 const {rerender}=render(<ProcessingWorkshop {...props}/>)
 expect(screen.getByRole('checkbox',{name:'제작 가능한 요리만'})).toHaveProperty('checked',true)
 expect(screen.getByRole('button',{name:'구운 당근 선택'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'통밀죽 선택'})).toBeNull()
 simulation.inventory.carrot=0;rerender(<ProcessingWorkshop {...props}/>)
 expect(screen.queryByRole('button',{name:'구운 당근 선택'})).toBeNull()
 expect(screen.queryByRole('article')).toBeNull()
 fireEvent.click(screen.getByRole('checkbox',{name:'제작 가능한 요리만'}))
 click('구운 당근 선택');expect(screen.getByRole('button',{name:'구운 당근 만들기'})).toHaveProperty('disabled',true)
 simulation.inventory.carrot=3;rerender(<ProcessingWorkshop {...props}/>)
 fireEvent.click(screen.getByRole('checkbox',{name:'제작 가능한 요리만'}))
 click('구운 당근 만들기');expect(props.onAction).toHaveBeenCalledWith({type:'craft',recipe:'roastedCarrot',quantity:1})
})
