import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createMemoryRouter,Link,MemoryRouter,RouterProvider } from 'react-router'
const {load,prepare,begin,finish,refresh,transact,storage,aquarium}=vi.hoisted(()=>({load:vi.fn(),prepare:vi.fn(),begin:vi.fn(),finish:vi.fn(),refresh:vi.fn(),transact:vi.fn(),storage:vi.fn(),aquarium:vi.fn()}))
vi.mock('@/features/aquarium/api',async original=>({...await original<typeof import('@/features/aquarium/api')>(),loadCollectibleStorage:storage,loadAquarium:aquarium}))
vi.mock('@/features/fishing/tension-fishing-game',()=>({TensionFishingGame:({onCaught,onCancel,onFailed,active,challenge,outline,start,onStartFight,expiresAt}:{onStartFight?:()=>Promise<boolean>;expiresAt?:string;onCaught:()=>void;onCancel:()=>void;onFailed:(reason:string)=>void;active:boolean;challenge:{rarity:string;failureAt?:number};outline?:{name:string};start?:{label:string;disabled:boolean;onStart:()=>void}})=>active?<div data-testid="challenge" data-rarity={challenge.rarity} data-doomed={challenge.failureAt!==undefined} data-outline={outline?.name??'generic'} data-deadline={expiresAt}>{onStartFight&&<button onClick={()=>void onStartFight()}>입질 시작</button>}<button onClick={onCaught}>미니게임 성공</button><button onClick={onCancel}>미니게임 취소</button><button onClick={()=>onFailed('snap')}>미니게임 실패</button></div>:<div>낚싯대가 준비됐어요{start&&<button disabled={start.disabled} onClick={start.onStart}>{start.label}</button>}</div>}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
vi.mock('@/features/fishing/api',()=>({loadFishing:load,prepareFishing:prepare,startFishingFight:begin,finishFishing:finish,fishingError:()=> '결과를 다시 확인해주세요.'}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:1000,inventory:{bait:2}},transact,refresh,busy:false,loading:false,error:''})}))
import { FishingPanel } from '@/features/fishing/fishing-panel'
import { CatchReveal } from '@/features/fishing/catch-reveal'
import { readFishingTrip } from '@/features/fishing/fishing-trip'
const bait={id:'bait',name:'퐁당 지렁이',description:'퐁당섬의 선홍빛 지렁이',effect_kind:'fish',effect_description:'등급 확률',price:30,image_path:'/normal.png',common_bp:8500,rare_bp:1300,epic_bp:180,mythic_bp:20,failure_bp:0}
const species={id:'sample',name:'달빛 퐁울복',kind:'fish',rarity:'rare',description:'푸른 바다의 친구',thumbnail_path:'fish/thumbnail.png'}
const plan={operation_id:'prepared-id',region_id:'pongdang',bait_id:'bait',eligible:true,species,rarity:'rare',wait_seconds:3,failure_at:6,failure_reason:'escape',finished:false,expires_at:'2099-01-01'}
it('shows equipped rod and selected bait images in the four-button dock',async()=>{
 load.mockResolvedValue({baits:[bait],successChanceBp:3500})
 const target=document.createElement('div')
 document.body.appendChild(target)
 try{
  render(<MemoryRouter><FishingPanel regionId="mistmoon" regionName="안개달 해역" toolbarTarget={target}/></MemoryRouter>)
  const tools=within(target)
  const baitButton=await screen.findByRole('button',{name:/미끼통 열기/})
  expect(target.contains(baitButton)).toBe(false)
  expect(baitButton.querySelector('img')?.getAttribute('src')).toBe('/normal.png')
  expect(baitButton.getAttribute('aria-label')).toContain('2개')
  expect(screen.getByRole('button',{name:'낚싯대 선택 · 입문용 낚싯대'}).querySelector('img')?.getAttribute('src')).toContain('equipment/rods/starter/thumbnail.png')
  const dock=screen.getByRole('group',{name:'낚시 준비 도구'})
  expect(within(dock).getAllByRole('button')).toHaveLength(4)
  expect(within(dock).getByRole('button',{name:'바다 도감'})).toBeTruthy()
  expect(target.contains(dock)).toBe(false)
  expect(tools.queryByRole('link',{name:'지도'})).toBeNull()
  expect(tools.queryByRole('button',{name:'힘 테스트'})).toBeNull()
  fireEvent.click(baitButton)
  expect(screen.getByRole('dialog',{name:'미끼통'})).toBeTruthy()
 }finally{cleanup();target.remove()}
})
afterEach(()=>{cleanup();localStorage.clear();vi.resetAllMocks()})
function setup(){load.mockResolvedValue({baits:[bait],successChanceBp:3500});refresh.mockResolvedValue(undefined);prepare.mockResolvedValue(plan);finish.mockResolvedValue({attempt:{operation_id:plan.operation_id,rarity:null,species:null},replayed:false});return render(<MemoryRouter><FishingPanel regionId="pongdang"/></MemoryRouter>)}
function setupNavigation(){
 load.mockResolvedValue({baits:[bait],successChanceBp:3500});refresh.mockResolvedValue(undefined);prepare.mockResolvedValue(plan);finish.mockResolvedValue({attempt:{operation_id:plan.operation_id,rarity:null,species:null},replayed:false})
 const router=createMemoryRouter([{path:'/fish',element:<><FishingPanel regionId="pongdang"/><Link to="/home">다른 페이지</Link></>},{path:'/home',element:<p>이동한 페이지</p>}],{initialEntries:['/fish']})
 render(<RouterProvider router={router}/>);return router
}
it('cancels the paid cast only when leaving is confirmed, without preparing or spending again',async()=>{
 const router=setupNavigation();await start()
 fireEvent.click(screen.getByRole('link',{name:'다른 페이지'}))
 fireEvent.click(await screen.findByRole('button',{name:'계속 낚시하기'}))
 expect(router.state.location.pathname).toBe('/fish');expect(finish).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('link',{name:'다른 페이지'}))
 fireEvent.click(await screen.findByRole('button',{name:'그만두고 이동'}))
 await screen.findByText('이동한 페이지')
 expect(prepare).toHaveBeenCalledOnce()
 expect(finish).toHaveBeenCalledExactlyOnceWith(plan.operation_id,false)
})
it('reconciles an ambiguous preparation with the original operation before leaving',async()=>{
 setupNavigation();prepare.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(plan)
 fireEvent.click(await screen.findByRole('button',{name:'퐁당 지렁이 1개로 낚시하기'}))
 await screen.findByRole('button',{name:'결과 다시 확인'})
 fireEvent.click(screen.getByRole('link',{name:'다른 페이지'}))
 fireEvent.click(await screen.findByRole('button',{name:'그만두고 이동'}))
 await screen.findByText('이동한 페이지')
 expect(prepare.mock.calls[0][2]).toBe(prepare.mock.calls[1][2])
 expect(finish).toHaveBeenCalledExactlyOnceWith(prepare.mock.calls[0][2],false)
})
it('preserves an uncertain win when leaving instead of turning it into a loss',async()=>{
 setupNavigation();finish.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({attempt:{operation_id:plan.operation_id,rarity:'rare',species},replayed:true})
 await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}))
 await screen.findByRole('button',{name:'결과 다시 확인'})
 fireEvent.click(screen.getByRole('link',{name:'다른 페이지'}))
 fireEvent.click(await screen.findByRole('button',{name:'그만두고 이동'}))
 await screen.findByText('이동한 페이지')
 expect(finish.mock.calls).toEqual([[plan.operation_id,true],[plan.operation_id,true]])
})
it('shows distinct Pongi artwork for a full gauge, an empty gauge and a chance escape',()=>{
 const {rerender}=render(<CatchReveal failure="줄이 끊어졌어요" failureReason="snap" onDismiss={vi.fn()}/>)
 expect(screen.getByRole('img',{name:'끊어진 낚싯줄을 보고 놀란 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-snap.png')
 rerender(<CatchReveal failure="줄이 느슨해졌어요" failureReason="slack" onDismiss={vi.fn()}/>)
 expect(screen.getByRole('img',{name:'느슨해진 낚싯줄을 보고 당황한 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-slack.png')
 rerender(<CatchReveal failure="맛만 보고 달아났어요" failureReason="bait" onDismiss={vi.fn()}/>)
 expect(screen.getByRole('img',{name:'낚시에 실패해 시무룩한 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-fail.png')
})
function dismissResult(){const clock=vi.spyOn(Date,'now').mockReturnValue(Date.now()+1000);try{fireEvent.click(screen.getByRole('button',{name:'낚시 실패 결과 닫기'}))}finally{clock.mockRestore()}}
async function start(){fireEvent.click(await screen.findByRole('button',{name:'퐁당 지렁이 1개로 낚시하기'}));await screen.findByRole('button',{name:'미니게임 성공'})}
it('keeps harbor and collection tools without the removed native species modal',async()=>{
 setup()
 await screen.findByRole('button',{name:/미끼통/})
 expect(screen.queryByRole('button',{name:'이 바다를 주 서식지로 하는 개체'})).toBeNull()
 expect(screen.getByRole('button',{name:'바다 도감'})).toBeTruthy()
 const harbor=screen.getByRole('link',{name:'지도'})
 expect(harbor.getAttribute('href')).toBe('/harbor')
 expect(harbor.querySelector('img')?.getAttribute('src')).toBe('/app-icons/map.png')
 expect(screen.getByRole('button',{name:'보관함'})).toBeTruthy()
 expect(screen.queryByText('이번 낚시')).toBeNull()
})
it('stages the bait selection and applies it with the footer use button beside the shop',async()=>{
 setup();fireEvent.click(await screen.findByRole('button',{name:/미끼통/}));
 const dialog=screen.getByRole('dialog',{name:'미끼통'})
 expect(within(dialog).getByRole('button',{name:'퐁당 지렁이 선택'})).toBeTruthy()
 expect(within(dialog).queryByText(/성공 예정/)).toBeNull()
 expect(within(dialog).queryByRole('button',{name:/구매/})).toBeNull()
 expect(within(dialog).getByRole('link',{name:'미끼 상점으로'}).getAttribute('href')).toBe('/shop?tab=bait')
 fireEvent.click(within(dialog).getByRole('button',{name:'퐁당 지렁이 선택'}))
 expect(screen.getByRole('dialog',{name:'미끼통'})).toBeTruthy()
 fireEvent.click(within(dialog).getByRole('button',{name:'선택한 미끼 사용하기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('prepares before playing and passes the reserved silhouette and strength without granting early',async()=>{
 setup();await start();expect(prepare).toHaveBeenCalledWith('pongdang','bait',expect.any(String));expect(finish).not.toHaveBeenCalled();expect(screen.getByTestId('challenge').dataset).toMatchObject({rarity:'rare',outline:species.name,doomed:'false'});fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}));await screen.findByText('낚시 실패');expect(finish).toHaveBeenCalledWith(plan.operation_id,true)
})
it('finalizes cancellation and minigame failure as losses',async()=>{
 setup();await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 취소'}));await screen.findByText('낚시 실패');expect(finish).toHaveBeenCalledWith(plan.operation_id,false);expect(screen.queryByText('사용한 미끼 1개는 소모됐어요.')).toBeNull();expect(screen.getByRole('img',{name:'낚시에 실패해 시무룩한 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-fail.png');expect(screen.getByText('낚시를 그만두었어요.')).toBeTruthy();expect(screen.queryByRole('dialog')).toBeNull();dismissResult();expect(screen.queryByText('낚시 실패')).toBeNull()
})
it('uses a generic common shadow and a scripted escape for the pre-drawn failure',async()=>{
 setup();prepare.mockResolvedValue({...plan,eligible:false,species:null,rarity:'common'});await start();expect(screen.getByTestId('challenge').dataset).toMatchObject({rarity:'common',outline:'generic',doomed:'true'});fireEvent.click(screen.getByRole('button',{name:'미니게임 실패'}));await screen.findByText('낚시 실패');expect(finish).toHaveBeenCalledWith(plan.operation_id,false)
})
it('retries an ambiguous prepare with the same ID instead of buying a fresh chance',async()=>{
 setup();prepare.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(plan);fireEvent.click(await screen.findByRole('button',{name:'퐁당 지렁이 1개로 낚시하기'}));fireEvent.click(await screen.findByRole('button',{name:'결과 다시 확인'}));await screen.findByRole('button',{name:'미니게임 성공'});expect(prepare.mock.calls[0][2]).toBe(prepare.mock.calls[1][2]);expect(finish).not.toHaveBeenCalled()
})
it('distinguishes a planned escape from a broken line and preserves the latter on retry',async()=>{
 setup();finish.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({attempt:{operation_id:plan.operation_id,rarity:null,species:null},failure_reason:'minigame',replayed:true})
 await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 실패'}))
 fireEvent.click(await screen.findByRole('button',{name:'결과 다시 확인'}))
 expect(await screen.findByText('너무 세게 당겨 낚싯줄이 끊어졌어요.')).toBeTruthy()
 expect(screen.queryByText('힘 조절 실패')).toBeNull()
})
it('labels pre-drawn failures as a fish leaving instead of player error',async()=>{
 setup();prepare.mockResolvedValue({...plan,eligible:false,species:null,rarity:'common',failure_reason:'bait'})
 finish.mockResolvedValue({attempt:{operation_id:plan.operation_id,rarity:null,species:null},failure_reason:'bait'})
 await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 실패'}))
 expect(await screen.findByText('낚시 실패')).toBeTruthy()
 expect(screen.queryByText('미끼를 맛만 보고 도망갔어요.')).toBeNull()
 expect(screen.queryByText('입질만 하고 떠났어요')).toBeNull()
 expect(screen.queryByText('힘 조절 실패')).toBeNull()
})
it('retries settlement with the frozen operation and win flag, then reveals the exact reward',async()=>{
 setup();finish.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({attempt:{operation_id:plan.operation_id,rarity:'rare',species},replayed:true});await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}));fireEvent.click(await screen.findByRole('button',{name:'결과 다시 확인'}));await screen.findByText('달빛 퐁울복',{}, {timeout:2500});expect(finish.mock.calls).toEqual([[plan.operation_id,true],[plan.operation_id,true]])
})
it('keeps the landing scene visible until reward confirmation completes',async()=>{
 setup();let complete!:(value:unknown)=>void
 finish.mockImplementation(()=>new Promise(resolve=>{complete=resolve}))
 await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}))
 await waitFor(()=>expect(finish).toHaveBeenCalledOnce())
 expect(screen.getByTestId('challenge')).toBeTruthy()
 expect(screen.queryByText('달빛 퐁울복')).toBeNull()
 complete({attempt:{operation_id:plan.operation_id,rarity:'rare',species},replayed:false})
 expect(await screen.findByText('달빛 퐁울복')).toBeTruthy()
 expect(screen.queryByTestId('challenge')).toBeNull()
})
it('runs all four forced rarity practices without consuming bait or calling reward endpoints',async()=>{
 setup();await screen.findByRole('button',{name:/미끼통/});for(const [label,rarity] of [['일반','common'],['희귀','rare'],['특급','epic'],['신화','mythic']]){fireEvent.click(screen.getByRole('button',{name:/힘 테스트|테스트$/}));fireEvent.click(screen.getByRole('button',{name:label}));fireEvent.click(screen.getByRole('button',{name:label+' 테스트 시작'}));expect(screen.getByTestId('challenge').dataset.rarity).toBe(rarity);fireEvent.click(screen.getByRole('button',{name:'미니게임 실패'}));await screen.findByRole('button',{name:'낚시 실패 결과 닫기'});dismissResult();await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())};expect(prepare).not.toHaveBeenCalled();expect(finish).not.toHaveBeenCalled();expect(transact).not.toHaveBeenCalled()
})
it('continues to show the standalone shop inventory without a region',async()=>{
 load.mockResolvedValue({baits:[bait]});render(<MemoryRouter><FishingPanel/></MemoryRouter>);expect(await screen.findByText(bait.description)).toBeTruthy();expect(screen.getByRole('button',{name:'퐁당 지렁이 1개 구매 30 골드'})).toBeTruthy();expect(screen.queryByRole('button',{name:/낚시하기/})).toBeNull()
})

it('lists actual storage and clears trip markers when leaving the fishing page',async()=>{
 const view=setup()
 const owned={id:'caught-1',species_id:species.id,tank_id:null,acquired_at:new Date().toISOString(),species:{...species,sell_price:30}}
 storage.mockResolvedValue({items:[owned],total:1})
 aquarium.mockResolvedValue({storageCount:1,inhabitants:[],tanks:[{id:'tank',name:'tank'}],tankCapacity:50})
 finish.mockResolvedValue({attempt:{operation_id:plan.operation_id,collectible_id:owned.id,rarity:'rare',species},replayed:false})
 await start()
 fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}))
 await screen.findByRole('button',{name:'달빛 퐁울복 결과 닫기'})
 // CatchReveal ignores accidental taps during its first 800ms.
 await new Promise(resolve=>setTimeout(resolve,850))
 fireEvent.click(await screen.findByRole('button',{name:'달빛 퐁울복 결과 닫기'}))
 expect(readFishingTrip('guest')).toHaveLength(0)
 await waitFor(()=>expect(screen.getByRole('button',{name:'보관함'})).toHaveProperty('disabled',false),{timeout:2500})
 fireEvent.click(await screen.findByRole('button',{name:'보관함'}))
 expect(await screen.findByRole('button',{name:'이번 낚시 · 1'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 view.rerender(<MemoryRouter><FishingPanel key="coral" regionId="coral"/></MemoryRouter>)
 fireEvent.click(await screen.findByRole('button',{name:'보관함'}))
 expect(await screen.findByRole('dialog')).toBeTruthy()
 expect(await screen.findByText('달빛 퐁울복')).toBeTruthy()
 expect(within(screen.getByRole('dialog')).getByRole('button',{name:'달빛 퐁울복 선택'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'이번 낚시 · 0'})).toBeTruthy()
})

it('guarantees the selected practice catch when the minigame succeeds without server rolls',async()=>{setup();await screen.findByRole('button',{name:/미끼통/});fireEvent.click(screen.getByRole('button',{name:'힘 테스트'}));fireEvent.click(screen.getByRole('button',{name:'신화'}));fireEvent.click(screen.getByRole('button',{name:'신화 테스트 시작'}));fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}));await screen.findByText('새벽을 여는 일각고래',{}, {timeout:2500});expect(readFishingTrip('guest')).toEqual([]);expect(screen.getByText('연습 결과예요. 실제 보상은 지급되지 않아요.')).toBeTruthy();await new Promise(resolve=>setTimeout(resolve,1700));expect(screen.getByRole('button',{name:'새벽을 여는 일각고래 결과 닫기'})).toBeTruthy();expect(screen.queryByRole('region',{name:'낚시 결과'})).toBeNull();expect(screen.queryByRole('button',{name:'다시 낚시하기'})).toBeNull();expect(screen.queryByRole('dialog')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'새벽을 여는 일각고래 결과 닫기'}));await screen.findByRole('button',{name:'신화 테스트 시작'});expect(prepare).not.toHaveBeenCalled();expect(finish).not.toHaveBeenCalled()})

it('starts real fishing on LAN HTTP without randomUUID',async()=>{
 const source=globalThis.crypto
 vi.stubGlobal('crypto',{getRandomValues:source.getRandomValues.bind(source)})
 try{setup();await start();expect(prepare).toHaveBeenCalledWith('pongdang','bait',expect.stringMatching(/^[0-9a-f-]{36}$/))}finally{vi.unstubAllGlobals()}
})

it('starts the reserved cast once and forwards the server-confirmed deadline without spending another bait',async()=>{
 setup()
 prepare.mockResolvedValue({...plan,confirm_bite:true})
 begin.mockResolvedValue({...plan,confirm_bite:true,fight_started_at:'2026-10-22T12:00:00Z',expires_at:'2026-10-22T12:03:00Z',server_now:'2026-10-22T12:00:00Z'})
 await start()
 expect(begin).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'입질 시작'}))
 await waitFor(()=>expect(screen.getByTestId('challenge').dataset.deadline).toBe('2026-10-22T12:03:00Z'))
 expect(begin).toHaveBeenCalledExactlyOnceWith(plan.operation_id)
 expect(prepare).toHaveBeenCalledOnce();expect(finish).not.toHaveBeenCalled();expect(transact).not.toHaveBeenCalled()
})

it('shows the server result if an abandoned confirmation is already expired when tapped',async()=>{
 setup()
 prepare.mockResolvedValue({...plan,confirm_bite:true})
 begin.mockResolvedValue({...plan,confirm_bite:true,finished:true,result:{attempt:{operation_id:plan.operation_id,rarity:null,species:null},failure_reason:'expired'}})
 await start()
 fireEvent.click(screen.getByRole('button',{name:'입질 시작'}))
 expect(await screen.findByText('낚시 시간이 지나 물고기가 떠났어요.')).toBeTruthy()
 expect(prepare).toHaveBeenCalledOnce();expect(finish).not.toHaveBeenCalled()
})
