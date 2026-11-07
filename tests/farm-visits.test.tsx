import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {FarmFriendStrip,FarmVisit} from '@/features/farm/farm-friends'
import * as visitsApi from '@/features/farm/visits-api'
import {farmVisitState,type FarmFriends,type FriendFarm} from '@/features/farm/visits-api'
import {initialTopview} from '@/features/farm/topview-model'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
const directory:FarmFriends={self:{id:'self',nickname:'나',avatar_path:null},likeCount:2,friends:Array.from({length:8},(_,i)=>({id:'friend'+i,nickname:'친구'+i,avatar_path:null}))}
it('shows compact avatars, searches all friends, and returns to your own farm',()=>{
 const onVisit=vi.fn()
 render(<MemoryRouter><FarmFriendStrip data={directory} selected="friend1" onVisit={onVisit}/></MemoryRouter>)
 expect(screen.getByRole('button',{name:'친구1 농장 방문'}).getAttribute('aria-current')).toBe('page')
 fireEvent.click(screen.getByRole('button',{name:'내 농장 보기'}));expect(onVisit).toHaveBeenCalledWith(null)
 fireEvent.click(screen.getByRole('button',{name:'친구 농장 전체 보기'}))
 fireEvent.change(screen.getByRole('textbox',{name:'친구 닉네임 검색'}),{target:{value:'친구7'}})
 fireEvent.click(screen.getByRole('button',{name:'친구7 농장 방문'}));expect(onVisit).toHaveBeenLastCalledWith('friend7')
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('blocks visits while an own-farm command is unresolved',()=>{
 const onVisit=vi.fn()
 render(<MemoryRouter><FarmFriendStrip data={directory} selected={null} disabled onVisit={onVisit}/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'친구0 농장 방문'}));expect(onVisit).not.toHaveBeenCalled()
 expect(screen.getByRole('button',{name:'친구 농장 전체 보기'}).hasAttribute('disabled')).toBe(true)
})
it('visits the real farm renderer without wallet, editing, harvesting or production actions',async()=>{
 const initial=initialTopview(),plot=initial.objects.find(o=>o.kind==='plot')!
 const data:FriendFarm={owner:directory.friends[0],serverNow:new Date().toISOString(),liked:false,likeCount:0,layout:{land:initial.land,objects:initial.objects,paths:initial.paths,pathTiles:initial.pathTiles,cropJobs:{[plot.id]:{crop:'wheat',readyAt:0}}}}
 const state=farmVisitState(data),before=JSON.stringify(state)
 render(<MemoryRouter><TopviewFarm visit={{state,header:<h1>친구0의 농장</h1>}}/></MemoryRouter>)
 expect(screen.getByRole('region',{name:'친구 농장'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'보유 골드 안내'})).toBeNull()
 expect(screen.queryByRole('button',{name:'상점'})).toBeNull()
 expect(document.querySelector('.farm-crop-tools')).toBeNull()
 expect(document.querySelector('[data-farm-status-layer]')).toBeNull()
 const warehouse=state.objects.find(o=>o.kind==='warehouse')!
 fireEvent.click(screen.getByRole('button',{name:`창고 (${warehouse.x},${warehouse.y})`}))
 expect(screen.getByRole('status').textContent).toContain('창고 · Lv. 1')
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:`밭 (${plot.x},${plot.y})`}))
 await act(async()=>{})
 expect(JSON.stringify(state)).toBe(before)
 expect(state.gold).toBe(0);expect(Object.values(state.simulation.inventory).every(n=>n===0)).toBe(true)
})
it('waits for confirmed likes and prevents duplicate taps',async()=>{
 const initial=initialTopview(),data:FriendFarm={owner:directory.friends[0],serverNow:new Date().toISOString(),liked:false,likeCount:3,layout:{land:initial.land,objects:initial.objects,paths:initial.paths,cropJobs:{}}}
 let resolve!:(value:FriendFarm)=>void
 const like=vi.spyOn(visitsApi,'setFarmLike').mockReturnValue(new Promise(r=>{resolve=r}))
 const renderVisit=(value:FriendFarm)=><MemoryRouter><FarmVisit data={value} onReturn={()=>{}} strip={null}/></MemoryRouter>
 const {rerender}=render(renderVisit(data)),button=screen.getByRole('button',{name:'농장 좋아요'})
 fireEvent.click(button);fireEvent.click(button)
 expect(like).toHaveBeenCalledTimes(1);expect(like).toHaveBeenCalledWith(data.owner.id,true)
 expect(button.textContent).toBe('3');expect(button.getAttribute('aria-pressed')).toBe('false')
 const confirmed={...data,liked:true,likeCount:4};await act(async()=>{resolve(confirmed)})
 rerender(renderVisit(confirmed));expect(screen.getByRole('button',{name:'농장 좋아요'}).textContent).toBe('4')
 expect(screen.getByRole('button',{name:'농장 좋아요'}).getAttribute('aria-pressed')).toBe('true')
})
