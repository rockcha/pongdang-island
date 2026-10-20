import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import BrickBreakerGame from '@/features/arcade/brick-breaker-game'
import type {BrickScore} from '@/features/arcade/brick-breaker-model'
import {BRICK_ENGINE_VERSION} from '@/features/arcade/brick-breaker-replay'

const server=vi.hoisted(()=>({start:vi.fn(),settle:vi.fn(),ranks:vi.fn()}))
const engine=vi.hoisted(()=>({start:vi.fn(),stop:vi.fn(),setDirection:vi.fn(),setTarget:vi.fn(),launch:vi.fn(),next:vi.fn(),bank:vi.fn(),previewSkill:vi.fn(),replay:vi.fn(()=>({ticks:0,inputs:[]})),pause:vi.fn(),destroy:vi.fn(),ready:()=>{},error:()=>{},score:(_value:BrickScore)=>{}}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:0},loading:false,busy:false,error:'',refresh:vi.fn()})}))
vi.mock('@/features/arcade/brick-breaker-api',()=>({startBrickRun:server.start,settleBrickRun:server.settle,brickLeaderboard:server.ranks,brickError:()=>'서버 연결 오류'}))
vi.mock('@/features/arcade/brick-breaker-scene',()=>({createBrickGame:(_parent:HTMLElement,onScore:(score:BrickScore)=>void,_pause:()=>void,ready:()=>void,error:()=>void)=>{engine.ready=ready;engine.error=error;engine.score=onScore;return engine}}))
beforeEach(()=>{
 vi.clearAllMocks();window.history.replaceState({},'');server.ranks.mockResolvedValue({rows:[],total:0});server.start.mockResolvedValue({id:'paid-run',seed:42,engine_version:BRICK_ENGINE_VERSION,replay:{ticks:0,inputs:[]},finished_at:null});server.settle.mockResolvedValue({id:'paid-run',reward:0,score:0})
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
})
afterEach(async()=>{cleanup();await new Promise(resolve=>setTimeout(resolve,30))})
const show=()=>render(<MemoryRouter><BrickBreakerGame/></MemoryRouter>)
async function ready(){show();await act(async()=>{});act(()=>engine.ready())}

it('offers separate practice and laboratory modes, disabled until assets are ready',async()=>{
 show()
 expect((screen.getByRole('button',{name:'연습'}) as HTMLButtonElement).disabled).toBe(true)
 expect((screen.getByRole('button',{name:'모션'}) as HTMLButtonElement).disabled).toBe(true)
 expect((screen.getByRole('button',{name:'실전 (무료)'}) as HTMLButtonElement).disabled).toBe(true)
 await act(async()=>{});act(()=>engine.ready())
 fireEvent.click(screen.getByRole('button',{name:'연습'}))
 expect(engine.start).toHaveBeenLastCalledWith('practice')
 expect(screen.queryByRole('button',{name:/수중 미사일/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'시작하기'}));expect(engine.launch).toHaveBeenCalledOnce()
})

it('uses a bottom touch surface and stops movement when paused',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:'연습'}))
 const pad=screen.getByRole('group',{name:'퐁이 이동 조작'})
 expect(screen.queryByRole('button',{name:'왼쪽으로 이동'})).toBeNull()
 fireEvent.keyDown(pad,{key:'ArrowLeft'});expect(engine.setDirection).toHaveBeenLastCalledWith(-1)
 fireEvent.keyUp(pad,{key:'ArrowLeft'});expect(engine.setDirection).toHaveBeenLastCalledWith(0)
 fireEvent.click(screen.getByRole('button',{name:'게임 일시정지'}))
 expect(engine.setTarget).toHaveBeenLastCalledWith(null)
 expect(pad.getAttribute('aria-disabled')).toBe('true')
 expect(engine.launch).not.toHaveBeenCalled()
})

it('opens a dedicated lab modal and previews skills without practice or ball launch',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:'모션'}))
 expect(engine.start).toHaveBeenLastCalledWith('lab')
 expect(screen.getByRole('dialog',{name:'퐁이의 벽돌깨기'}).classList.contains('arcade-game-modal')).toBe(true)
 expect(screen.getByText('모션')).toBeTruthy()
 expect(screen.getByRole('heading',{name:'퐁이의 벽돌깨기'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'시작하기'})).toBeNull()
 expect(screen.queryByText('현재 점수')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:/돌진하는 퐁이/}))
 expect(engine.previewSkill).toHaveBeenLastCalledWith('dash')
 fireEvent.click(screen.getByRole('button',{name:/불가사리 표창/}))
 expect(engine.previewSkill).toHaveBeenLastCalledWith('star')
 fireEvent.click(screen.getByRole('button',{name:/해적의 동전/}))
 expect(engine.previewSkill).toHaveBeenLastCalledWith('pirate')
 fireEvent.click(screen.getByRole('button',{name:/혹등고래의 노래/}))
 expect(engine.previewSkill).toHaveBeenLastCalledWith('whale')
 for(const [name,kind] of [['해적의 보물','treasure'],['무거운 닻','anchor'],['독해파리','jelly']]){
  fireEvent.click(screen.getByRole('button',{name:new RegExp(name)}))
  expect(engine.previewSkill).toHaveBeenLastCalledWith(kind)
 }
 fireEvent.click(screen.getByRole('button',{name:/^어뢰/}))
 expect(engine.previewSkill).toHaveBeenLastCalledWith('torpedo')
 for(const [name,kind] of [['수중 미사일','item'],['긴 널판지','wide'],['물방울 보호막','shield'],['진주 분열','split'],['하트 회복','heart'],['집게 자석','magnet'],['파도 탄환','wave'],['돌진 상어','shark'],['성게 트리오','urchin'],['먹물 문어','ink'],['매운 해초','seaweed'],['양갈래 복어','puffer'],['끈끈이 액체','sticky'],['널판지 축소','shrink']]){
  fireEvent.click(screen.getByRole('button',{name:new RegExp(name)}))
  expect(engine.previewSkill).toHaveBeenLastCalledWith(kind)
 }
 expect(engine.start).toHaveBeenCalledOnce();expect(engine.launch).not.toHaveBeenCalled()
})

it.each(['연습'])('returns %s to the waiting menu using browser back',async(name)=>{
 await ready();fireEvent.click(screen.getByRole('button',{name}));if(name==='연습')act(()=>engine.score({phase:'over',round:1,lives:0,remaining:24}))
 await act(async()=>{window.history.back();await new Promise(resolve=>setTimeout(resolve,30))})
 await waitFor(()=>expect(screen.getByRole('group',{name:'게임 시작 메뉴'})).toBeTruthy())
 expect(engine.stop).toHaveBeenCalledOnce()
 expect(document.body.style.overflow).not.toBe('hidden')
 expect(screen.queryByRole('button',{name:'게임 나가기'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'연습'}))
 expect(engine.start).toHaveBeenLastCalledWith('practice')
 expect(screen.getByLabelText('연습 누적 보상 0골드')).toBeTruthy()
})

it('returns to the waiting menu from the back button and Escape',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:'연습'}))
 act(()=>engine.score({phase:'over',round:1,lives:0,remaining:24}));fireEvent.click(screen.getByRole('button',{name:'게임 나가기'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'모션'})).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'모션'}))
 fireEvent(screen.getByRole('dialog',{name:'퐁이의 벽돌깨기'}),new Event('cancel',{cancelable:true}));fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'나가기'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'연습'})).toBeTruthy())
 await waitFor(()=>expect(engine.stop).toHaveBeenCalledTimes(2))
})

it('waits for a manual restart after a dropped ball and shows remaining hearts',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:'연습'}))
 act(()=>engine.score({phase:'playing',round:1,lives:3,remaining:24}))
 act(()=>engine.score({phase:'ready',round:1,lives:2,remaining:24,awaitingRestart:true}))
 expect(within(screen.getByLabelText('공 다시 시작 안내')).getByRole('img',{name:'남은 목숨 2개'})).toBeTruthy()
 expect(screen.getByLabelText('공 다시 시작 안내')).toBeTruthy()
 expect(screen.queryByLabelText('생명 1개 감소')).toBeNull()
 expect(engine.launch).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'다시 시작'}))
 expect(engine.launch).toHaveBeenCalledOnce()
 act(()=>engine.score({phase:'playing',round:1,lives:2,remaining:24,awaitingRestart:false}))
 expect(screen.queryByLabelText('공 다시 시작 안내')).toBeNull()
})

it('shows life loss without pausing gameplay or blocking controls',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:"연습"}))
 act(()=>engine.score({phase:'playing',round:1,lives:3,remaining:24,held:true}))
 fireEvent.click(screen.getByRole('button',{name:"공 다시 발사"}));expect(engine.launch).toHaveBeenCalledOnce()
 act(()=>engine.score({phase:'playing',round:1,lives:2,remaining:24}))
 expect(screen.getByLabelText("생명 1개 감소")).toBeTruthy()
 expect(screen.queryByLabelText("목숨 감소 안내")).toBeNull()
 expect(screen.queryByRole('button',{name:"계속하기"})).toBeNull()
 expect(screen.getByRole('group',{name:"퐁이 이동 조작"}).getAttribute('aria-disabled')).toBe('false')
 expect(engine.pause).not.toHaveBeenCalled();expect(engine.launch).toHaveBeenCalledOnce()
 act(()=>engine.score({phase:'over',round:1,lives:0,remaining:24}))
 expect(screen.getByText("이번 도전은 여기까지")).toBeTruthy()
})

it('keeps both modes unavailable when artwork fails and destroys the renderer on exit',async()=>{
 const view=show();await act(async()=>{});act(()=>engine.error())
 expect(await screen.findByRole('alert')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'연습'})).toBeNull()
 expect(screen.queryByRole('button',{name:'모션'})).toBeNull()
 view.unmount();expect(engine.destroy).toHaveBeenCalledOnce()
})

it('guards practice exits with hearts left and restores history after browser back',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:'연습'}))
 fireEvent.click(screen.getByRole('button',{name:'게임 나가기'}))
 expect(screen.getByRole('alertdialog')).toBeTruthy();expect(engine.stop).not.toHaveBeenCalled()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'취소'}))
 await act(async()=>{window.history.back();await new Promise(resolve=>setTimeout(resolve,30))})
 expect(screen.getByRole('alertdialog')).toBeTruthy();expect(engine.stop).not.toHaveBeenCalled()
 expect(window.history.state.brickGameModal).toBeTruthy()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'취소'}))
 act(()=>engine.score({phase:'round-clear',round:1,lives:2,remaining:0}))
 expect(screen.queryByRole('button',{name:'여기서 점수 확보'})).toBeNull()
 act(()=>engine.score({phase:'playing',round:1,lives:2,remaining:12}))
 fireEvent.click(screen.getByRole('button',{name:'게임 나가기'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'나가기'}))
 await waitFor(()=>expect(engine.stop).toHaveBeenCalledOnce())
})

it('starts free real play directly and settles before leaving',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:'실전 (무료)'}))
 expect(screen.queryByRole('alertdialog')).toBeNull()
 await waitFor(()=>expect(engine.start).toHaveBeenLastCalledWith('paid',42,{ticks:0,inputs:[]}))
 expect(server.start).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('button',{name:'게임 나가기'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'나가기'}))
 await waitFor(()=>expect(server.settle).toHaveBeenCalledWith('paid-run',{ticks:0,inputs:[]},true))
 await waitFor(()=>expect(engine.stop).toHaveBeenCalledOnce())
})
it('loads brick rankings only when selected',async()=>{
 await ready();expect(server.ranks).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('tab',{name:'랭킹'}))
 await waitFor(()=>expect(server.ranks).toHaveBeenCalledWith(0))
 expect(screen.getByRole('tabpanel',{name:'랭킹'})).toBeTruthy()
})
it('opens the waiting-screen guide and switches between rules, items and hazards',async()=>{
 await ready()
 fireEvent.click(screen.getByRole('button',{name:'게임 방법 · 아이템 도감'}))
 const guide=await screen.findByRole('dialog',{name:'퐁이의 벽돌깨기 안내'})
 expect(within(guide).getByText('맞아도 멈추지 않아요')).toBeTruthy()
 fireEvent.click(within(guide).getByRole('tab',{name:'아이템'}))
 expect(within(guide).getByText('물방울 보호막')).toBeTruthy()
 expect(within(guide).getByText('획득 즉시 보상 +20 골드')).toBeTruthy()
 expect(within(guide).queryByText('독극물 병')).toBeNull()
 fireEvent.click(within(guide).getByRole('tab',{name:'방해물'}))
 expect(within(guide).getByText('독극물 병')).toBeTruthy()
 expect(within(guide).getByText('독액 3방울 · 닿으면 생명 −1')).toBeTruthy()
 expect(engine.start).not.toHaveBeenCalled()
})
it('shows round, clear reward and cumulative gold without score counters',async()=>{
 await ready();fireEvent.click(screen.getByRole('button',{name:'연습'}))
 act(()=>engine.score({phase:'playing',round:4,lives:2,remaining:12,reward:220,roundReward:100}))
 expect(screen.getByLabelText('현재 4라운드, 전체 5라운드')).toBeTruthy()
 expect(screen.getByLabelText('클리어 보상 100골드')).toBeTruthy()
 expect(screen.getByLabelText('연습 누적 보상 220골드')).toBeTruthy()
 expect(screen.queryByText('이번 라운드 점수')).toBeNull()
})
it('settles a saved legacy run before starting with the new rules',async()=>{
 server.start.mockResolvedValueOnce({id:'legacy',engine_version:1,seed:1,replay:{ticks:12,inputs:[]},finished_at:null})
 await ready();fireEvent.click(screen.getByRole('button',{name:'실전 (무료)'}))
 await waitFor(()=>expect(engine.start).toHaveBeenLastCalledWith('paid',42,{ticks:0,inputs:[]}))
 expect(server.settle).toHaveBeenCalledWith('legacy',{ticks:12,inputs:[]},true)
 expect(server.start).toHaveBeenCalledTimes(2)
})
