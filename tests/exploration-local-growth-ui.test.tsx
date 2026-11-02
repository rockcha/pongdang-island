import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {ExplorationStatTestPage} from '@/features/exploration/exploration-stat-test-page'
import {ExplorationPage} from '@/features/exploration/exploration-page'
import {TestExplorationGame} from '@/features/exploration/test-exploration-game'
import {combatTimings} from '@/features/exploration/combat-timing'
import {shopkeepers} from '@/features/exploration/shopkeepers'
import {merchantPotions} from '@/features/exploration/practice-state'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
import {mkdirSync,writeFileSync} from 'node:fs'

function capture(name:string){if(process.env.LOCAL_GROWTH_PREVIEW==='1'){mkdirSync('artifacts',{recursive:true});writeFileSync(`artifacts/exploration-growth-${name}.html`,'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>'+document.body.outerHTML+'</html>')}}

const mocks=vi.hoisted(()=>({operator:true,read:vi.fn(),command:vi.fn(),startMusic:vi.fn()}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:mocks.operator,loading:false})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'operator'}},recovery:false}),getNickname:()=> '테스터'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:null})}))
vi.mock('@/features/exploration/saved-run-api',()=>({readSavedExploration:mocks.read}))
vi.mock('@/features/exploration/reward-api',()=>({commandExploration:mocks.command}))
vi.mock('@/features/exploration/exploration-feedback',()=>({ExplorationFeedback:()=>null}))
vi.mock('@/features/exploration/exploration-ranking',()=>({ExplorationRanking:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic:mocks.startMusic,unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
beforeEach(()=>{mocks.operator=true;mocks.read.mockReset();mocks.command.mockReset();mocks.startMusic.mockReset();setQueryAccount('operator');vi.stubGlobal('matchMedia',()=>({matches:true}))})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.unstubAllGlobals();vi.useRealTimers()})
it('ends combat music at the visible killing blow while staying on the victory screen',async()=>{
 vi.useFakeTimers()
 const random=vi.spyOn(Math,'random').mockReturnValue(.99)
 try{
  render(<TestExplorationGame nickname="테스터" onLeave={()=>{}}/>)
  const advance=async(ms:number)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms)})
  await advance(1400)
  fireEvent.click(screen.getByRole('button',{name:'마나 선택 · 최대 마나 +3'}))
  await advance(300)
  fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:'monster:jar-wisp'}})
  fireEvent.click(document.querySelector('.exploration-choice')!)
  fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}))
  await advance(7400)
  expect(mocks.startMusic).toHaveBeenLastCalledWith('combat')
  for(let turn=0;turn<4;turn++){
   fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
   await advance(0)
   expect(mocks.startMusic).toHaveBeenLastCalledWith('combat')
   await advance(combatTimings.player)
   if((screen.getByRole('progressbar',{name:'항아리 위습 체력'}) as HTMLProgressElement).value===0){
    expect(mocks.startMusic).toHaveBeenLastCalledWith('exploration')
    await advance(combatTimings.done+1000)
    expect(mocks.startMusic).toHaveBeenLastCalledWith('exploration')
    return
   }
   await advance(combatTimings.done+1000)
  }
  throw Error('Expected the test monster to be defeated')
 }finally{random.mockRestore()}
})
it('opens a tabbed sale modal, handles empty armor and sells unequipped weapons and magic',async()=>{
 vi.useFakeTimers()
 render(<TestExplorationGame nickname="테스터" onLeave={()=>{}}/>)
 const advance=async(ms:number)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms)})
 await advance(1400)
 fireEvent.click(screen.getByRole('button',{name:'마나 선택 · 최대 마나 +3'}))
 await advance(300)
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:'scales'}})
 fireEvent.click(document.querySelector('.exploration-choice')!)
 fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}))
 await advance(1400)
 const room=document.querySelector('.is-scales')! as HTMLElement
 expect(within(room).getAllByRole('button').map(button=>button.textContent)).toEqual(['판매한다','아래층으로 내려간다'])
 fireEvent.click(screen.getByRole('button',{name:'판매한다'}))
 const dialog=screen.getByRole('dialog')
 expect(within(dialog).queryByText('무딘 단검')).toBeNull()
 for(const tab of ['무기','방어구','마법']){
  fireEvent.click(within(dialog).getByRole('tab',{name:new RegExp(tab)}))
  if(tab==='방어구'){
   expect(within(dialog).getByText('판매할 방어구가 없습니다.')).toBeTruthy()
   continue
  }
  if(tab==='마법')expect(within(dialog).queryByText('마력탄')).toBeNull()
  const row=dialog.querySelector('.sale-items article')! as HTMLElement
  const name=within(row).getByRole('heading').textContent!
  const price=Number(row.querySelector('.sale-item-action>span')!.textContent!.replaceAll(',',''))
  const before=Number(screen.getByLabelText('탐험용 골드').textContent!.replaceAll(',',''))
  fireEvent.click(within(row).getByRole('button',{name:`${name} 판매`}))
  await advance(0)
  expect(within(dialog).queryByRole('heading',{name})).toBeNull()
  expect(Number(screen.getByLabelText('탐험용 골드').textContent!.replaceAll(',',''))).toBe(before+price)
 }
})
it('buys both potions through the actual magic shop and updates the confirmed gold and bag',async()=>{
 vi.useFakeTimers()
 render(<TestExplorationGame nickname="테스터" onLeave={()=>{}}/>)
 const advance=async(ms:number)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms)})
 await advance(1400)
 fireEvent.click(screen.getByRole('button',{name:'마나 선택 · 최대 마나 +3'}))
 await advance(300)
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:shopkeepers.find(shop=>shop.kind==='magic')!.roomId}})
 fireEvent.click(document.querySelector('.exploration-choice')!)
 fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}))
 await advance(1400)
 const before=Number(screen.getByLabelText('탐험용 골드').textContent!.replaceAll(',',''))
 for(const potion of merchantPotions){
  fireEvent.click(screen.getByRole('button',{name:'마법을 살펴본다'}))
  fireEvent.click(screen.getByRole('button',{name:`${potion.name} 구매`}))
  await advance(300)
  expect(screen.getByRole('status',{name:'구매 알림'}).textContent).toContain(potion.name)
 }
 expect(Number(screen.getByLabelText('탐험용 골드').textContent!.replaceAll(',',''))).toBe(before-merchantPotions.reduce((total,potion)=>total+potion.price,0))
 fireEvent.click(screen.getByRole('button',{name:'마법을 살펴본다'}))
 expect(screen.getByText('체력 30 회복 · 보유 11개')).toBeTruthy()
 expect(screen.getByText('마나 15 회복 · 보유 11개')).toBeTruthy()
})
it('shows the confirmed chest gold at the center once and dismisses the effect',async()=>{
 vi.useFakeTimers()
 const random=vi.spyOn(Math,'random').mockReturnValue(.2)
 try{
  render(<TestExplorationGame nickname="테스터" onLeave={()=>{}}/>)
  const advance=async(ms:number)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms)})
  await advance(1400)
  fireEvent.click(screen.getByRole('button',{name:'마나 선택 · 최대 마나 +3'}))
  await advance(300)
  fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:'chest'}})
  fireEvent.click(document.querySelector('.exploration-choice')!)
  fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}))
  await advance(1400)
  expect(screen.queryByRole('status',{name:'골드 획득'})).toBeNull()
  const before=Number(screen.getByLabelText('탐험용 골드').textContent!.replaceAll(',',''))
  fireEvent.click(screen.getByRole('button',{name:'상자를 살펴본다'}))
  await advance(0)
  const after=Number(screen.getByLabelText('탐험용 골드').textContent!.replaceAll(',',''))
  expect(after).toBeGreaterThan(before)
  expect(screen.getByRole('status',{name:'골드 획득'}).textContent).toContain(`+${(after-before).toLocaleString()} 골드`)
  await advance(2100)
  expect(screen.queryByRole('status',{name:'골드 획득'})).toBeNull()
 }finally{random.mockRestore()}
})
it('shows the mana bolt projectile and impact during the actual local combat sequence',async()=>{
 vi.useFakeTimers();render(<TestExplorationGame nickname="테스터" onLeave={()=>{}}/>)
 const advance=async(ms:number)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms)})
 await advance(1400)
 fireEvent.click(screen.getByRole('button',{name:'마나 선택 · 최대 마나 +3'}))
 await advance(300)
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:'monster:bandage-mummy'}})
 fireEvent.click(document.querySelector('.exploration-choice')!)
 fireEvent.click(screen.getByRole('button',{name:'선택한 문으로 입장'}))
 await advance(6000)
 await advance(1400)
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'마력탄 · MP 5 시전'}))
 await advance(0)
 const effect=document.querySelector('.spell-cast-effect[data-spell="mana-bolt"]')!
 expect(effect).toBeTruthy();expect(effect.getAttribute('data-target')).toBe('enemy')
 expect(effect.querySelectorAll('.spell-missile')).toHaveLength(1)
 expect(effect.querySelector('.spell-impact')).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'붕대 미라 체력'})).toHaveProperty('value',46)
 await advance(combatTimings.player)
 expect(screen.getByRole('progressbar',{name:'붕대 미라 체력'})).toHaveProperty('value',34)
 expect(screen.getByRole('progressbar',{name:'탐험가 마나'})).toHaveProperty('value',38)
 await advance(combatTimings.counter-combatTimings.player)
 expect(document.querySelector('.spell-cast-effect')).toBeNull()
 expect(mocks.command).not.toHaveBeenCalled()
})
it('restricts the one-floor stat preview to operators',()=>{
 mocks.operator=false;render(<ExplorationStatTestPage/>);expect(screen.getByRole('alert')).toBeTruthy();expect(screen.queryByRole('button',{name:'스탯 업글 창 뜨기'})).toBeNull()
})
it('reuses the real modal and updates strength, magic, resources and evasion on floor one',async()=>{
 render(<ExplorationStatTestPage/>)
 capture('page')
 for(const [name,effect] of [['근력','기본 공격력 +1'],['마력','공격 마법 피해 +1'],['체력','최대 체력 +5'],['마나','최대 마나 +3'],['회피','물리 회피율 +4%p']]){
  if(!screen.queryByRole('dialog'))fireEvent.click(screen.getByRole('button',{name:'스탯 업글 창 뜨기'}))
  expect(screen.getByRole('dialog')).toBeTruthy()
  if(name==='근력')capture('modal')
  fireEvent.click(screen.getByRole('button',{name:`${name} 선택 · ${effect}`}))
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 }
 expect(screen.getByRole('button',{name:'공격력 10+1 설명'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'마공 1 설명'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'회피율 9% 설명'})).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'테스트 체력'})).toHaveProperty('max',105)
 expect(screen.getByRole('progressbar',{name:'테스트 마나'})).toHaveProperty('max',43)
 capture('upgraded')
 expect(screen.getByText(/지하 1층/)).toBeTruthy();expect(mocks.command).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled()
})
it('runs the local real-play button without starting or reading a production run',async()=>{
 vi.useFakeTimers();render(<ExplorationPage/>)
 const start=screen.getByRole('button',{name:'실전 (무료)'})
 expect(start).toHaveProperty('disabled',false);fireEvent.click(start)
 await act(async()=>{await vi.advanceTimersByTimeAsync(1400)})
 expect(screen.getByRole('region',{name:'파라오 지하 탐험'})).toBeTruthy()
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100')
 expect(screen.queryByRole('combobox')).toBeNull()
 expect(screen.getByRole('dialog',{name:'어떤 힘을 키울까요?'})).toBeTruthy()
 expect(mocks.command).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled()
 capture('play')
})
