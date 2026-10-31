import * as roomLoot from '@/features/exploration/room-loot'
﻿import {writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {StrictMode} from 'react'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import {adventureRooms,type AdventureRoomId} from '@/features/exploration/adventure-rooms'
import {gearSalePrice} from '@/features/exploration/room-loot'
import * as practice from '@/features/exploration/practice-state'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <img src="/branding/pongi.png" style={{width:28,height:28}}/>}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
const clockSound=vi.hoisted(()=>({start:vi.fn(),stop:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){},startQuizClock:clockSound.start,stopQuizClock:clockSound.stop})}))
afterEach(()=>{cleanup();clockSound.start.mockClear();clockSound.stop.mockClear();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
async function advance(ms:number){await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
async function show(id:AdventureRoomId,random=0,strong=false){
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(random);vi.useFakeTimers()
 const fresh=practice.grantPracticeSupplies(practice.newPractice(()=>0));const initial={...fresh,hp:60,mp:20,potions:{health:2,mana:1},...(strong?{weapons:fresh.weapons.map((item,index)=>index===0?{...item,attack:500}:item)}:{})}
 vi.spyOn(practice,'newPractice').mockImplementation(()=>initial)
 render(<StrictMode><ExplorationGame nickname="탐험퐁이" onLeave={()=>{}}/></StrictMode>);await advance(100)
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:id}});fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(document.querySelector('.exploration-preview-enter')!);await advance(100)
 return initial
}
const hp=()=>Number(screen.getByRole('progressbar',{name:'탐험가 체력'}).getAttribute('value'))
const mp=()=>Number(screen.getByRole('progressbar',{name:'탐험가 마나'}).getAttribute('value'))
it.each(adventureRooms.filter(room=>room.kind==='story'))('opens the story scene $title through the test selector',async room=>{
 await show(room.id)
 expect(screen.getByRole('heading',{name:room.title})).toBeTruthy()
 capture(room.id)
 expect(document.querySelector('.exploration-room-decisions')?.querySelectorAll('button')).toHaveLength(room.id==='nameless-guardian'?1:2)
})
it.each(adventureRooms.filter(room=>room.kind==='choice'))('opens the optional choice scene $title through the test selector',async room=>{
 await show(room.id)
 expect(screen.getByRole('heading',{name:room.title})).toBeTruthy()
 capture(room.id)
 expect(document.querySelector('.exploration-room-decisions')?.querySelectorAll('button')).toHaveLength(2)
})
it.each(adventureRooms.filter(room=>room.kind==='rest'))('fully restores resources in $title and can descend',async room=>{
 await show(room.id);expect(document.querySelector('.exploration-door-controls')).toBeNull();capture(room.id)
 fireEvent.click(screen.getByRole('button',{name:'쉬었다 간다 · 체력·마나 전부 회복'}));expect(hp()).toBe(100);expect(mp()).toBe(40)
 expect(screen.queryByRole('button',{name:'쉬었다 간다 · 체력·마나 전부 회복'})).toBeNull();capture(room.id+'-rested')
 fireEvent.click(screen.getByRole('button',{name:'아래층으로 내려간다.'}));await advance(100)
 expect(screen.getByRole('group',{name:'지하 2층의 세 문'})).toBeTruthy()
})
it('can pass a rest room without recovering',async()=>{
 await show('rest-oasis');fireEvent.click(screen.getByRole('button',{name:'그냥 지나간다'}));await advance(100);expect(hp()).toBe(60);expect(mp()).toBe(20)
})
it('applies curse and theft once despite StrictMode and rerenders',async()=>{
 await show('curse');expect(hp()).toBe(36);expect(mp()).toBe(12);capture('curse')
 expect(document.querySelector('.exploration-curse-effect')).toBeTruthy();expect(document.querySelector('.exploration-room-loss')).toBeNull();expect(document.querySelector('.exploration-room-hint')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'탐험 소리 설정'}));fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});await advance(1)
 expect(hp()).toBe(36);expect(mp()).toBe(12)
 await advance(1500);expect(document.querySelector('.exploration-curse-effect')).toBeNull();expect(hp()).toBe(36);expect(mp()).toBe(12)
 cleanup();vi.restoreAllMocks();await show('thief',.99)
 const stolen=screen.getByRole('status',{name:'포션 도난'})
 expect(within(stolen).getByText('체력 포션')).toBeTruthy();expect(within(stolen).getByText('마나 포션')).toBeTruthy();expect(within(stolen).getAllByText('−1')).toHaveLength(2)
 if(process.env.THEFT_EFFECT_QA)writeFileSync('artifacts/thief-potion.fragment.html',stolen.outerHTML)
 expect(screen.getByRole('img',{name:'정면을 바라보는 모래두건 도둑'}).getAttribute('src')).toBe('/exploration/rooms/desert-thief.png')
 expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(1)')?.textContent).toBe('×1');expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(2)')?.textContent).toBe('×0');capture('thief')
 await advance(1700);expect(screen.queryByRole('status',{name:'포션 도난'})).toBeNull()
 expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(1)')?.textContent).toBe('×1')
})
it('opens a chest once for gold or starts an ordinary monster encounter',async()=>{
 await show('chest');capture('chest');const before=screen.getByLabelText('탐험용 골드').textContent
 fireEvent.click(screen.getByRole('button',{name:'열어본다'}));expect(screen.getByLabelText('탐험용 골드').textContent).not.toBe(before);expect(screen.queryByRole('button',{name:'열어본다'})).toBeNull();expect(screen.getByRole('status',{name:'골드 획득'}).textContent).toMatch(/골드 \+\d+/);capture('chest-gold')
 const after=screen.getByLabelText('탐험용 골드').textContent;await advance(1700);expect(screen.queryByRole('status',{name:'골드 획득'})).toBeNull();expect(screen.getByLabelText('탐험용 골드').textContent).toBe(after)
 cleanup();vi.restoreAllMocks();await show('chest',.99);fireEvent.click(screen.getByRole('button',{name:'열어본다'}));expect(screen.getByRole('region',{name:'몬스터 방 등장'})).toBeTruthy()
 await advance(100);await advance(100);expect(screen.getByRole('region',{name:'왕릉의 갈고리병 전투'})).toBeTruthy()
})
it.each(['investigate-guards','investigate-wall','investigate-alchemy'] as const)('finds an item in %s and handles a full bag',async id=>{
 await show(id);capture(id);fireEvent.click(screen.getByRole('button',{name:'조사한다'}))
 const dialog=screen.getByRole('dialog',{name:'아이템 발견'});expect(dialog.textContent).toContain('가득');capture(id+'-loot')
 expect(within(dialog).getAllByRole('button')).toHaveLength(2);fireEvent.click(within(dialog).getAllByRole('radio')[0]);fireEvent.click(within(dialog).getByRole('button',{name:'보관함에 넣기'}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'아래층으로 내려간다.'})).toHaveProperty('disabled',false)
})
it('can ignore an investigation without gaining an item',async()=>{
 await show('investigate-wall');fireEvent.click(screen.getByRole('button',{name:'무시하고 지하로 내려간다'}));await advance(100)
 expect(screen.queryByRole('dialog')).toBeNull();expect(hp()).toBe(60)
})
it.each(['correct','wrong','timeout'] as const)('settles the sphinx %s result once',async mode=>{
 // The rules are useful before answering, and disappear once the outcome is settled.
 await show('sphinx');expect(document.querySelector('.exploration-room-decisions')?.children).toHaveLength(2);expect(clockSound.start).not.toHaveBeenCalled();capture('sphinx');fireEvent.click(screen.getByRole('button',{name:'문제를 듣는다 · 제한 시간 10초'}));expect(screen.getByLabelText('방 진행').textContent).toContain('아침에는 네 발');capture('sphinx-question');expect(clockSound.start).toHaveBeenCalledOnce();expect(clockSound.stop).not.toHaveBeenCalled()
 if(mode==='timeout'){await advance(9800);expect(hp()).toBe(60);await advance(200)}else fireEvent.click(screen.getByRole('button',{name:mode==='correct'?'사람':'낙타',exact:true}))
 expect(clockSound.stop).toHaveBeenCalled();expect(hp()).toBe(mode==='correct'?60:30);expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000');if(mode==='correct')expect(screen.getByLabelText('방 진행').textContent).toContain('길을 열어 주겠다.')
 expect(screen.queryByLabelText('방 효과')).toBeNull()
 await advance(10000);expect(hp()).toBe(mode==='correct'?60:30);expect(screen.getByRole('button',{name:'아래층으로 내려간다.'})).toBeTruthy();capture('sphinx-'+mode)
})
it('can surrender half its health to the sphinx without starting or duplicating the quiz',async()=>{
 await show('sphinx')
 expect(screen.getByLabelText('방 효과')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'영혼의 절반을 내어준다 · 체력 50% 감소'}))
 expect(hp()).toBe(30);expect(clockSound.start).not.toHaveBeenCalled();expect(screen.queryByRole('timer')).toBeNull()
 expect(screen.queryByLabelText('방 효과')).toBeNull()
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000')
 await advance(11000);expect(hp()).toBe(30)
 fireEvent.click(screen.getByRole('button',{name:'아래층으로 내려간다.'}));await advance(100)
 expect(screen.getByRole('group',{name:'지하 2층의 세 문'})).toBeTruthy()
})
it('sells spare equipment while protecting equipped items and the final item',async()=>{
 const initial=await show('scales');capture('scales');fireEvent.click(screen.getByRole('button',{name:'장비를 판다'}));capture('scales-sale')
 const article=screen.getByRole('heading',{name:'청동 단검'}).closest('article')!
 fireEvent.click(within(article).getByRole('button',{name:'판매'}));expect(screen.getByLabelText('탐험용 골드').textContent).toBe((initial.gold+gearSalePrice(initial.weapons[1])).toLocaleString())
 expect(screen.queryByRole('heading',{name:'청동 단검'})).toBeNull()
 expect(within(screen.getByRole('heading',{name:'무딘 단검'}).closest('article')!).getByRole('button',{name:'판매'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'거래를 마친다'}));expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByRole('button',{name:'장비를 판다'})).toBeTruthy();expect(screen.getByRole('button',{name:'그냥 지나간다'})).toBeTruthy()
})
it('lets the giant sleep or starts a guaranteed ambush and item-drop fight',async()=>{
 await show('sleeping-giant');capture('sleeping-giant');expect(screen.getByRole('img',{name:'잠든 고대거인'}).getAttribute('src')).toContain('ancient-giant-sleeping.png');fireEvent.click(screen.getByRole('button',{name:'거인을 깨운다'}));expect(screen.getByRole('status',{name:''}).textContent).toContain('눈을 뜹니다');await advance(1100);await advance(100);await advance(100)
 expect(screen.getByRole('region',{name:'고대거인 전투'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(1100);await advance(3200)
 expect(hp()).toBe(60);expect(screen.getByLabelText('탐험 로그').textContent).toContain('기습!')
})
it('runs a no-escape Anubis boss encounter and requires the guaranteed loot to be resolved',async()=>{
 await show('boss-anubis',0,true);await advance(100);await advance(100)
 expect(screen.getByText('중간보스')).toBeTruthy();expect(screen.queryByRole('button',{name:/^도망/})).toBeNull();capture('boss-anubis')
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(4300);await advance(2800)
 const loot=screen.getByRole('dialog',{name:'아이템 발견'});capture('boss-loot')
 fireEvent.click(within(loot).getAllByRole('radio')[0]);fireEvent.click(within(loot).getByRole('button',{name:'보관함에 넣기'}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'오아시스로 향한다'})).toHaveProperty('disabled',false);fireEvent.click(screen.getByRole('button',{name:'오아시스로 향한다'}));expect(screen.getByRole('button',{name:'쉬었다 간다 · 체력·마나 전부 회복'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'쉬었다 간다 · 체력·마나 전부 회복'}));expect(hp()).toBe(100)
})
it('fights the hostile story warden in his room and requires the advanced relic before descending',async()=>{
 await show('nameless-guardian',.99,true)
 const scene=document.querySelector('.exploration-scene')!,background=scene.style.backgroundImage
 expect(screen.queryByRole('button',{name:'문지기를 두고 지나간다'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'수문장과 싸운다'}));await advance(100);await advance(100)
 expect(scene.style.backgroundImage).toBe(background)
 expect(screen.getByRole('region',{name:'이름 없는 왕실 수문장 전투'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:/^도망/})).toBeNull()
 expect(screen.getByRole('button',{name:'마법 · 망각의 칙령 설명'})).toBeTruthy()
 capture('hostile-royal-warden')
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(4300);await advance(2800)
 const loot=screen.getByRole('dialog',{name:'아이템 발견'})
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000')
 expect(document.querySelector('.combat-victory-gold')).toBeNull()
 capture('hostile-royal-warden-loot')
 fireEvent.click(within(loot).getAllByRole('radio')[0])
 fireEvent.click(within(loot).getByRole('button',{name:'보관함에 넣기'}))
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'오아시스로 향한다'}));await advance(100)
 expect(screen.getByRole('button',{name:'쉬었다 간다 · 체력·마나 전부 회복'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'그냥 지나간다'}));await advance(100);expect(screen.getByRole('group',{name:'지하 2층의 세 문'})).toBeTruthy()
})
it('awakens the sealed scarab once before starting its item-drop encounter',async()=>{
 await show('sealed-scarab')
 capture('sealed-scarab')
 expect(screen.getByRole('img',{name:'봉인된 보물갑충'}).getAttribute('src')).toContain('treasure-scarab.png')
 fireEvent.click(screen.getByRole('button',{name:'봉인을 건드린다'}))
 expect(screen.queryByRole('button',{name:'봉인을 건드린다'})).toBeNull()
 expect(screen.queryByRole('region',{name:'보물갑충 전투'})).toBeNull()
 await advance(1100);await advance(100);await advance(100)
 expect(screen.getByRole('region',{name:'보물갑충 전투'})).toBeTruthy()
})
function capture(id:string){
 if(!process.env.ADVENTURE_LAYOUT_QA)return
 const root=process.cwd().replaceAll('\\','/')
 const css=readFileSync('dist/assets/'+readdirSync('dist/assets').find(x=>/^index-.*\.css$/.test(x)),'utf8')+readFileSync('src/features/exploration/exploration.css','utf8')+readFileSync('src/features/exploration/exploration-hud.css','utf8')
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/(?:http:\/\/localhost:\d+)?\/src\/features\/exploration\/assets\//g,`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`)
 writeFileSync(`artifacts/adventure-${id}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
}
it.each(['investigate-guards','investigate-wall','investigate-alchemy'] as const)('retains the %s background through monster reveal and combat, then clears it on descent',async id=>{
 await show(id,.99)
 const scene=document.querySelector('.exploration-scene') as HTMLElement,original=scene.style.backgroundImage
 expect(original).toContain(`/exploration/rooms/${id}.webp`)
 fireEvent.click(screen.getByRole('button',{name:'조사한다'}))
 expect(screen.getByRole('region',{name:'몬스터 방 등장'})).toBeTruthy();expect(scene.style.backgroundImage).toBe(original)
 await advance(100);expect(scene.style.backgroundImage).toBe(original)
 await advance(100);expect(screen.getByRole('region',{name:'왕릉의 갈고리병 전투'})).toBeTruthy();expect(scene.style.backgroundImage).toBe(original)
 capture(id+'-combat')
 vi.spyOn(Math,'random').mockReturnValue(0)
 fireEvent.click(screen.getByRole('button',{name:'도망 35%'}));await advance(1100);await advance(2000);await advance(100)
 expect(screen.getByRole('group',{name:'지하 2층의 세 문'})).toBeTruthy()
 expect(scene.style.backgroundImage).not.toContain(`/exploration/rooms/${id}.webp`)
})

it.each(['investigate-guards','investigate-wall','investigate-alchemy'] as const)('awards loot after defeating the investigation monster in %s',async id=>{
 await show(id,.99,true)
 const scene=document.querySelector('.exploration-scene')!
 expect(scene.classList.contains('is-close-scene')).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'조사한다'}));await advance(100);await advance(100)
 expect(scene.getAttribute('data-scene')).toBe(id)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}));await advance(4300)
 expect(screen.getByLabelText('탐험 로그').textContent).toContain('왕릉의 갈고리병을 처치했습니다.')
 await advance(2800)
 const loot=screen.getByRole('dialog',{name:'아이템 발견'})
 expect(loot.textContent).toContain('마나 포션')
 expect(within(loot).queryByRole('combobox')).toBeNull()
 fireEvent.click(within(loot).getByRole('button',{name:'보관함에 넣기'}))
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByRole('button',{name:'아래층으로 내려간다.'})).toHaveProperty('disabled',false)
})

it.each([['health',.6],['mana',.8]] as const)('discovers and stores exactly one %s potion without a gear replacement',async(kind,roll)=>{
 const reward=roomLoot.drawInvestigationLoot(practice.newPractice(()=>0),'starter',()=>roll)
 vi.spyOn(roomLoot,'drawInvestigationLoot').mockReturnValue(reward)
 await show('investigate-wall')
 fireEvent.click(screen.getByRole('button',{name:'조사한다'}))
 expect(screen.getByLabelText('방 진행').textContent).toContain(roomLoot.lootDiscoveryText(reward,()=>0))
 const dialog=screen.getByRole('dialog',{name:'아이템 발견'})
 expect(within(dialog).queryByRole('combobox')).toBeNull()
 fireEvent.click(within(dialog).getByRole('button',{name:'보관함에 넣기'}))
 expect(document.querySelector(`.exploration-potion-loadout>div>span:nth-child(${kind==='health'?1:2})`)?.textContent).toBe(kind==='health'?'×3':'×2')
 fireEvent.click(screen.getByRole('button',{name:'탐험 기록'}));expect(screen.getByRole('dialog').textContent).toContain('1개를 포션 주머니에 넣었다.')
})

it('reads a warning inscription with no rewards, damage or encounter and then descends',async()=>{
 const initial=await show('warning-wall');capture('warning-wall')
 expect(screen.getByRole('button',{name:'읽어본다'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'그냥 지나간다'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'읽어본다'}));capture('warning-wall-read')
 expect(screen.getByLabelText('방 진행').textContent).toContain('스핑크스 앞에서는 성급히 입을 열지 말라.')
 const firstInscription=screen.getByLabelText('방 진행').textContent
 expect(screen.queryByRole('button',{name:'읽어본다'})).toBeNull()
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('region',{name:'몬스터 방 등장'})).toBeNull()
 expect(hp()).toBe(initial.hp);expect(mp()).toBe(initial.mp)
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe(initial.gold.toLocaleString())
 expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(1)')?.textContent).toBe('×2')
 expect(document.querySelector('.exploration-potion-loadout>div>span:nth-child(2)')?.textContent).toBe('×1')
 expect(clockSound.start).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'아래층으로 내려간다.'}));await advance(100)
 expect(screen.getByRole('group',{name:'지하 2층의 세 문'})).toBeTruthy()
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:'warning-wall'}})
 fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(document.querySelector('.exploration-preview-enter')!);await advance(100)
 fireEvent.click(screen.getByRole('button',{name:'읽어본다'}))
 expect(screen.getByLabelText('방 진행').textContent).not.toBe(firstInscription)
})
it('passes the warning wall without reading or changing resources',async()=>{
 await show('warning-wall')
 fireEvent.click(screen.getByRole('button',{name:'그냥 지나간다'}));await advance(100)
 expect(screen.getByRole('group',{name:'지하 2층의 세 문'})).toBeTruthy()
 expect(hp()).toBe(60);expect(mp()).toBe(20)
 expect(screen.getByLabelText('탐험용 골드').textContent).toBe('100,000')
})
