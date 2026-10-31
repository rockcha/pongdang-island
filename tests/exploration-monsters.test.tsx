// Pin attack variation to its midpoint for these status, armor and presentation fixtures.
// Real random damage is covered in exploration-attack-roll.test.ts.
vi.mock('@/features/exploration/attack-roll',async importOriginal=>({...await importOriginal<typeof import('@/features/exploration/attack-roll')>(),rollBasicAttack:(attack:number)=>Math.max(1,attack)}))
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {explorationMonsters,regularMonsters,drawMonster,getMonster} from '@/features/exploration/monster-catalog'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {newPractice,practiceSpells,type PracticeState} from '@/features/exploration/practice-state'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import {ScorpionRoom} from '@/features/exploration/scorpion-room'
import * as practice from '@/features/exploration/practice-state'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()})
const rolls=(...values:number[])=>()=>values.shift()??.99
function fight(id:Parameters<typeof getMonster>[0]){return startMonsterCombat(newPractice(()=>0),getMonster(id).id)}
const attack=(state:PracticeState,...values:number[])=>resolveCombatTurn(state,{type:'attack'},rolls(...values))
function captureLayout(id:string){
 if(!process.env.MONSTER_LAYOUT_QA)return
 const root=process.cwd().replaceAll('\\','/')
 const css=readFileSync('dist/assets/'+readdirSync('dist/assets').find(name=>/^index-.*\.css$/.test(name)),'utf8')+readFileSync('src/features/exploration/exploration.css','utf8')+readFileSync('src/features/exploration/exploration-hud.css','utf8')
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/(?:http:\/\/localhost:\d+)?\/src\/features\/exploration\/assets\//g,`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`)
 writeFileSync(`artifacts/monster-${id}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
}
it('keeps monster stats above the enemy and player ailments beside the player vitals',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 const fresh=startMonsterCombat({...newPractice(()=>0),hp:79,mp:20},'sand-wraith')
 fresh.combat!.playerBlind=30;fresh.playerEffects=[{kind:'burn',amount:40,turns:2}]
 vi.spyOn(practice,'newPractice').mockImplementation(()=>fresh)
 render(<ExplorationGame nickname="탐험가" onLeave={()=>{}}/>)
 await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 const monsterStats=screen.getByLabelText('몬스터 능력치')
 expect(monsterStats).toBeTruthy()
 const panel=screen.getByRole('region',{name:'탐험가 상태'})
 expect(within(panel).getByRole('list',{name:'탐험가 상태이상'})).toBeTruthy()
 expect(document.querySelector('.exploration-enemy-status')?.querySelector('.exploration-player-ailments')).toBeNull()
 captureLayout('status-hud')
 fireEvent.click(within(panel).getByRole('button',{name:/실명 · 다음 기본 공격/}))
 expect(screen.getByRole('dialog').textContent).toContain('마법 사용으로는 소모되지 않아요')
 captureLayout('status-hud-detail')
})

it('updates player bleeding damage and its badge during the player phase',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 const fresh=fight('tomb-hook-guard');fresh.playerEffects=[{kind:'bleed',amount:3,turns:2}]
 vi.spyOn(practice,'newPractice').mockImplementation(()=>fresh)
 render(<ExplorationGame nickname="탐험가" onLeave={()=>{}}/>)
 await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 vi.spyOn(Math,'random').mockReturnValue(.99)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(1100)})
 expect(screen.getByRole('progressbar',{name:'탐험가 체력'})).toHaveProperty('value',97)
 expect(document.querySelector('.exploration-enemy-intent')?.textContent).toContain('출혈로 체력 3 감소.')
 expect(screen.getByRole('button',{name:'출혈 · 턴당 피해 3 · 1턴 남음'})).toBeTruthy()
 await act(async()=>{await vi.advanceTimersByTimeAsync(5100)})
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(1100)})
 expect(screen.queryByRole('button',{name:/출혈 · 턴당 피해/})).toBeNull()
})
it('opens the treasure scarab spell as separate flavor and effect facts',()=>{
 const state=fight('treasure-scarab')
 render(<ScorpionRoom state={state} busy={false} feedback={null} latestLog="" speaker="탐험" onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'마법 · 봉인의 섬광 설명'}))
 expect(within(screen.getByRole('dialog')).getByText('명중률 −30%')).toBeTruthy()
 expect(screen.getByRole('dialog').querySelector('dl[aria-label="스킬 효과"]')).toBeTruthy()
 captureLayout('treasure-scarab-detail')
})
it('starts all monsters with their configured health and has real artwork for every move',()=>{
 expect(explorationMonsters.map(monster=>monster.maxHp)).toEqual([38,55,20,65,65,100,28,33,25,70,115,100,220,120])
 for(const monster of explorationMonsters){
  expect(fight(monster.id).combat).toMatchObject({monsterId:monster.id,enemyHp:monster.maxHp})
  if(regularMonsters.includes(monster)){const index=regularMonsters.indexOf(monster);expect(drawMonster(()=>(index+.5)/regularMonsters.length).id).toBe(monster.id)}
  expect(monster.critical).toBeGreaterThan(0);expect(monster.defense).toBeGreaterThan(0)
  for(const move of [monster.basic,...monster.magic])expect(existsSync('public'+move!.image)).toBe(true)
 }
 const manifest=JSON.parse(readFileSync('assets/exploration/monsters/manifest.json','utf8'))
 expect(manifest.images).toHaveLength(9)
 for(const image of manifest.images){expect(existsSync(image.source)).toBe(true);expect(existsSync(image.output)).toBe(true)}
})
it('applies enemy armor to physical hits and resistance only to damaging spells',()=>{
 const state=fight('obsidian-anubis')
 expect(attack(state).playerState.combat?.enemyHp).toBe(94)
 expect(attack(state,0).playerState.combat?.enemyHp).toBe(84)
 const mage={...state,spells:practiceSpells,equippedSpells:['ember','sand']}
 expect(resolveCombatTurn(mage,{type:'magic',id:'ember'},()=>.99).playerState.combat?.enemyHp).toBe(84)
 expect(resolveCombatTurn(mage,{type:'magic',id:'sand'},()=>.99).playerState.combat?.enemyHp).toBe(92)
 const weak={...state,weapons:[{id:'weak',name:'약한 무기',description:'',attack:1}],weaponId:'weak'}
 expect(attack(weak).playerState.combat?.enemyHp).toBe(99)
})
it('gives normal monsters named physical attacks with crits and no magic',()=>{
 for(const monster of explorationMonsters.filter(monster=>!monster.magic.length)){
  const result=attack(fight(monster.id),.99,.99,0)
  expect(result.events.find(event=>event.kind==='monster')).toMatchObject({critical:true,damage:monster.attack*2-1,moveId:monster.basic.id,attackType:'physical',source:monster.name})
  expect(result.lines.join(' ')).toContain(monster.basic.name)
 }
})
it('selects each intermediate action equally without magic crits or evasion',()=>{
 for(const monster of explorationMonsters.filter(monster=>monster.magic.length)){
  const state=fight(monster.id),original=structuredClone(state)
  const magic=attack(state,.99,0)
  expect(magic.events.find(event=>event.kind==='monster')).toMatchObject({damage:monster.magic[0].damage,critical:false,attackType:'magic',moveId:monster.magic[0].id})
  expect(magic.state.mp).toBe(state.mp-(monster.magic[0].effect==='mana-drain'?4:0))
  const basic=attack(state,.99,monster.magic.length/(monster.magic.length+1),.99,.99)
  expect(basic.events.find(event=>event.kind==='monster')?.moveId).toBe(monster.basic.id)
  const evasive={...state,armor:[{id:'dodge',name:'회피',description:'',evasion:100,magicReduction:4}],armorId:'dodge'}
  expect(attack(evasive,.99,0).state.hp).toBe(100-monster.magic[0].damage+4)
  expect(attack(evasive,.99,.999,0).state.hp).toBe(100)
  expect(state).toEqual(original)
 }
})
it('consumes sand blindness on the next basic attempt only and never procs on a miss',()=>{
 const blind=attack(fight('sand-wraith'),.99,0).state
 expect(blind.combat?.playerBlind).toBe(30)
 const mage={...blind,spells:practiceSpells,equippedSpells:['light']}
 const healed=resolveCombatTurn(mage,{type:'magic',id:'light'},rolls(.99,.99,.99)).state
 expect(healed.combat?.playerBlind).toBe(30)
 const missed=attack(healed,.299,.99,.99,.99)
 expect(missed.events[0]).toMatchObject({effect:'miss',damage:0})
 expect(missed.state.combat?.playerBlind).toBeUndefined()
 expect(missed.playerState.combat?.enemyHp).toBe(healed.combat?.enemyHp)
 const hit=attack(blind,.3,.99,.99,.99,.99)
 expect(hit.events[0].damage).toBe(7)
 expect(blind.combat?.playerBlind).toBe(30)
})
it('applies the tomb seal damage and drains only available mana at the enemy reply',()=>{
 for(const mp of [30,4,2,0]){
  const state={...fight('obsidian-anubis'),mp}
  const result=attack(state,.99,0)
  expect(result.state.hp).toBe(88)
  expect(result.playerState.mp).toBe(mp)
  expect(result.state.mp).toBe(Math.max(0,mp-4))
  expect(result.events.find(event=>event.effect==='mana-drain')).toMatchObject({manaLost:Math.min(4,mp),text:`왕릉의 봉인! 마나 ${Math.min(4,mp)} 감소.`})
  expect(state.mp).toBe(mp)
  expect(attack(state,.99,.999,.99,.99).state.mp).toBe(mp)
 }
 const caster={...fight('obsidian-anubis'),mp:7,spells:practiceSpells,equippedSpells:['ember']}
 const cast=resolveCombatTurn(caster,{type:'magic',id:'ember'},rolls(0))
 expect(cast.playerState.mp).toBe(1);expect(cast.state.mp).toBe(0)
 expect(cast.events.find(event=>event.effect==='mana-drain')?.manaLost).toBe(1)
 const frozen=fight('obsidian-anubis');frozen.combat!.effects=[{kind:'freeze',amount:1,turns:1}]
 expect(attack(frozen,.99).state.mp).toBe(40)
 const guarded={...fight('obsidian-anubis'),armor:[{id:'ward',name:'수호',description:'',magicReduction:12}],armorId:'ward',spells:practiceSpells,equippedSpells:['tide']}
 const blocked=resolveCombatTurn(guarded,{type:'magic',id:'tide'},rolls(0))
 expect(blocked.state.hp).toBe(100);expect(blocked.state.mp).toBe(31)
})
it('shows mana loss only when Anubis actually casts the seal in the reply phase',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 const fresh=fight('obsidian-anubis')
 vi.spyOn(practice,'newPractice').mockImplementation(()=>fresh)
 render(<ExplorationGame nickname="탐험가" onLeave={()=>{}}/>)
 await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 vi.spyOn(Math,'random').mockImplementation(rolls(.99,0))
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 await act(async()=>{await vi.advanceTimersByTimeAsync(1100)})
 expect(screen.getByRole('progressbar',{name:'탐험가 마나'})).toHaveProperty('value',40)
 expect(document.querySelector('.status-drain-particles')).toBeNull()
 expect(document.querySelector('.exploration-enemy-intent')?.textContent).not.toContain('마나 4 감소')
 await act(async()=>{await vi.advanceTimersByTimeAsync(3200)})
 expect(screen.getByRole('progressbar',{name:'탐험가 마나'})).toHaveProperty('value',36)
 expect(document.querySelectorAll('.status-drain-particles i')).toHaveLength(12)
 expect(document.querySelector('.exploration-enemy-intent')?.textContent).toContain('왕릉의 봉인! 마나 4 감소.')
})
it('splits Anubis attacks into exact thirds with no unused probability',()=>{
 const state=fight('obsidian-anubis')
 const counters:Record<string,number>={}
 for(let i=0;i<900;i++){
  const result=attack(state,.99,(i+.5)/900)
  const id=result.events.find(event=>event.moveId)!.moveId!
  counters[id]=(counters[id]??0)+1
 }
 expect(counters).toEqual({'tomb-seal':300,'soul-harvest':300,'guardian-spear':300})
 for(const [roll,id] of [[0,'tomb-seal'],[1/3-1e-8,'tomb-seal'],[1/3,'soul-harvest'],[2/3-1e-8,'soul-harvest'],[2/3,'guardian-spear'],[.999,'guardian-spear']] as const){
  expect(attack(state,.99,roll).events.find(event=>event.moveId)?.moveId).toBe(id)
 }
})
it('harvests half the actual damage after defenses, caps healing and honors anti-healing',()=>{
 const state=fight('obsidian-anubis');state.combat!.enemyHp=40
 const result=attack(state,.99,.5)
 expect(result.state.hp).toBe(86);expect(result.state.mp).toBe(40)
 expect(result.playerState.combat?.enemyHp).toBe(34)
 expect(result.state.combat?.enemyHp).toBe(41)
 expect(result.events.find(event=>event.effect==='enemy-heal')).toMatchObject({healing:7,source:'흑요석 아누비스병'})
 expect(state.combat!.enemyHp).toBe(40)
 const nearlyFull={...state,combat:{...state.combat!,enemyHp:99}}
 expect(attack(nearlyFull,.99,.5).state.combat?.enemyHp).toBe(100)
 const lastHit=attack({...state,hp:3},.99,.5)
 expect(lastHit.state.combat?.status).toBe('lost')
 expect(lastHit.events.find(event=>event.effect==='enemy-heal')?.healing).toBe(1)
 const resisted={...state,armor:[{id:'resist',name:'저항',description:'',magicReduction:7}],armorId:'resist'}
 expect(attack(resisted,.99,.5).events.find(event=>event.effect==='enemy-heal')?.healing).toBe(3)
 const burned={...state,combat:{...state.combat!,effects:[{kind:'burn' as const,amount:40,turns:2}]}}
 expect(attack(burned,.99,.5).events.find(event=>event.effect==='enemy-heal')?.healing).toBe(4)
 const guarded={...state,armor:[{id:'ward',name:'수호',description:'',magicReduction:12}],armorId:'ward',spells:practiceSpells,equippedSpells:['tide']}
 const blocked=resolveCombatTurn(guarded,{type:'magic',id:'tide'},rolls(.5))
 expect(blocked.state.hp).toBe(100)
 expect(blocked.events.some(event=>event.effect==='enemy-heal')).toBe(false)
})
it('reduces magic resistance for exactly the following turn and refreshes without stacking',()=>{
 const state={...fight('tomb-lantern-jellyfish'),armor:[{id:'ward',name:'저항',description:'',reduction:1,magicReduction:6}],armorId:'ward'}
 const first=attack(state,.99,0)
 expect(first.state.hp).toBe(88)
 expect(first.playerState.combat?.magicResistanceDown).toBeUndefined()
 expect(first.state.combat?.magicResistanceDown).toBe(10)
 const second=attack(first.state,.99,0)
 expect(second.state.hp).toBe(66)
 expect(second.playerState.combat?.magicResistanceDown).toBe(10)
 expect(second.state.combat?.magicResistanceDown).toBe(10)
 const physical=attack(second.state,.99,.99,.99,.99)
 expect(physical.state.hp).toBe(55)
 expect(physical.state.combat?.magicResistanceDown).toBeUndefined()
 expect(attack(physical.state,.99,0).state.hp).toBe(43)
 const unarmored=attack(fight('tomb-lantern-jellyfish'),.99,0).state
 expect(attack(unarmored,.99,0).events.find(event=>event.kind==='monster')?.damage).toBe(28)
 expect(state.hp).toBe(100)
})
it('expires magic resistance reduction on a stopped turn and allows cleansing before the next hit',()=>{
 const reduced=attack(fight('tomb-lantern-jellyfish'),.99,0).state
 const frozen={...reduced,combat:{...reduced.combat!,effects:[{kind:'freeze' as const,amount:1,turns:1}]}}
 expect(attack(frozen,.99).state.combat?.magicResistanceDown).toBeUndefined()
 const cleanser={...reduced,weapons:[{id:'cleanse',name:'정화',description:'',attack:1,critical:0,cleanseChance:100}],weaponId:'cleanse'}
 const cleansed=attack(cleanser,.99,0,0)
 expect(cleansed.playerState.combat?.magicResistanceDown).toBeUndefined()
 expect(cleansed.events.find(event=>event.kind==='monster')?.damage).toBe(18)
 expect(cleansed.events.some(event=>event.effect==='cleanse')).toBe(true)
 const guarded={...reduced,spells:practiceSpells,equippedSpells:['tide']}
 expect(resolveCombatTurn(guarded,{type:'magic',id:'tide'},rolls(0)).events.find(event=>event.kind==='monster')?.damage).toBe(20)
})
it('gives the wisp a simple fire spell and consumes the lizard curse on one basic attempt',()=>{
 const wisp=attack(fight('jar-wisp'),.99,0)
 expect(wisp.events.find(event=>event.kind==='monster')).toMatchObject({damage:8,moveId:'ember-bolt',attackType:'magic'})
 expect(wisp.events.some(event=>event.kind==='status')).toBe(false)
 const first=attack(fight('talisman-lizard'),.99,0)
 expect(first.state.hp).toBe(95);expect(first.state.combat?.playerWeaken).toBe(2)
 const mage={...first.state,spells:practiceSpells,equippedSpells:['light']}
 const healing=resolveCombatTurn(mage,{type:'magic',id:'light'},rolls(.99,.99,.99)).state
 expect(healing.combat?.playerWeaken).toBe(2)
 const basic=attack(healing,.99,.99,.99,.99)
 expect(basic.events[0].damage).toBe(6) // (10 - 2) attack minus 2 armor.
 expect(basic.playerState.combat?.playerWeaken).toBeUndefined()
 expect(basic.state.combat?.playerWeaken).toBeUndefined()
 expect(attack(basic.state,.99,.99,.99,.99).events[0].damage).toBe(8)
 const repeated=attack(first.state,.99,0)
 expect(repeated.state.combat?.playerWeaken).toBe(2)
 const blind={...first.state,combat:{...first.state.combat!,playerBlind:30}}
 const missed=attack(blind,0,.99,.99,.99)
 expect(missed.events[0].effect).toBe('miss')
 expect(missed.state.combat?.playerWeaken).toBeUndefined()
})
it('stops both enemy actions with freeze and awards each monster reward only once',()=>{
 for(const monster of explorationMonsters){
  const frozen=fight(monster.id);frozen.combat!.effects=[{kind:'freeze',amount:1,turns:1}]
  const result=attack(frozen,.99)
  expect(result.state.hp).toBe(100);expect(result.events.some(event=>event.moveId)).toBe(false)
  const dying=fight(monster.id);dying.combat!.enemyHp=1
  const killed=attack(dying)
  expect(killed.state.gold).toBe(100000+monster.gold)
  expect(killed.events.some(event=>event.kind==='monster')).toBe(false)
  expect(attack(killed.state).state).toBe(killed.state)
 }
})
it.each(explorationMonsters)('fades $name, removes both skills, briefly shows gold and leaves only the descend button',async(monster)=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false}))
 const initial=fight(monster.id);initial.combat!.enemyHp=1
 const result=attack(initial),snapshot=structuredClone(result.state),descend=vi.fn()
 const props={state:result.state,busy:false,feedback:{id:1,phase:'reply' as const,events:result.events,action:'attack' as const},latestLog:'처치',speaker:'탐험',onAction:vi.fn(),onDescend:descend,onReturnToMain:vi.fn()}
 const view=render(<ScorpionRoom {...props}/>),nextLabel=result.state.bossRestPending?'오아시스로 향한다':'아래층으로 내려간다.'
 expect(screen.getByLabelText('탐험 로그').textContent).toMatch(new RegExp(monster.name+'[을를] 처치했습니다\\.'))
 expect(screen.getByRole('img',{name:monster.name}).parentElement?.className).toContain('is-defeated')
 expect(document.querySelectorAll('.exploration-monster-move')).toHaveLength(1+Math.max(1,monster.magic.length))
 expect(screen.queryByRole('button',{name:nextLabel})).toBeNull()
 await act(async()=>{await vi.advanceTimersByTimeAsync(900)})
 expect(screen.queryByRole('img',{name:monster.name})).toBeNull()
 expect(document.querySelectorAll('.exploration-monster-move')).toHaveLength(0)
 expect(document.querySelector('.combat-victory-gold')).toBeNull()
 await act(async()=>{await vi.advanceTimersByTimeAsync(300)})
 expect(document.querySelectorAll('.exploration-monster-move')).toHaveLength(0)
 expect(document.querySelector('.combat-victory-gold')?.textContent??null).toBe(monster.gold>0?`골드 +${monster.gold.toLocaleString()}`:null)
 captureLayout(monster.id+'-victory-gold')
 view.rerender(<ScorpionRoom {...props} busy/>)
 await act(async()=>{await vi.advanceTimersByTimeAsync(1600)})
 expect(document.querySelector('.combat-victory-gold')).toBeNull()
 expect(screen.queryByText('전투 승리')).toBeNull()
 expect(screen.getByRole('button',{name:nextLabel})).toHaveProperty('disabled',true)
 view.rerender(<ScorpionRoom {...props}/>)
 captureLayout(monster.id+'-victory-done')
 fireEvent.click(screen.getByRole('button',{name:nextLabel}))
 expect(descend).toHaveBeenCalledOnce()
 expect(result.state).toEqual(snapshot)
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000)})
 expect(document.querySelector('.combat-victory-gold')).toBeNull()
})
it('cleans up a departing victory animation without leaving pending timers',()=>{
 vi.useFakeTimers();const state=fight('sand-scorpion');state.combat!.status='won'
 const view=render(<ScorpionRoom state={state} busy={false} feedback={null} latestLog="" speaker="탐험" onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/>)
 view.unmount();expect(vi.getTimerCount()).toBe(0)
})
it('shows a single main-screen action on death and leaves the exploration when clicked',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 const state=startMonsterCombat(newPractice(()=>0),'sand-wraith');state.hp=0;state.combat!.status='lost'
 vi.spyOn(practice,'newPractice').mockImplementation(()=>state)
 const leave=vi.fn()
 render(<ExplorationGame nickname="탐험가" onLeave={leave}/>)
 const game=screen.getByRole('region',{name:'파라오 지하 탐험'})
 expect(game.className).toContain('is-dead')
 const room=screen.getByRole('region',{name:'모래망령 전투'})
 expect(within(room).getAllByRole('button')).toHaveLength(1)
 expect(within(room).getByText('사망하였습니다.')).toBeTruthy()
 expect(screen.queryByText('연습 탐험 다시 시작')).toBeNull()
 expect(screen.queryByText('탐험 종료')).toBeNull()
 captureLayout('death-screen')
 fireEvent.click(within(room).getByRole('button',{name:'메인 화면으로'}))
 expect(leave).toHaveBeenCalledOnce()
})
it.each(regularMonsters)('enters $name and opens the left/right move descriptions without spending a turn',async(monster)=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 render(<ExplorationGame nickname="탐험가" onLeave={()=>{}}/>)
 await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 const doorIndex=explorationMonsters.indexOf(monster)%3
 fireEvent.change(screen.getByLabelText(`${doorIndex+1}번 문 방 유형`),{target:{value:`monster:${monster.id}`}})
 const other=explorationMonsters.find(item=>item.id!==monster.id)!
 fireEvent.change(screen.getByLabelText(`${(doorIndex+1)%3+1}번 문 방 유형`),{target:{value:`monster:${other.id}`}})
 expect(screen.getByLabelText(`${doorIndex+1}번 문 방 유형`)).toHaveProperty('value',`monster:${monster.id}`)
 fireEvent.click(within(screen.getByRole('group',{name:'지하 1층의 세 문'})).getAllByRole('button')[doorIndex])
 fireEvent.click(screen.getByRole('button',{name:'몬스터 방 · 입장',exact:true}))
 for(let i=0;i<3;i++)await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 expect(screen.getByRole('region',{name:`${monster.name} 전투`})).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:`${monster.name} 체력`})).toHaveProperty('value',monster.maxHp)
 captureLayout(monster.id)
 const basic=screen.getByRole('button',{name:`기본 공격 · ${monster.basic.name} 설명`})
 const magic=screen.getByRole('button',{name:`마법 · ${monster.magic[0]?.name??'마법 없음'} 설명`})
 expect(basic.querySelector('img')?.getAttribute('src')).toBe(monster.basic.image)
 fireEvent.click(basic)
 expect(within(screen.getByRole('dialog')).getByText('물리 피해')).toBeTruthy();expect(within(screen.getByRole('dialog')).getByText(`${Math.max(1,monster.attack-2)}–${monster.attack+2}`)).toBeTruthy()
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
 await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 fireEvent.click(magic)
 if(monster.magic.length){expect(within(screen.getByRole('dialog')).getByText('마법 피해')).toBeTruthy();expect(within(screen.getByRole('dialog')).getByText(`${monster.magic[0].damage}`,{exact:true})).toBeTruthy()}else expect(screen.getByRole('dialog').textContent).toContain('마법을 사용하지 않고')
 captureLayout(monster.id+'-detail')
 if(monster.magic.length>1){
  fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
  await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
  fireEvent.click(screen.getByRole('button',{name:'마법 · 영혼 수확 설명'}))
  expect(screen.getByRole('dialog').textContent).toContain('실제 피해의 50%')
  expect(screen.getByRole('dialog').textContent).toContain('1/3')
 }
 expect(screen.getByRole('region',{name:`${monster.name} 전투`,hidden:true}).textContent).toContain('1턴')
})
