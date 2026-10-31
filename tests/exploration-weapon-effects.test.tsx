import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {renderToStaticMarkup} from 'react-dom/server'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {afterEach,expect,it,vi} from 'vitest'
import {WeaponAttackEffect} from '@/features/exploration/weapon-attack-effect'
import {weaponVisuals} from '@/features/exploration/weapon-visuals'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import * as practice from '@/features/exploration/practice-state'

vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()})
const advance=async(ms:number)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
const allWeapons=[practice.starterWeapon,...explorationWeapons]
function fight(id:string,hp=70){const weapon=allWeapons.find(item=>item.id===id)!;return startMonsterCombat({...practice.newPractice(()=>0),hp,weapons:[weapon],weaponId:id},'golden-pharaoh')}
function animation(id:string,random=()=>0,change?:(state:practice.PracticeState)=>practice.PracticeState){let state=fight(id);if(change)state=change(state);const result=resolveCombatTurn(state,{type:'attack'},random),event=result.events.find(item=>item.kind==='player')!;return {state,result,element:<WeaponAttackEffect weaponId={event.weaponId!} phase="player" critical={event.critical} missed={event.effect==='miss'} proc={result.events.find(item=>item.weaponProc)?.weaponProc} lifesteal={result.events.some(item=>item.effect==='lifesteal'&&(item.healing??0)>0)} cleanse={result.events.some(item=>item.effect==='cleanse')}/>}}

it('covers the starting dagger and all 45 weapons with shape-specific identities and one actual strike',()=>{
 expect(Object.keys(weaponVisuals).sort()).toEqual(allWeapons.map(item=>item.id).sort())
 expect(new Set(Object.values(weaponVisuals).map(item=>item.motion)).size).toBe(13)
 for(const weapon of allWeapons){
  const {result,element}=animation(weapon.id)
  expect(result.events.filter(item=>item.kind==='player')).toHaveLength(1)
  expect(result.events.find(item=>item.kind==='player')?.weaponId).toBe(weapon.id)
  const prepare=renderToStaticMarkup(<WeaponAttackEffect weaponId={weapon.id} phase="prepare"/>),hit=renderToStaticMarkup(element)
  expect(prepare).not.toContain('weapon-hit-burst');expect(hit).toContain('weapon-hit-burst')
  expect(hit).toContain(`data-motion="${weaponVisuals[weapon.id].motion}"`)
  if(process.env.WEAPON_EFFECT_QA){writeFileSync(`artifacts/weapon-fx-${weapon.id}-prepare.fragment.html`,prepare);writeFileSync(`artifacts/weapon-fx-${weapon.id}-hit.fragment.html`,hit)}
 }
})
it('shows a weapon status burst only when its existing proc actually applies',()=>{
 for(const weapon of explorationWeapons.filter(item=>item.proc)){
  const triggered=animation(weapon.id)
  expect(renderToStaticMarkup(triggered.element)).toContain(`data-proc="${weapon.proc!.kind}"`)
  const failed=animation(weapon.id,()=>.99)
  expect(failed.result.events.some(item=>item.weaponProc)).toBe(false)
  expect(renderToStaticMarkup(failed.element)).not.toContain('class="weapon-proc"')
 }
 const guarded=animation('frost-tip-spear',()=>0,state=>({...state,combat:{...state.combat!,freezeGuard:true}}))
 expect(renderToStaticMarkup(guarded.element)).not.toContain('data-proc="freeze"')
 const killed=animation('serrated-bronze-sword',()=>0,state=>({...state,combat:{...state.combat!,enemyHp:1}}))
 expect(renderToStaticMarkup(killed.element)).not.toContain('data-proc="bleed"')
})
it('separates successful life return and self cleansing from full health, failed rolls and misses',()=>{
 expect(renderToStaticMarkup(animation('osiris-lifereaper').element)).toContain('weapon-life-return')
 expect(renderToStaticMarkup(animation('osiris-lifereaper',()=>0,state=>({...state,hp:100})).element)).not.toContain('weapon-life-return')
 const afflicted=(state:practice.PracticeState)=>({...state,playerEffects:[{kind:'bleed' as const,amount:2,turns:2}]})
 expect(renderToStaticMarkup(animation('dawn-purification-mace',()=>0,afflicted).element)).toContain('weapon-self-cleanse')
 expect(renderToStaticMarkup(animation('dawn-purification-mace',()=>.99,afflicted).element)).not.toContain('weapon-self-cleanse')
 expect(renderToStaticMarkup(animation('dawn-purification-mace').element)).not.toContain('weapon-self-cleanse')
 const miss=animation('osiris-lifereaper',()=>0,state=>({...state,combat:{...state.combat!,playerBlind:100}})),html=renderToStaticMarkup(miss.element)
 expect(miss.result.events.find(item=>item.kind==='player')?.effect).toBe('miss')
 expect(html).toContain('data-missed="true"');expect(html).not.toContain('weapon-hit-burst');expect(html).not.toContain('weapon-life-return')
})
it('launches a crossbow bolt once, keeps damage at 1100ms, and clears before the enemy counter',async()=>{
 const fresh=practice.newPractice(()=>0),weapon=explorationWeapons.find(item=>item.id==='ruin-hunter-crossbow')!
 vi.spyOn(practice,'newPractice').mockReturnValue({...fresh,weapons:[weapon],weaponId:weapon.id,market:{...fresh.market,monsterIds:['bandage-mummy','random','random'],doors:['monster','sphinx','monster']}})
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(.99);vi.useFakeTimers()
 render(<ExplorationGame nickname="퐁이" onLeave={()=>{}}/>);await advance(100)
 fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(screen.getByRole('button',{name:'몬스터 방 · 입장'}));await advance(100);await advance(100);await advance(100)
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 const effect=document.querySelector('.weapon-attack-effect')!
 expect(effect.getAttribute('data-weapon')).toBe(weapon.id)
 expect(effect.querySelector('.weapon-projectile')).toBeTruthy();expect(effect.querySelector('.weapon-hit-burst')).toBeNull()
 expect(screen.getByRole('progressbar',{name:'붕대 미라 체력'})).toHaveProperty('value',55)
 capture('prepare')
 await advance(1100)
 expect(document.querySelector('.weapon-attack-effect')).toBe(effect)
 expect(effect.querySelector('.weapon-hit-burst')).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'붕대 미라 체력'})).toHaveProperty('value',39)
 expect(screen.getByRole('progressbar',{name:'탐험가 마나'})).toHaveProperty('value',40)
 capture('hit')
 await advance(1900)
 expect(document.querySelector('.weapon-attack-effect')).toBeNull()
})
function capture(stage:string){
 if(!process.env.WEAPON_EFFECT_QA)return
 const root=process.cwd().replaceAll('\\','/'),css=readFileSync('dist/assets/'+readdirSync('dist/assets').find(f=>/^index-.*\.css$/.test(f)),'utf8')+['exploration.css','exploration-hud.css','weapon-attack-effect.css'].map(f=>readFileSync('src/features/exploration/'+f,'utf8')).join('\n')
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/(?:http:\/\/localhost:\d+)?\/src\/features\/exploration\/assets\//g,`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`)
 writeFileSync(`artifacts/weapon-fx-game-${stage}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0}</style>${html}`)
}
