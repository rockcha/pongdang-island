import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
const {load,prepare,finish,refresh,transact}=vi.hoisted(()=>({load:vi.fn(),prepare:vi.fn(),finish:vi.fn(),refresh:vi.fn(),transact:vi.fn()}))
vi.mock('@/features/fishing/tension-fishing-game',()=>({TensionFishingGame:({onCaught,onCancel,onFailed,active,challenge,outline,start}:{onCaught:()=>void;onCancel:()=>void;onFailed:(reason:string)=>void;active:boolean;challenge:{rarity:string;failureAt?:number};outline?:{name:string};start?:{label:string;disabled:boolean;onStart:()=>void}})=>active?<div data-testid="challenge" data-rarity={challenge.rarity} data-doomed={challenge.failureAt!==undefined} data-outline={outline?.name??'generic'}><button onClick={onCaught}>미니게임 성공</button><button onClick={onCancel}>미니게임 취소</button><button onClick={()=>onFailed('snap')}>미니게임 실패</button></div>:<div>낚싯대가 준비됐어요{start&&<button disabled={start.disabled} onClick={start.onStart}>{start.label}</button>}</div>}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
vi.mock('@/features/fishing/api',()=>({loadFishing:load,prepareFishing:prepare,finishFishing:finish,fishingError:()=> '결과를 다시 확인해주세요.'}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:1000,inventory:{bait:2}},transact,refresh,busy:false,loading:false,error:''})}))
import { FishingPanel } from '@/features/fishing/fishing-panel'
import { CatchReveal } from '@/features/fishing/catch-reveal'
import { readFishingTrip } from '@/features/fishing/fishing-trip'
const bait={id:'bait',name:'퐁당 지렁이',description:'퐁당섬의 선홍빛 지렁이',effect_kind:'fish',effect_description:'등급 확률',price:30,image_path:'/normal.png',common_bp:8500,rare_bp:1300,epic_bp:180,mythic_bp:20,failure_bp:0}
const species={id:'sample',name:'달빛 퐁울복',kind:'fish',rarity:'rare',description:'푸른 바다의 친구',thumbnail_path:'fish/thumbnail.png'}
const plan={operation_id:'prepared-id',region_id:'pongdang',bait_id:'bait',eligible:true,species,rarity:'rare',wait_seconds:3,failure_at:6,failure_reason:'escape',finished:false,expires_at:'2099-01-01'}
it('keeps bait below the banner while collection tools use the banner target',async()=>{
 load.mockResolvedValue({baits:[bait],successChanceBp:3500})
 const target=document.createElement('div')
 document.body.appendChild(target)
 try{
  render(<MemoryRouter><FishingPanel regionId="mistmoon" regionName="안개달 해역" toolbarTarget={target}/></MemoryRouter>)
  const tools=within(target)
  const baitButton=await screen.findByRole('button',{name:/미끼통 열기/})
  expect(target.contains(baitButton)).toBe(false)
  expect(tools.getByRole('button',{name:'바다 도감'})).toBeTruthy()
  expect(tools.getByRole('link',{name:'지도'})).toBeTruthy()
  fireEvent.click(baitButton)
  expect(screen.getByRole('dialog',{name:'미끼통'})).toBeTruthy()
 }finally{cleanup();target.remove()}
})
afterEach(()=>{cleanup();localStorage.clear();vi.resetAllMocks()})
function setup(){load.mockResolvedValue({baits:[bait],successChanceBp:3500});refresh.mockResolvedValue(undefined);prepare.mockResolvedValue(plan);finish.mockResolvedValue({attempt:{operation_id:plan.operation_id,rarity:null,species:null},replayed:false});return render(<MemoryRouter><FishingPanel regionId="pongdang"/></MemoryRouter>)}
it('shows distinct Pongi artwork for a full gauge, an empty gauge and a chance escape',()=>{
 const {rerender}=render(<CatchReveal failure="줄이 끊어졌어요" failureReason="snap" onDismiss={vi.fn()}/>)
 expect(screen.getByRole('img',{name:'끊어진 낚싯줄을 보고 놀란 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-snap.png')
 rerender(<CatchReveal failure="줄이 느슨해졌어요" failureReason="slack" onDismiss={vi.fn()}/>)
 expect(screen.getByRole('img',{name:'느슨해진 낚싯줄을 보고 당황한 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-slack.png')
 rerender(<CatchReveal failure="맛만 보고 달아났어요" failureReason="bait" onDismiss={vi.fn()}/>)
 expect(screen.getByRole('img',{name:'낚시에 실패해 시무룩한 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-fail.png')
})
async function start(){fireEvent.click(await screen.findByRole('button',{name:'퐁당 지렁이 1개로 낚시하기'}));await screen.findByRole('button',{name:'미니게임 성공'})}
it('places the native species and anchor harbor tools beside the collection book',async()=>{
 setup()
 await screen.findByRole('button',{name:/미끼통/})
 expect(screen.getByRole('button',{name:'이 바다의 특별한 개체'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'바다 도감'})).toBeTruthy()
 const harbor=screen.getByRole('link',{name:'지도'})
 expect(harbor.getAttribute('href')).toBe('/harbor')
 expect(harbor.querySelector('svg')).toBeTruthy()
 expect(screen.getByRole('button',{name:'보관함 · 0개'})).toBeTruthy()
 expect(screen.queryByText('이번 낚시')).toBeNull()
})
it('shows 35 percent separately from conditional rarity odds in the bait box',async()=>{
 setup();fireEvent.click(await screen.findByRole('button',{name:/미끼통/}));expect(await screen.findByText(/성공 예정 35%/)).toBeTruthy();expect(screen.getByText('성공 예정일 때의 등급 확률')).toBeTruthy();expect(screen.getByText(/일반 85% · 희귀 13% · 특급 1.8% · 신화 0.2%/)).toBeTruthy();expect(screen.getByText(/취소·실패해도 돌려받지 않아요/)).toBeTruthy()
})
it('prepares before playing and passes the reserved silhouette and strength without granting early',async()=>{
 setup();await start();expect(prepare).toHaveBeenCalledWith('pongdang','bait',expect.any(String));expect(finish).not.toHaveBeenCalled();expect(screen.getByTestId('challenge').dataset).toMatchObject({rarity:'rare',outline:species.name,doomed:'false'});fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}));await screen.findByText('낚시 실패');expect(finish).toHaveBeenCalledWith(plan.operation_id,true)
})
it('finalizes cancellation and minigame failure as losses',async()=>{
 setup();await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 취소'}));await screen.findByText('낚시 실패');expect(finish).toHaveBeenCalledWith(plan.operation_id,false);expect(screen.getByText('사용한 미끼 1개는 소모됐어요.')).toBeTruthy();expect(screen.getByRole('img',{name:'낚시에 실패해 시무룩한 퐁이'}).getAttribute('src')).toBe('/branding/pongi-fishing-fail.png');expect(screen.getByText('낚시를 그만두었어요.')).toBeTruthy();expect(screen.queryByRole('dialog')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'낚시 실패 결과 닫기'}));expect(screen.queryByText('낚시 실패')).toBeNull()
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
 expect(screen.getByText('힘 조절 실패')).toBeTruthy()
})
it('labels pre-drawn failures as a fish leaving instead of player error',async()=>{
 setup();prepare.mockResolvedValue({...plan,eligible:false,species:null,rarity:'common',failure_reason:'bait'})
 finish.mockResolvedValue({attempt:{operation_id:plan.operation_id,rarity:null,species:null},failure_reason:'bait'})
 await start();fireEvent.click(screen.getByRole('button',{name:'미니게임 실패'}))
 expect(await screen.findByText('미끼를 맛만 보고 도망갔어요.')).toBeTruthy()
 expect(screen.getByText('입질만 하고 떠났어요')).toBeTruthy()
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
 setup();await screen.findByRole('button',{name:/미끼통/});for(const [label,rarity] of [['일반','common'],['희귀','rare'],['특급','epic'],['신화','mythic']]){fireEvent.click(screen.getByRole('button',{name:/힘 테스트|테스트$/}));fireEvent.click(screen.getByRole('button',{name:label}));fireEvent.click(screen.getByRole('button',{name:label+' 테스트 시작'}));expect(screen.getByTestId('challenge').dataset.rarity).toBe(rarity);fireEvent.click(screen.getByRole('button',{name:'미니게임 실패'}));fireEvent.click(await screen.findByRole('button',{name:'낚시 실패 결과 닫기'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())};expect(prepare).not.toHaveBeenCalled();expect(finish).not.toHaveBeenCalled();expect(transact).not.toHaveBeenCalled()
})
it('continues to show the standalone shop inventory without a region',async()=>{
 load.mockResolvedValue({baits:[bait]});render(<MemoryRouter><FishingPanel/></MemoryRouter>);expect(await screen.findByText(bait.description)).toBeTruthy();expect(screen.getByRole('button',{name:'퐁당 지렁이 1개 구매 30 골드'})).toBeTruthy();expect(screen.queryByRole('button',{name:/낚시하기/})).toBeNull()
})

it('lists a real catch in the trip modal and restores it when changing regions',async()=>{
 const view=setup()
 finish.mockResolvedValue({attempt:{operation_id:plan.operation_id,rarity:'rare',species},replayed:false})
 await start()
 fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}))
 fireEvent.click(await screen.findByRole('button',{name:'달빛 퐁울복 결과 닫기'}))
 expect(readFishingTrip('guest')).toHaveLength(1)
 view.rerender(<MemoryRouter><FishingPanel key="coral" regionId="coral"/></MemoryRouter>)
 fireEvent.click(await screen.findByRole('button',{name:'보관함 · 1개'}))
 expect(await screen.findByRole('dialog')).toBeTruthy()
 expect(screen.getByText('달빛 퐁울복')).toBeTruthy()
 expect(screen.getByText('×1')).toBeTruthy()
})

it('guarantees the selected practice catch when the minigame succeeds without server rolls',async()=>{setup();await screen.findByRole('button',{name:/미끼통/});fireEvent.click(screen.getByRole('button',{name:'힘 테스트'}));fireEvent.click(screen.getByRole('button',{name:'신화'}));fireEvent.click(screen.getByRole('button',{name:'신화 테스트 시작'}));fireEvent.click(screen.getByRole('button',{name:'미니게임 성공'}));await screen.findByText('새벽을 여는 일각고래',{}, {timeout:2500});expect(readFishingTrip('guest')).toEqual([]);expect(screen.getByText('연습 결과예요. 실제 보상은 지급되지 않아요.')).toBeTruthy();await new Promise(resolve=>setTimeout(resolve,1700));expect(screen.getByRole('button',{name:'새벽을 여는 일각고래 결과 닫기'})).toBeTruthy();expect(screen.queryByRole('region',{name:'낚시 결과'})).toBeNull();expect(screen.queryByRole('button',{name:'다시 낚시하기'})).toBeNull();expect(screen.queryByRole('dialog')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'새벽을 여는 일각고래 결과 닫기'}));await screen.findByRole('button',{name:'신화 테스트 시작'});expect(prepare).not.toHaveBeenCalled();expect(finish).not.toHaveBeenCalled()})
