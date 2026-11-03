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
const a:Relic={id:'shell-hourglass',name:'조개 모래시계',description:'최대 제작 시간 +2시간',rarity:'rare',thumbnail_path:'relics/rare/shell-hourglass_thumbnail.png',owned:true,quantity:7,sell_price:200,effect_kind:'personal_bait_hours',effect_value:2}
const b:Relic={...a,id:'fish-calling-bell',name:'물고기를 부르는 방울',quantity:4,thumbnail_path:'relics/rare/fish-calling-bell_thumbnail.png',effect_kind:'trap_seconds_per_bait'}
const epic:Relic={...a,id:'current-piercing-needle',name:'해류를 꿰뚫는 바늘',rarity:'epic',owned:false,quantity:0,thumbnail_path:'relics/epic/current-piercing-needle_thumbnail.png'}
const mythic:Relic={...epic,id:'primordial-ember',name:'태초의 불씨',rarity:'mythic',thumbnail_path:'relics/mythic/primordial-ember_thumbnail.png'}
const composite:Relic={...a,id:'crafted-one',name:a.name+' · '+b.name,quantity:1,crafted:true,baseId:a.id,attached:b,sell_price:0}
const state:RelicState={equippedId:a.id,changeFee:500,equipFee:0,unequipFee:500,canCraft:true,relics:[a,b,epic,mythic,composite]}
const receipt=(action:'recombine'|'dismantle',inputs:any)=>({...state,equippedId:action==='dismantle'?null:a.id,relics:action==='dismantle'?[{...a,quantity:8},{...b,quantity:5},epic,mythic]:[{...a,quantity:1},b,{...epic,owned:true,quantity:1},mythic,composite],recycling:{action,cost:0 as const,consumed:inputs,receivedIds:action==='dismantle'?[a.id,b.id]:[epic.id],unequipped:action==='dismantle'}})
beforeEach(()=>{mock.owner='recycling-user';setQueryAccount(mock.owner);mock.read.mockResolvedValue(state);mock.fresh.mockResolvedValue(state);mock.recycle.mockImplementation(async r=>receipt(r.action,r.inputs));vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}))})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.resetAllMocks();vi.unstubAllGlobals();localStorage.clear()})
async function recombine(){fireEvent.click(await screen.findByRole('tab',{name:'재조합'}));for(let i=0;i<6;i++)fireEvent.click(screen.getByRole('button',{name:a.name+' 1개 넣기'}));fireEvent.click(screen.getByRole('button',{name:'무료로 재조합하기'}))}
it('auto fills the lowest complete grade and protects equipped and crafted copies without submitting',async()=>{
 mock.read.mockResolvedValue({...state,relics:[{...epic,quantity:6,owned:true},{...a,quantity:3},composite,b,mythic]})
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 fireEvent.change(screen.getByRole('combobox',{name:'재조합 재료 등급'}),{target:{value:'epic'}})
 fireEvent.click(screen.getByRole('button',{name:'자동 넣기'}))
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'})).toHaveProperty('value','rare')
 const slots=within(screen.getByLabelText('선택한 유물 6칸'))
 expect(slots.getAllByRole('button',{name:a.name+' 1개 선택 해제'})).toHaveLength(2)
 expect(slots.getAllByRole('button',{name:b.name+' 1개 선택 해제'})).toHaveLength(4)
 expect(mock.recycle).not.toHaveBeenCalled()
})
it('uses epic when rare cannot complete six and only partially fills one grade if neither can',async()=>{
 mock.read.mockResolvedValue({...state,relics:[{...a,quantity:6},{...epic,quantity:6,owned:true},mythic,composite]})
 let view=render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 fireEvent.click(screen.getByRole('button',{name:'자동 넣기'}))
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'})).toHaveProperty('value','epic')
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('6 / 6')
 view.unmount();appQueryClient.clear()
 mock.read.mockResolvedValue({...state,relics:[{...a,quantity:3},{...epic,quantity:4,owned:true},mythic,composite]})
 view=render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 fireEvent.click(screen.getByRole('button',{name:'자동 넣기'}))
 expect(screen.getByRole('combobox',{name:'재조합 재료 등급'})).toHaveProperty('value','rare')
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('2 / 6')
 expect(screen.getByRole('button',{name:'무료로 재조합하기'})).toHaveProperty('disabled',true)
})
it('shows only six selected images and lets players remove one copy or clear the slots',async()=>{
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 for(let i=0;i<2;i++)fireEvent.click(screen.getByRole('button',{name:a.name+' 1개 넣기'}))
 for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:b.name+' 1개 넣기'}))
 const selected=screen.getByLabelText('선택한 유물 6칸')
 expect(selected.textContent).toBe('')
 expect(within(selected).getAllByRole('img')).toHaveLength(6)
 expect(selected.querySelectorAll('[data-filled=true]')).toHaveLength(6)
 fireEvent.click(within(selected).getAllByRole('button',{name:b.name+' 1개 선택 해제'})[0])
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('5 / 6')
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
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('0 / 6')
 expect(mock.recycle).toHaveBeenCalledTimes(1)
})
it('protects the equipped copy, shows the random pool, and confirms consumption before a guaranteed upgrade',async()=>{
 render(<RelicPage/>);fireEvent.click(await screen.findByRole('tab',{name:'재조합'}))
 expect(screen.getByText('장착 1개 보호 · 사용 가능 6개')).toBeTruthy()
 expect(screen.getByRole('button',{name:'무료로 재조합하기'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'결과 유물 보기'}));expect(screen.getByRole('dialog').textContent).toContain('1종 중 1개가 같은 확률')
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 for(let i=0;i<6;i++)fireEvent.click(screen.getByRole('button',{name:a.name+' 1개 넣기'}))
 expect(screen.getByRole('button',{name:a.name+' 1개 넣기'})).toHaveProperty('disabled',true)
 expect(screen.getByLabelText('선택한 재조합 재료').textContent).toContain('6 / 6')
 if(process.env.RELIC_RECYCLING_QA)writeFileSync('artifacts/relic-recombination.fragment.html',document.querySelector('section[aria-label="유물"]')!.outerHTML)
 fireEvent.click(screen.getByRole('button',{name:'무료로 재조합하기'}))
 const confirm=screen.getByRole('alertdialog');expect(confirm.textContent).not.toContain('무료 · 성공 100%');expect(mock.recycle).not.toHaveBeenCalled()
 fireEvent.click(within(confirm).getByRole('button',{name:'재조합하기'}))
 await screen.findByRole('dialog',{name:'재조합 완료'});expect(mock.recycle).toHaveBeenCalledWith({action:'recombine',inputs:[{id:a.id,quantity:6}],operation:expect.any(String)})
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
