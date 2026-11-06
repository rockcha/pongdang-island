import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {writeFileSync} from 'node:fs'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {RelicPage} from '@/features/relics/relic-loadout'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
import type {Relic,RelicState} from '@/features/relics/api'
const mock=vi.hoisted(()=>({read:vi.fn(),fresh:vi.fn(),recycle:vi.fn(),owner:'recycling-user'}))
vi.mock('react-router',async original=>({...await original<typeof import('react-router')>(),useNavigate:()=>vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:mock.owner}}})}))
vi.mock('@/features/relics/api',async original=>({...await original<typeof import('@/features/relics/api')>(),readRelics:mock.read,loadRelics:mock.fresh}))
vi.mock('@/features/relics/recycling-api',()=>({recycleRelics:mock.recycle}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name,path,className}:any)=><img alt={name} className={className} src={'/'+path}/>}))
const a:Relic={id:'shell-hourglass',name:'조개 모래시계',description:'최대 제작 시간 +2시간',rarity:'rare',thumbnail_path:'relics/rare/shell-hourglass_thumbnail.png',owned:true,quantity:9,sell_price:200,effect_kind:'personal_bait_hours',effect_value:2}
const b:Relic={...a,id:'fish-calling-bell',name:'물고기를 부르는 방울',quantity:4,thumbnail_path:'relics/rare/fish-calling-bell_thumbnail.png',effect_kind:'trap_seconds_per_bait'}
const epic:Relic={...a,id:'current-piercing-needle',name:'해류를 꿰뚫는 바늘',rarity:'epic',owned:false,quantity:0,thumbnail_path:'relics/epic/current-piercing-needle_thumbnail.png'}
const mythic:Relic={...epic,id:'primordial-ember',name:'태초의 불씨',rarity:'mythic',thumbnail_path:'relics/mythic/primordial-ember_thumbnail.png'}
const composite:Relic={...a,id:'crafted-one',name:a.name+' · '+b.name,quantity:1,crafted:true,baseId:a.id,attached:b,sell_price:0}
const state:RelicState={equippedId:a.id,changeFee:500,equipFee:0,unequipFee:500,canCraft:true,relics:[a,b,epic,mythic,composite]}
const receipt=(action:'recombine'|'dismantle',inputs:any)=>({...state,equippedId:action==='dismantle'?null:a.id,relics:action==='dismantle'?[{...a,quantity:8},{...b,quantity:5},epic,mythic]:[{...a,quantity:1},b,{...epic,owned:true,quantity:1},mythic,composite],recycling:{action,cost:0 as const,consumed:inputs,receivedIds:action==='dismantle'?[a.id,b.id]:[epic.id],unequipped:action==='dismantle'}})
beforeEach(()=>{mock.owner='recycling-user';setQueryAccount(mock.owner);mock.read.mockResolvedValue(state);mock.fresh.mockResolvedValue(state);mock.recycle.mockImplementation(async r=>receipt(r.action,r.inputs));vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}))})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks();vi.unstubAllGlobals();localStorage.clear()})
async function chooseGrade(grade:'rare'|'epic'|'mythic'){
 const label=grade==='rare'?'희귀 8개':grade==='epic'?'특급 6개':'신화 3개'
 const trigger=screen.getByRole('combobox',{name:'재조합 재료 등급'})
 if(trigger.textContent?.includes(label))return
 fireEvent.click(trigger)
 fireEvent.keyDown(await screen.findByRole('option',{name:label}),{key:'Enter'})
 await waitFor(()=>expect(screen.queryByRole('listbox')).toBeNull())
}
async function recombine(){fireEvent.click(await screen.findByRole('tab',{name:'재조합'}));for(let i=0;i<8;i++)fireEvent.click(screen.getByRole('button',{name:a.name+' 1개 넣기'}));fireEvent.click(screen.getByRole('button',{name:'무료로 재조합하기'}))}
it('opens a material information dialog without adding or consuming it',async()=>{
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 fireEvent.click(screen.getByRole('button',{name:a.name+' 정보와 효과'}))
 const dialog=screen.getByRole('dialog',{name:a.name})
 expect(within(dialog).getByText(a.description)).toBeTruthy()
 expect(within(dialog).getByText('보유 9개 · 재조합 사용 가능 8개')).toBeTruthy()
 expect(mock.recycle).not.toHaveBeenCalled()
 fireEvent.click(within(dialog).getByRole('button',{name:'닫기'}))
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('0 / 8')
})
it.each(['rare','epic'] as const)('auto fills only the selected %s grade and protects equipped and crafted copies',async grade=>{
 const first={...a,rarity:grade,quantity:grade==='rare'?5:3},second={...b,rarity:grade,quantity:4}
 const opposite={...epic,rarity:grade==='rare'?'epic' as const:'rare' as const,quantity:6,owned:true}
 mock.read.mockResolvedValue({...state,relics:[opposite,first,{...composite,rarity:grade},second,mythic]})
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 await chooseGrade(grade)
 fireEvent.click(screen.getByRole('button',{name:'자동 넣기'}))
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'}).textContent).toContain(grade==='rare'?'희귀 8개':'특급 6개')
 const slots=within(screen.getByLabelText(`선택한 유물 ${grade==='rare'?8:6}칸`))
 expect(slots.getAllByRole('button',{name:a.name+' 1개 선택 해제'})).toHaveLength(grade==='rare'?4:2)
 expect(slots.getAllByRole('button',{name:b.name+' 1개 선택 해제'})).toHaveLength(4)
 expect(slots.queryByRole('button',{name:epic.name+' 1개 선택 해제'})).toBeNull()
 expect(mock.recycle).not.toHaveBeenCalled()
})
it('keeps an incomplete selected grade instead of switching to another available grade',async()=>{
 mock.read.mockResolvedValue({...state,relics:[{...a,quantity:6},{...epic,quantity:6,owned:true},mythic,composite]})
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 fireEvent.click(screen.getByRole('button',{name:'자동 넣기'}))
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'}).textContent).toContain('희귀 8개')
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('5 / 8')
 expect(screen.getByRole('button',{name:'무료로 재조합하기'})).toHaveProperty('disabled',true)
 await chooseGrade('epic')
 fireEvent.click(screen.getByRole('button',{name:'자동 넣기'}))
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'}).textContent).toContain('특급 6개')
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('6 / 6')
 fireEvent.click(screen.getByRole('button',{name:'무료로 재조합하기'}))
 const guard=screen.getByRole('alertdialog')
 expect(guard.textContent).toContain(epic.name+' × 6')
 fireEvent.click(within(guard).getByRole('button',{name:'재조합하기'}))
 await waitFor(()=>expect(mock.recycle).toHaveBeenCalledWith({action:'recombine',inputs:[{id:epic.id,quantity:6}],operation:expect.any(String)}))
})
it('disables automatic filling when the selected grade has no usable copies',async()=>{
 mock.read.mockResolvedValue({...state,relics:[a,b,{...epic,quantity:0},mythic,composite]})
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 await chooseGrade('epic')
 expect(screen.getByRole('button',{name:'자동 넣기'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'}).textContent).toContain('특급 6개')
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('0 / 6')
})
it('shows eight rare slots and lets players remove one copy or clear the slots',async()=>{
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:a.name+' 1개 넣기'}))
 for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:b.name+' 1개 넣기'}))
 const selected=screen.getByLabelText('선택한 유물 8칸')
 expect(selected.textContent).toBe('')
 expect(within(selected).getAllByRole('img')).toHaveLength(8)
 expect(selected.querySelectorAll('[data-filled=true]')).toHaveLength(8)
 fireEvent.click(within(selected).getAllByRole('button',{name:b.name+' 1개 선택 해제'})[0])
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('7 / 8')
 fireEvent.click(screen.getByRole('button',{name:'초기화'}))
 expect(selected.querySelectorAll('[data-filled=true]')).toHaveLength(0)
 expect(mock.recycle).not.toHaveBeenCalled()
})
it('plays the fusion only after server confirmation and clears the selected materials on success',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}))
 render(<RelicPage/>);await recombine()
 expect(screen.queryByRole('dialog',{name:'유물을 재조합하고 있어요'})).toBeNull()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'재조합하기'}))
 expect(await screen.findByRole('dialog',{name:'유물을 재조합하고 있어요'})).toBeTruthy()
 expect(screen.queryByRole('dialog',{name:'재조합 완료'})).toBeNull()
 expect(await screen.findByRole('dialog',{name:'재조합 완료'},{timeout:3500})).toBeTruthy()
 fireEvent.click(within(screen.getByRole('dialog',{name:'재조합 완료'})).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('0 / 8')
 expect(mock.recycle).toHaveBeenCalledTimes(1)
})
it('protects the equipped copy, omits the pool link, and confirms consumption before an upgrade',async()=>{
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 expect(screen.getByText('장착 1개 보호 · 사용 가능 8개')).toBeTruthy()
 expect(screen.getByRole('button',{name:'무료로 재조합하기'})).toHaveProperty('disabled',true)
 expect(screen.queryByRole('button',{name:'결과 유물 보기'})).toBeNull()
 for(let i=0;i<8;i++)fireEvent.click(screen.getByRole('button',{name:a.name+' 1개 넣기'}))
 expect(screen.getByRole('button',{name:a.name+' 1개 넣기'})).toHaveProperty('disabled',true)
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('8 / 8')
 if(process.env.RELIC_RECYCLING_QA)writeFileSync('artifacts/relic-recombination.fragment.html',document.querySelector('section[aria-label="유물"]')!.outerHTML)
 fireEvent.click(screen.getByRole('button',{name:'무료로 재조합하기'}))
 const confirm=screen.getByRole('alertdialog');expect(confirm.textContent).not.toContain('무료 · 성공 100%');expect(mock.recycle).not.toHaveBeenCalled()
 fireEvent.click(within(confirm).getByRole('button',{name:'재조합하기'}))
 await screen.findByRole('dialog',{name:'재조합 완료'});expect(mock.recycle).toHaveBeenCalledWith({action:'recombine',inputs:[{id:a.id,quantity:8}],operation:expect.any(String)})
})
it('dismantles from the crafted overflow menu, previews both originals and offers free unequipping',async()=>{
 mock.read.mockResolvedValue({...state,equippedId:composite.id})
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('button',{name:/장착 유물 교체/}))
 fireEvent.click(await screen.findByRole('button',{name:composite.name+' 분해'}))
 const confirm=await screen.findByRole('alertdialog');expect(confirm.textContent).toContain('장착도 무료로 해제');expect(confirm.textContent).toContain('돌려받는 유물: '+a.name);expect(confirm.textContent).toContain('돌려받는 유물: '+b.name)
 fireEvent.click(within(confirm).getByRole('button',{name:'분해하기'}));await screen.findByRole('dialog',{name:'분해 완료'})
 expect(mock.recycle).toHaveBeenCalledWith({action:'dismantle',inputs:[{id:composite.id,quantity:1}],operation:expect.any(String)})
})
it('restores uncertain requests after remount and reuses the same operation instead of consuming another six',async()=>{
 mock.recycle.mockRejectedValueOnce(Error('offline'))
 let view=render(<RelicPage/>);await recombine();fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'재조합하기'}))
 await screen.findByRole('alert');const original=mock.recycle.mock.calls[0][0]
 view.unmount();view=render(<RelicPage/>);fireEvent.click(await screen.findByRole('button',{name:'이전 재조합 결과 다시 확인'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'같은 요청 다시 확인'}));await screen.findByRole('dialog',{name:'재조합 완료'})
 expect(mock.recycle).toHaveBeenLastCalledWith(original)
 expect(localStorage.getItem('pongdang:relic-loadout:recycling-user:recycling')).toBeNull()
})
it('preserves materials on cancellation and refreshes availability after a definite rejection',async()=>{
 render(<RelicPage/>);await recombine();fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'취소'}));expect(mock.recycle).not.toHaveBeenCalled()
 mock.recycle.mockRejectedValueOnce({code:'P0001',message:'RELIC_MATERIAL_UNAVAILABLE'})
 fireEvent.click(screen.getByRole('button',{name:'무료로 재조합하기'}));fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'재조합하기'}))
 await waitFor(()=>expect(mock.fresh).toHaveBeenCalledWith(true));expect(localStorage.getItem('pongdang:relic-loadout:recycling-user:recycling')).toBeNull()
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','재료 수량이 바뀌었어요. 장착한 1개를 제외하고 다시 선택해주세요.')
})
it('blocks double submission and competing crafting while a request is in flight',async()=>{
 let finish!:(value:unknown)=>void;mock.recycle.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 render(<RelicPage/>);await recombine()
 const submit=within(screen.getByRole('alertdialog')).getByRole('button',{name:'재조합하기'})
 fireEvent.click(submit);fireEvent.click(submit);expect(mock.recycle).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('tab',{name:'세공',hidden:true}))
 expect(screen.getByRole('tab',{name:'재조합',hidden:true}).getAttribute('aria-selected')).toBe('true')
 const request=mock.recycle.mock.calls[0][0]
 await act(async()=>finish(receipt('recombine',request.inputs)));await screen.findByRole('dialog',{name:'재조합 완료'})
})

it('fills three mythic originals, protects the equipped copy, and confirms a same-grade reward',async()=>{
 const owned={...mythic,owned:true,quantity:4}
 mock.read.mockResolvedValue({...state,equippedId:mythic.id,relics:[a,b,epic,owned,{...composite,rarity:'mythic'}]})
 mock.recycle.mockImplementation(async r=>({...state,equippedId:mythic.id,relics:[a,b,epic,{...owned,quantity:2}],recycling:{action:'recombine',cost:0,consumed:r.inputs,receivedIds:[mythic.id],unequipped:false}}))
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}));await chooseGrade('mythic')
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'}).className).toContain('bg-secondary')
 fireEvent.click(screen.getByRole('button',{name:'자동 넣기'}))
 expect(within(screen.getByLabelText('선택한 유물 3칸')).getAllByRole('button')).toHaveLength(3)
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('3 / 3')
 expect(screen.getByRole('button',{name:mythic.name+' 1개 넣기'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'무료로 재조합하기'}))
 const guard=screen.getByRole('alertdialog');expect(guard.textContent).toContain('유물 3개를 재조합할까요?')
 expect(guard.textContent).toContain('신화 유물 1개');expect(guard.textContent).not.toContain('상위 등급')
 fireEvent.click(within(guard).getByRole('button',{name:'재조합하기'}))
 const result=await screen.findByRole('dialog',{name:'재조합 완료'})
 expect(result.textContent).not.toContain('상위 등급')
 expect(mock.recycle).toHaveBeenCalledWith({action:'recombine',inputs:[{id:mythic.id,quantity:3}],operation:expect.any(String)})
})
it('restores an uncertain three-mythic request with the same operation id',async()=>{
 const request={action:'recombine',inputs:[{id:mythic.id,quantity:3}],operation:crypto.randomUUID()}
 localStorage.setItem('pongdang:relic-loadout:recycling-user:recycling',JSON.stringify(request))
 mock.read.mockResolvedValue({...state,relics:[a,b,epic,{...mythic,owned:true,quantity:3}]})
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('button',{name:'이전 재조합 결과 다시 확인'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'같은 요청 다시 확인'}))
 await waitFor(()=>expect(mock.recycle).toHaveBeenCalledWith(request))
})
it('restores old six-rare receipts for confirmation while new rare upgrades require eight',async()=>{
 const request={action:'recombine',inputs:[{id:a.id,quantity:6}],operation:crypto.randomUUID()}
 localStorage.setItem('pongdang:relic-loadout:recycling-user:recycling',JSON.stringify(request))
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('button',{name:'이전 재조합 결과 다시 확인'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'같은 요청 다시 확인'}))
 await waitFor(()=>expect(mock.recycle).toHaveBeenCalledWith(request))
})
