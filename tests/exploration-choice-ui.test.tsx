import {writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import * as practice from '@/features/exploration/practice-state'
const audio=vi.hoisted(()=>({startMusic:vi.fn(),unlock:vi.fn(),play:vi.fn(),dispose:vi.fn(),startDescent:vi.fn(),stopDescent:vi.fn()}))
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <img src="/branding/pongi.png" style={{width:28,height:28}}/>}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>audio}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();audio.play.mockClear()})
const advance=async(ms:number)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
async function show(){
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(.99);vi.useFakeTimers()
 const fresh=practice.grantPracticeSupplies(practice.newPractice(()=>0));vi.spyOn(practice,'newPractice').mockImplementation(()=>({...fresh,hp:60,mp:8,potions:{health:3,mana:2},equippedSpells:['ember','tide']}))
 render(<ExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/>);await advance(100)
}
async function battle(){
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:'monster:sand-scorpion'}});fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(document.querySelector('.exploration-preview-enter')!)
 for(let count=0;count<3;count++)await advance(100)
}
function close(){fireEvent.click(screen.getByRole('button',{name:'닫기',exact:true}))}
it('opens inventory from four loadout slots and a fifth potion slot without management captions',async()=>{
 await show();expect(screen.queryByText('무기·방어구 관리')).toBeNull();expect(screen.queryByText('마법 관리')).toBeNull()
 expect(document.querySelector('.exploration-equipped')?.children).toHaveLength(5);capture('dock')
 fireEvent.click(screen.getByRole('button',{name:'주무기 교체'}));expect(screen.getByRole('dialog',{name:'무기 인벤토리'})).toBeTruthy();capture('weapons');close()
 fireEvent.click(screen.getByRole('button',{name:'주보호구 교체'}));expect(screen.getByRole('dialog',{name:'방어구 인벤토리'})).toBeTruthy();capture('armor');close()
 fireEvent.click(screen.getByRole('button',{name:'작은 불꽃 교체 · 마법 1'}));expect(screen.getByRole('dialog',{name:'마법 인벤토리'})).toBeTruthy();capture('magic-inventory');close()
 fireEvent.click(screen.getByRole('button',{name:'포션 보관함'}));expect(screen.getByRole('dialog',{name:'포션 선택'})).toBeTruthy();capture('potions')
 fireEvent.click(screen.getByRole('button',{name:'마나 포션 마시기'}));expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByRole('progressbar',{name:'탐험가 마나'})).toHaveProperty('value',23)
})
it('opens real combat choice modals without spending a turn, then drinks once before an enemy counter',async()=>{
 await show();await battle();capture('battle')
 expect([...document.querySelector('.exploration-combat-actions')!.children].map(el=>el.getAttribute('aria-label')??el.textContent)).toEqual(['공격','마법','포션 마시기','도망 35%'])
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}));expect(screen.getByRole('dialog',{name:'마법 선택'})).toBeTruthy();capture('battle-magic')
 fireEvent.click(screen.getByRole('button',{name:'닫기 · 턴 소모 없음'}));expect(screen.getByRole('button',{name:'공격',exact:true})).toHaveProperty('disabled',false)
 fireEvent.click(screen.getByRole('button',{name:'포션 마시기'}));expect(screen.getByRole('dialog').textContent).toContain('한 턴');capture('battle-potions')
 fireEvent.click(screen.getByRole('button',{name:'취소 · 턴 소모 없음'}));expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',60)
 fireEvent.click(screen.getByRole('button',{name:'포션 마시기'}));fireEvent.click(screen.getByRole('button',{name:'체력 포션 마시기'}))
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'포션 마시기'})).toHaveProperty('disabled',true)
 await advance(1100)
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',90)
 expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(1)')?.textContent).toBe('×2');expect(audio.play).toHaveBeenCalledWith('health-potion')
 await advance(3200)
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'}).getAttribute('value')).not.toBe('90')
})
function capture(id:string){
 if(!process.env.EXPLORATION_CHOICES_QA)return
 const root=process.cwd().replaceAll('\\','/')
 const css=readFileSync('dist/assets/'+readdirSync('dist/assets').find(x=>/^index-.*\.css$/.test(x)),'utf8')+readFileSync('src/features/exploration/exploration.css','utf8')+readFileSync('src/features/exploration/exploration-hud.css','utf8')
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/(?:http:\/\/localhost:\d+)?\/src\/features\/exploration\/assets\//g,`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`)
 writeFileSync(`artifacts/exploration-choice-${id}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
}
it('allows loadout changes only while choosing an action and disables the lower potion slot throughout combat',async()=>{
 await show();await battle()
 expect(screen.queryByText('장비 교체는 전투 밖에서 · 행동 후 적이 살아 있으면 반격')).toBeNull()
 expect(screen.getByRole('button',{name:'포션 보관함'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'주무기 교체'}))
 const inventory=screen.getByRole('dialog',{name:'무기 인벤토리'})
 expect(within(inventory).getByRole('tab',{name:/포션/})).toHaveProperty('disabled',true)
 expect(within(inventory).getByRole('button',{name:'연습 물품 지급 완료'})).toHaveProperty('disabled',true)
 const weapon=within(inventory).getByRole('heading',{name:'청동 단검'}).closest('article')!
 fireEvent.click(within(weapon).getByRole('button',{name:'주 무기로 선택'}));close()
 expect(screen.getByRole('button',{name:'공격력 15 설명'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'작은 불꽃 교체 · 마법 1'}))
 const ember=screen.getByRole('heading',{name:'작은 불꽃'}).closest('article')!,light=screen.getByRole('heading',{name:'길잡이 빛'}).closest('article')!
 fireEvent.click(within(ember).getByRole('button',{name:'마법 해제'}));fireEvent.click(within(light).getByRole('button',{name:'마법 장착'}));close()
 expect(screen.getByRole('button',{name:'길잡이 빛 교체 · 마법 2'})).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'모래 전갈 체력'})).toHaveProperty('value',38)
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',60)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 expect(screen.getByRole('button',{name:'주무기 교체'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('button',{name:'길잡이 빛 교체 · 마법 2'})).toHaveProperty('disabled',true)
 await advance(1100)
 expect(screen.getByRole('button',{name:'주보호구 교체'})).toHaveProperty('disabled',true)
 await advance(5100)
 expect(screen.getByRole('button',{name:'주무기 교체'})).toHaveProperty('disabled',false)
 expect(screen.getByRole('button',{name:'길잡이 빛 교체 · 마법 2'})).toHaveProperty('disabled',false)
 expect(screen.getByRole('button',{name:'포션 보관함'})).toHaveProperty('disabled',true)
})
