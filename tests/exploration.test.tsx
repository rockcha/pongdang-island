import {StrictMode} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createMemoryRouter,RouterProvider} from 'react-router'
import {ExplorationPage} from '@/features/exploration/exploration-page'
import {doorArrivalLines} from '@/features/exploration/exploration-game'
import {roomTypes} from '@/features/exploration/room-preview'
import {doorSkins,drawFloorArt} from '@/features/exploration/dungeon-art'
import {buyMerchantItem,castSpell,equipGear,grantPracticeSupplies,newPractice,toggleSpell} from '@/features/exploration/practice-state'
const access=vi.hoisted(()=>({operator:true,loading:false}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>access}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'operator'}}}),getNickname:()=> '탐험퐁이'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{avatar_path:'avatar.png'}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:({nickname}:any)=><img alt={`${nickname}의 아바타`}/>}))
beforeEach(()=>{access.operator=true;access.loading=false;vi.stubGlobal('matchMedia',()=>({matches:false}))})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});delete document.documentElement.requestFullscreen;delete document.exitFullscreen})
function show(){const router=createMemoryRouter([{path:'/exploration',element:<ExplorationPage/>},{path:'/elsewhere',element:<p>다른 페이지</p>}],{initialEntries:['/exploration']});render(<StrictMode><RouterProvider router={router}/></StrictMode>);return router}
async function start(){show();fireEvent.click(screen.getByRole('button',{name:'지하 탐험 시작'}));await waitFor(()=>expect(screen.queryByLabelText('지하 1층으로 내려가는 중')).toBeNull(),{timeout:5000})}
it('blocks regular users and unverified operator access',()=>{
 access.operator=false;show()
 expect(screen.getByRole('button',{name:'준비 중'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'준비 중'}));expect(screen.queryByRole('region',{name:'파라오 지하 탐험'})).toBeNull()
 cleanup();access.loading=true;show()
 expect(screen.getByRole('button',{name:'입장 권한 확인 중…'})).toHaveProperty('disabled',true)
})
it('starts with the specified gear, health, descent animation and three inspectable locked doors',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'지하 탐험 시작'}))
 expect(screen.getByLabelText('지하 1층으로 내려가는 중')).toBeTruthy()
 expect(screen.getByRole('region',{name:'지하의 경고'})).toBeTruthy()
 expect(screen.queryByRole('group',{name:'지하 1층의 세 문'})).toBeNull()
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',100)
 expect(screen.getByText('공격력 12 · 치명타 5%')).toBeTruthy()
 expect(screen.getByText('피격 피해 1 감소 · 회피 40%')).toBeTruthy()
 await waitFor(()=>expect(screen.queryByLabelText('지하 1층으로 내려가는 중')).toBeNull(),{timeout:5000})
 const doors=within(screen.getByRole('group',{name:'지하 1층의 세 문'})).getAllByRole('button')
 const dialogue=document.querySelector('.exploration-dialogue')!
 expect(doorArrivalLines.some(line=>dialogue.textContent?.includes(line))).toBe(true)
 expect(within(dialogue as HTMLElement).getByRole('img')).toBeTruthy()
 expect(dialogue.textContent).toContain('탐험퐁이:')
 expect(screen.queryByRole('region',{name:'지하의 경고'})).toBeNull()
 expect(doors).toHaveLength(3);fireEvent.click(doors[1]);expect(doors[1].getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByText(/황금빛 풍뎅이가 새겨져/)).toBeTruthy()
 expect(screen.getByText('모래 전갈 전투 · 상인 구매 테스트')).toBeTruthy()
})
it('changes the main weapon and armor and equips up to two simultaneously usable spells',async()=>{
 await start();fireEvent.click(screen.getByRole('button',{name:'탐험 보관함'}))
 fireEvent.click(screen.getByRole('button',{name:'연습 물품 받기'}))
 const weapon=screen.getByRole('heading',{name:'청동 단검'}).closest('article')!
 fireEvent.click(within(weapon).getByRole('button',{name:'주 무기로 선택'}))
 fireEvent.click(screen.getByRole('tab',{name:/보호구/}))
 const armor=screen.getByRole('heading',{name:'황금 흉갑'}).closest('article')!
 fireEvent.click(within(armor).getByRole('button',{name:'주 보호구로 선택'}))
 fireEvent.click(screen.getByRole('tab',{name:/마법/}))
 for(let i=0;i<2;i++)fireEvent.click(screen.getAllByRole('button',{name:'마법 장착'})[0])
 fireEvent.click(screen.getAllByRole('button',{name:'마법 장착'})[0])
 expect(screen.getByRole('alert').textContent).toContain('최대 2개')
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(screen.getByText('청동 단검')).toBeTruthy();expect(screen.getByText('황금 흉갑')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'작은 불꽃 사용'}));fireEvent.click(screen.getByRole('button',{name:'시전하기'}));expect(screen.getByText('손끝의 불꽃이 황금빛 벽화를 비춥니다.')).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'탐험가 마나'})).toHaveProperty('value',24)
 expect(screen.getByRole('button',{name:'물결의 보호 사용'})).toBeTruthy()
})
it('confirms exit, can continue and discards the run on re-entry',async()=>{
 await start();fireEvent.click(screen.getByRole('button',{name:'탐험 나가기'}))
 expect(screen.getByRole('alertdialog').textContent).toContain('저장하지 않고')
 fireEvent.click(screen.getByRole('button',{name:'계속 탐험'}));expect(screen.getByRole('region',{name:'파라오 지하 탐험'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'탐험 나가기'}));fireEvent.click(screen.getByRole('button',{name:'저장하지 않고 나가기'}))
 expect(screen.queryByRole('region',{name:'파라오 지하 탐험'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'지하 탐험 시작'}));expect(screen.getByText('공격력 12 · 치명타 5%')).toBeTruthy()
})
it('guards navigation to another route without losing the current run when cancelled',async()=>{
 const router=show();fireEvent.click(screen.getByRole('button',{name:'지하 탐험 시작'}))
 await act(async()=>{await router.navigate('/elsewhere')})
 expect(screen.getByRole('alertdialog').textContent).toContain('저장하지 않고')
 fireEvent.click(screen.getByRole('button',{name:'취소'}));expect(router.state.location.pathname).toBe('/exploration')
 await act(async()=>{await router.navigate('/elsewhere')})
 fireEvent.click(screen.getByRole('button',{name:'나가기',exact:true}))
 await screen.findByText('다른 페이지')
})
it('keeps equipment capacities and rejects unowned gear and a third spell',()=>{
 const initial=newPractice();expect(initial.weapons).toHaveLength(1);expect(initial.armor).toHaveLength(1)
 const state=grantPracticeSupplies(initial);expect(state.weapons).toHaveLength(3);expect(state.armor).toHaveLength(3)
 expect(grantPracticeSupplies(state)).toBe(state);expect(equipGear(state,'weapon','unknown')).toBe(state)
 let current=state;for(const id of ['ember','tide','light','sand'])current=toggleSpell(current,id)
 expect(current.equippedSpells).toEqual(['ember','tide'])
 current=toggleSpell(current,'tide');current=toggleSpell(current,'sand');expect(current.equippedSpells).toEqual(['ember','sand'])
})
it('releases native fullscreen if its request resolves after leaving the practice',async()=>{
 vi.stubGlobal('matchMedia',(query:string)=>({matches:query.includes('pointer: coarse')}))
 const lock=vi.fn().mockResolvedValue(undefined),unlock=vi.fn()
 vi.stubGlobal('screen',{orientation:{lock,unlock}})
 let finish!:()=>void
 document.documentElement.requestFullscreen=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve}))
 document.exitFullscreen=vi.fn(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null})})
 show();fireEvent.click(screen.getByRole('button',{name:'지하 탐험 시작'}))
 fireEvent.click(screen.getByRole('button',{name:'탐험 나가기'}));fireEvent.click(screen.getByRole('button',{name:'저장하지 않고 나가기'}))
 await act(async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:document.documentElement});finish()})
 expect(document.exitFullscreen).toHaveBeenCalledOnce();expect(lock).not.toHaveBeenCalled()
})

it('enters fullscreen without requesting a landscape orientation or showing a rotation gate',async()=>{
 vi.stubGlobal('matchMedia',(query:string)=>({matches:query.includes('pointer: coarse')}))
 const lock=vi.fn().mockResolvedValue(undefined)
 vi.stubGlobal('screen',{orientation:{lock}})
 document.documentElement.requestFullscreen=vi.fn().mockResolvedValue(undefined)
 show();fireEvent.click(screen.getByRole('button',{name:'지하 탐험 시작'}))
 await act(async()=>{})
 expect(document.documentElement.requestFullscreen).toHaveBeenCalledOnce()
 expect(lock).not.toHaveBeenCalled()
 expect(screen.queryByText('휴대폰을 가로로 돌려주세요.')).toBeNull()
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toBeTruthy()
})

it('hides the descent warning on arrival, opens equipment tabs directly and retains story history',async()=>{
 await start()
 expect(screen.queryByRole('region',{name:'지하의 경고'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'주보호구 교체'}))
 expect(screen.getByRole('tab',{name:/보호구/}).getAttribute('aria-selected')).toBe('true')
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 fireEvent.click(within(screen.getByRole('group',{name:'지하 1층의 세 문'})).getAllByRole('button')[0])
 expect(screen.queryByRole('region',{name:'지하의 경고'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'탐험 기록'}))
 expect(within(screen.getByRole('dialog')).getByText(/모래 위에는/)).toBeTruthy()
 const recorded=document.querySelector('.exploration-history .exploration-dialogue')!
 expect(doorArrivalLines.some(line=>recorded.textContent?.includes(line))).toBe(true)
})
it('spends mana only on equipped spells and prevents overdraw',()=>{
 let state=grantPracticeSupplies(newPractice())
 expect(castSpell(state,'ember')).toBe(state)
 state=toggleSpell(state,'ember')
 for(let i=0;i<5;i++)state=castSpell(state,'ember')
 expect(state.mp).toBe(0);expect(castSpell(state,'ember')).toBe(state)
 expect(castSpell(state,'unknown')).toBe(state)
})

it('previews all nine room types without changing health or leaving the floor',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}))
 await start()
 fireEvent.click(within(screen.getByRole('group',{name:'지하 1층의 세 문'})).getAllByRole('button')[0])
 for(const room of roomTypes){
  if(room.id==='merchant'||room.id==='monster')continue
  fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:room.id}})
  fireEvent.click(screen.getByRole('button',{name:room.name+' · 입장 미리보기'}))
  const modal=await screen.findByRole('dialog',{}, {timeout:1800})
  expect(within(modal).getByRole('heading',{name:room.title})).toBeTruthy()
  expect(within(modal).getByText(room.note)).toBeTruthy()
  const available=within(modal).getAllByRole('button').find(button=>room.actions.includes(button.textContent as never)&&!(button as HTMLButtonElement).disabled)!
  fireEvent.click(available)
  expect(within(modal).getByRole('status').textContent).toContain('실제 효과는 아직 연결하지 않았어요.')
  fireEvent.click(within(modal).getByRole('button',{name:'문 앞으로 돌아가기'}))
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',100)
 }
 expect(screen.getByRole('group',{name:'지하 1층의 세 문'})).toBeTruthy()
})

it('opens the merchant shop, buys gear with practice gold and descends with inventory intact',async()=>{
 await start()
 expect(screen.getByLabelText('탐험용 골드').textContent).toContain('1,000')
 fireEvent.click(within(screen.getByRole('group',{name:'지하 1층의 세 문'})).getAllByRole('button')[1])
 fireEvent.click(screen.getByRole('button',{name:'상인 방 · 입장',exact:true}))
 expect(screen.getByText('돌문이 천천히 열립니다...')).toBeTruthy()
 fireEvent.click(await screen.findByRole('button',{name:'구매한다'},{timeout:1800}))
 const item=screen.getByRole('heading',{name:'사막의 단검'}).closest('article')!
 fireEvent.click(within(item).getByRole('button',{name:'구매',exact:true}))
 expect(screen.getByText('보유 골드 650')).toBeTruthy()
 expect(within(item).getByRole('button',{name:'보유 중'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'상인에게 돌아가기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 fireEvent.click(screen.getByRole('button',{name:'구매하지 않고 지나간다'}))
 expect(screen.getByLabelText('지하 2층으로 내려가는 중')).toBeTruthy()
 await screen.findByRole('group',{name:'지하 2층의 세 문'},{timeout:5000})
 expect(screen.getByLabelText('탐험용 골드').textContent).toContain('650')
 fireEvent.click(screen.getByRole('button',{name:'탐험 보관함'}))
 expect(screen.getByRole('heading',{name:'사막의 단검'})).toBeTruthy()
})

it('prevents duplicate, unaffordable and over-capacity purchases',()=>{
 const initial=newPractice(),bought=buyMerchantItem(initial,'merchant-dagger')
 expect(bought.gold).toBe(650)
 expect(buyMerchantItem(bought,'merchant-dagger')).toBe(bought)
 const poor={...initial,gold:0};expect(buyMerchantItem(poor,'merchant-armor')).toBe(poor)
 const full=grantPracticeSupplies(initial);expect(buyMerchantItem(full,'merchant-dagger')).toBe(full)
 expect(grantPracticeSupplies(bought).weapons.some(item=>item.id==='merchant-dagger')).toBe(true)
})

it('draws three skins with replacement and covers ten skins and three backgrounds',()=>{
 expect(doorSkins).toHaveLength(10)
 expect(drawFloorArt(()=>0)).toEqual({doors:[0,0,0],background:0})
 expect(drawFloorArt(()=>.999)).toEqual({doors:[9,9,9],background:2})
 for(let i=0;i<10;i++)expect(drawFloorArt(()=>(i+.5)/10).doors).toEqual([i,i,i])
})

it('enters a selectable monster room, fights the scorpion and keeps rewards on descent',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}))
 await start()
 fireEvent.click(within(screen.getByRole('group',{name:'지하 1층의 세 문'})).getAllByRole('button')[0])
 fireEvent.click(screen.getByRole('button',{name:'몬스터 방 · 입장',exact:true}))
 await screen.findByRole('region',{name:'모래 전갈 전투'})
 expect(screen.getByRole('progressbar',{name:'모래 전갈 체력'})).toHaveProperty('value',48)
 expect(screen.getByRole('button',{name:'주보호구 교체'})).toHaveProperty('disabled',true)
 expect(screen.queryByRole('button',{name:'몬스터 방 · 입장',exact:true})).toBeNull()
 vi.spyOn(Math,'random').mockReturnValue(.9)
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 expect(screen.getByText(/장착한 마법이 없어요/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'닫기 · 턴 소모 없음'}))
 for(let i=0;i<4;i++){
  const attack=screen.getByRole('button',{name:'공격',exact:true})
  await waitFor(()=>expect(attack).toHaveProperty('disabled',false))
  fireEvent.click(attack)
  if(i===0){
   fireEvent.click(attack)
   expect(screen.getByRole('progressbar',{name:'모래 전갈 체력'})).toHaveProperty('value',36)
   expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',100)
   await waitFor(()=>expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',93))
   expect(document.querySelector('.combat-log-monster')?.textContent).toContain('7 피해')
   expect(document.querySelector('.combat-log-player')?.textContent).toContain('12 피해')
  }
 }
 expect(await screen.findByText('전투 승리')).toBeTruthy()
 expect(screen.getByLabelText('탐험용 골드').textContent).toContain('1,120')
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',79)
 const next=screen.getByRole('button',{name:'아래층으로 내려가기'})
 await waitFor(()=>expect(next).toHaveProperty('disabled',false))
 fireEvent.click(next)
 await screen.findByRole('group',{name:'지하 2층의 세 문'})
 expect(screen.getByLabelText('탐험용 골드').textContent).toContain('1,120')
})
