import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {PortPage} from '@/features/port/port-page'
const mock=vi.hoisted(()=>({load:vi.fn(),action:vi.fn(),refresh:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'captain'}}})}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(p:string)=>'/collectibles/'+p}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({wallet:{gold:10000,inventory:{}},refresh:mock.refresh}),GoldIcon:()=>null}))
vi.mock('@/features/port/api',async original=>({...await original<typeof import('@/features/port/api')>(),loadHarbor:mock.load,harborAction:mock.action}))
const vessel={id:'fishing-raft',name:'낚시용 뗏목',price:300,duration_minutes:30,fuel_cost:1,fishing_count:2,sprite_path:'/port/fishing-raft-sprite.png',owned:true,ownedCount:1}
const second={...vessel,id:'neoul-boat',name:'너울 낚싯배',price:900,duration_minutes:120,fuel_cost:2,fishing_count:5,sprite_path:'/port/neoul-boat-sprite.png'}
const boats=[{...vessel,id:'raft-1',vessel_id:vessel.id,instance_no:1,dock_slot:1},{...second,id:'neoul-1',vessel_id:second.id,instance_no:1,dock_slot:2}]
const base={boats,dockSlots:2,serverNow:'2026-10-19T10:00:00Z',fuel:10,fuelPrice:50,vessels:[vessel,second],voyages:[]}
const trip={boat_id:'raft-1',id:'voyage1',vessel_id:vessel.id,vessel_snapshot:vessel,departed_at:base.serverNow,returns_at:'2026-10-19T10:30:00Z',arrival_seen_at:null,claimed_at:null}
beforeEach(()=>{mock.load.mockResolvedValue(base);mock.refresh.mockResolvedValue(undefined)})
afterEach(()=>{cleanup();localStorage.clear();vi.resetAllMocks();vi.useRealTimers()})
function show(shipyard=false){return render(<MemoryRouter><PortPage shipyard={shipyard}/></MemoryRouter>)}
const longVessel={...vessel,id:'haeneomi-trawler',name:'해넘이 원양어선',price:2400,duration_minutes:360,fuel_cost:5,fishing_count:15,sprite_path:'/port/haeneomi-trawler-sprite.png',ownedCount:1}
const storedBoat={...longVessel,id:'trawler-1',vessel_id:longVessel.id,instance_no:1,dock_slot:null}
it('replaces a dock boat from the inventory modal while keeping exactly two dock positions',async()=>{
 const state={...base,vessels:[vessel,second,longVessel],boats:[...boats,storedBoat]}
 mock.load.mockResolvedValue(state)
 mock.action.mockResolvedValue({...state,boats:state.boats.map(b=>b.id==='raft-1'?{...b,dock_slot:null}:b.id===storedBoat.id?{...b,dock_slot:1}:b),receipt:{action:'dock'}})
 const {container}=show()
 fireEvent.click(await screen.findByRole('button',{name:'보유한 배'}))
 fireEvent.click(screen.getByRole('button',{name:'1번 선착장'}))
 fireEvent.click(screen.getByRole('button',{name:'해넘이 원양어선 1호 배치'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await screen.findByRole('button',{name:'해넘이 원양어선 1호 · 출항 준비'})
 expect(mock.action).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({p_action:'dock',p_boat_id:'trawler-1',p_slot:1}))
 expect(container.querySelectorAll('[data-dock-slot]')).toHaveLength(2)
})
it('keeps a returned but unharvested boat slot reserved and blocks replacement in the modal',async()=>{
 mock.load.mockResolvedValue({...base,vessels:[vessel,second,longVessel],boats:[...boats,storedBoat],voyages:[{...trip,returns_at:'2026-10-19T09:59:00Z',arrival_seen_at:base.serverNow}]})
 show();fireEvent.click(await screen.findByRole('button',{name:'보유한 배'}))
 fireEvent.click(screen.getByRole('button',{name:'1번 선착장 · 사용 중'}))
 expect(screen.getByText(/출항한 배가 돌아올 자리예요/)).toBeTruthy()
 expect(screen.getByRole('button',{name:'해넘이 원양어선 1호 배치'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('button',{name:'낚시용 뗏목 1호 보관'})).toHaveProperty('disabled',true)
 expect(mock.action).not.toHaveBeenCalled()
})
it('allows a second purchase but disables purchasing more than two of one type',async()=>{
 mock.load.mockResolvedValue({...base,vessels:[{...vessel,ownedCount:2},second,{...longVessel,ownedCount:0,owned:false}]})
 show(true)
 expect(await screen.findByRole('button',{name:'낚시용 뗏목 보유 한도 2척'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('button',{name:'너울 낚싯배 구매 900 골드'})).toHaveProperty('disabled',false)
 expect(screen.getByRole('button',{name:'해넘이 원양어선 구매 2400 골드'})).toHaveProperty('disabled',false)
})
it('shows owned boats at the dock and the shipyard only offers the two new boats',async()=>{
 const view=show()
 expect(await screen.findByRole('button',{name:'낚시용 뗏목 1호 · 출항 준비'})).toBeTruthy()
 expect(screen.getByRole('link',{name:'조선소'}).getAttribute('href')).toBe('/shipyard')
 expect(screen.getByRole('button',{name:/돌아온 배 모두 수확/})).toHaveProperty('disabled',true)
 view.unmount();mock.load.mockResolvedValue({...base,vessels:[{...vessel,owned:false},{...second,owned:false}]})
 show(true)
 expect(await screen.findByRole('button',{name:'낚시용 뗏목 구매 300 골드'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'너울 낚싯배 구매 900 골드'})).toBeTruthy()
 expect(screen.queryByText('별잠 심해탐사선')).toBeNull()
})
it('confirms fuel consumption before departure, animates out and does not send a second request',async()=>{
 mock.action.mockResolvedValue({...base,fuel:9,voyages:[trip],receipt:{action:'depart',voyageId:trip.id,vesselId:vessel.id}})
 const {container}=show()
 fireEvent.click(await screen.findByRole('button',{name:'낚시용 뗏목 1호 · 출항 준비'}))
 fireEvent.click(screen.getByRole('button',{name:'기름 1개로 출항'}))
 expect(mock.action).not.toHaveBeenCalled()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(container.querySelector('[data-phase="departing"]')).toBeTruthy())
 expect(mock.action).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({p_action:'depart',p_vessel_id:vessel.id,p_boat_id:'raft-1'}))
 expect(screen.getByRole('button',{name:/낚시용 뗏목 1호 · 조업 중/})).toBeTruthy()
})
it('animates unseen completed voyages back on entry and persists arrival only after the animation',async()=>{
 vi.useFakeTimers()
 mock.load.mockResolvedValue({...base,voyages:[{...trip,returns_at:'2026-10-19T09:59:00Z'}]})
 mock.action.mockResolvedValue(base)
 const {container}=show();await act(async()=>{})
 expect(container.querySelector('[data-phase="arriving"]')).toBeTruthy()
 expect(mock.action).not.toHaveBeenCalled()
 await act(async()=>{vi.advanceTimersByTime(1800)})
 expect(mock.action).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({p_action:'arrive',p_voyage_id:trip.id}))
 expect(container.querySelector('[data-phase="moored"]')).toBeTruthy()
})
it('does not repeat the arrival animation for a previously seen return',async()=>{
 mock.load.mockResolvedValue({...base,voyages:[{...trip,returns_at:'2026-10-19T09:59:00Z',arrival_seen_at:base.serverNow}]})
 const {container}=show();await screen.findByRole('button',{name:'낚시용 뗏목 1호 · 수확 가능'})
 expect(container.querySelector('[data-phase="arriving"]')).toBeNull()
 expect(container.querySelector('[data-phase="moored"]')).toBeTruthy()
 expect(mock.action).not.toHaveBeenCalled()
})
it('harvests all returns in one action and shows the persisted results',async()=>{
 mock.load.mockResolvedValue({...base,voyages:[{...trip,returns_at:'2026-10-19T09:59:00Z',arrival_seen_at:base.serverNow}]})
 mock.action.mockResolvedValue({...base,receipt:{action:'claim_all',results:[{voyageId:trip.id,vesselName:vessel.name,attempted:2,failed:2,succeeded:0,items:[]}]}})
 show();fireEvent.click(await screen.findByRole('button',{name:'돌아온 배 모두 수확 · 1척'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 expect(await screen.findByRole('dialog',{name:'항구의 조업 결과'})).toBeTruthy()
 expect(mock.action).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({p_action:'claim_all'}))
 expect(screen.getByText('이번에는 잡힌 개체가 없어요.')).toBeTruthy()
})
it('restores an uncertain request after leaving the page and retries with the same operation ID',async()=>{
 mock.action.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({...base,fuel:11,receipt:{action:'fuel'}})
 const view=show()
 fireEvent.click(await screen.findByRole('button',{name:/기름 구매/}))
 fireEvent.click(screen.getByRole('button',{name:'50 골드로 구매'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await screen.findByRole('alert')
 const original=mock.action.mock.calls[0][0]
 view.unmount();show()
 fireEvent.click(await screen.findByRole('button',{name:'요청 결과 다시 확인'}))
 await waitFor(()=>expect(mock.action).toHaveBeenCalledTimes(2))
 expect(mock.action.mock.calls[1][0]).toEqual(original)
 await waitFor(()=>expect(localStorage.getItem('pongdang:harbor-request:captain')).toBeNull())
})
