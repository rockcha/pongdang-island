import {StrictMode} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createMemoryRouter,RouterProvider} from 'react-router'
import {ExplorationPage} from '@/features/exploration/exploration-page'
import {equipGear,grantPracticeSupplies,newPractice,toggleSpell} from '@/features/exploration/practice-state'
const access=vi.hoisted(()=>({operator:true,loading:false}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>access}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'operator'}}}),getNickname:()=> '탐험퐁이'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{avatar_path:'avatar.png'}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:({nickname}:any)=><img alt={`${nickname}의 아바타`}/>}))
beforeEach(()=>{access.operator=true;access.loading=false;vi.stubGlobal('matchMedia',()=>({matches:false}))})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});delete document.documentElement.requestFullscreen;delete document.exitFullscreen})
function show(){const router=createMemoryRouter([{path:'/exploration',element:<ExplorationPage/>},{path:'/elsewhere',element:<p>다른 페이지</p>}],{initialEntries:['/exploration']});render(<StrictMode><RouterProvider router={router}/></StrictMode>);return router}
async function start(){show();fireEvent.click(screen.getByRole('button',{name:'지하 탐험 시작'}));await waitFor(()=>expect(screen.queryByLabelText('지하 1층으로 내려가는 중')).toBeNull(),{timeout:2500})}
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
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',100)
 expect(screen.getByText('공격력 12 · 치명타 5%')).toBeTruthy()
 expect(screen.getByText('피격 피해 1 감소 · 회피 40%')).toBeTruthy()
 const doors=within(screen.getByRole('group',{name:'지하 1층의 세 문'})).getAllByRole('button')
 expect(doors).toHaveLength(3);fireEvent.click(doors[1]);expect(doors[1].getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByText(/황금빛 풍뎅이가 새겨져/)).toBeTruthy()
 expect(screen.getByText('문 안쪽과 지하 2층은 준비 중이에요.')).toBeTruthy()
})
it('changes the main weapon and armor and equips up to three simultaneously usable spells',async()=>{
 await start();fireEvent.click(screen.getByRole('button',{name:'탐험 보관함'}))
 fireEvent.click(screen.getByRole('button',{name:'연습 물품 받기'}))
 const weapon=screen.getByRole('heading',{name:'청동 단검'}).closest('article')!
 fireEvent.click(within(weapon).getByRole('button',{name:'주 무기로 선택'}))
 fireEvent.click(screen.getByRole('tab',{name:/보호구/}))
 const armor=screen.getByRole('heading',{name:'황금 흉갑'}).closest('article')!
 fireEvent.click(within(armor).getByRole('button',{name:'주 보호구로 선택'}))
 fireEvent.click(screen.getByRole('tab',{name:/마법/}))
 for(let i=0;i<3;i++)fireEvent.click(screen.getAllByRole('button',{name:'마법 장착'})[0])
 fireEvent.click(screen.getByRole('button',{name:'마법 장착'}))
 expect(screen.getByRole('alert').textContent).toContain('최대 3개')
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(screen.getByText('청동 단검')).toBeTruthy();expect(screen.getByText('황금 흉갑')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'작은 불꽃 사용'}));expect(screen.getByText('손끝의 불꽃이 황금빛 벽화를 비춥니다.')).toBeTruthy()
 expect(screen.getByRole('button',{name:'물결의 보호 사용'})).toBeTruthy();expect(screen.getByRole('button',{name:'길잡이 빛 사용'})).toBeTruthy()
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
it('keeps equipment capacities and rejects unowned gear and a fourth spell',()=>{
 const initial=newPractice();expect(initial.weapons).toHaveLength(1);expect(initial.armor).toHaveLength(1)
 const state=grantPracticeSupplies(initial);expect(state.weapons).toHaveLength(3);expect(state.armor).toHaveLength(3)
 expect(grantPracticeSupplies(state)).toBe(state);expect(equipGear(state,'weapon','unknown')).toBe(state)
 let current=state;for(const id of ['ember','tide','light','sand'])current=toggleSpell(current,id)
 expect(current.equippedSpells).toEqual(['ember','tide','light'])
 current=toggleSpell(current,'tide');current=toggleSpell(current,'sand');expect(current.equippedSpells).toEqual(['ember','light','sand'])
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
