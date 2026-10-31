import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import * as practice from '@/features/exploration/practice-state'
import {plannedSpells} from '@/features/exploration/spell-catalog'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()})
const advance=async(ms:number)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
it('launches once during preparation, applies damage at the existing hit timing and removes it before the enemy reply',async()=>{
 const fresh=practice.newPractice(()=>0),spell=plannedSpells.find(s=>s.id==='crimson-shards')!
 vi.spyOn(practice,'newPractice').mockReturnValue({...fresh,spells:[{...spell,message:spell.description}],equippedSpells:[spell.id],market:{...fresh.market,monsterIds:['bandage-mummy','random','random'],doors:['monster','sphinx','monster']}})
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(.99);vi.useFakeTimers()
 render(<ExplorationGame nickname="퐁이" onLeave={()=>{}}/>);await advance(100)
 fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(screen.getByRole('button',{name:'몬스터 방 · 입장'}));await advance(100);await advance(100);await advance(100)
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}));fireEvent.click(screen.getByRole('button',{name:'핏빛 파편 · MP 7 시전'}))
 const effect=document.querySelector('.spell-cast-effect')!
 expect(effect.getAttribute('data-spell')).toBe('crimson-shards');expect(effect.getAttribute('data-target')).toBe('enemy')
 expect(document.querySelectorAll('.spell-missile')).toHaveLength(3)
 expect(screen.getByRole('progressbar',{name:'붕대 미라 체력'})).toHaveProperty('value',55)
 capture('crimson-shards')
 await advance(1100)
 expect(document.querySelector('.spell-cast-effect')).toBe(effect)
 expect(screen.getByRole('progressbar',{name:'붕대 미라 체력'})).toHaveProperty('value',21)
 expect(screen.getByRole('progressbar',{name:'탐험가 마나'})).toHaveProperty('value',33)
 await advance(1900)
 expect(document.querySelector('.spell-cast-effect')).toBeNull()
})
function capture(id:string){
 if(!process.env.SPELL_FLIGHT_QA)return
 const root=process.cwd().replaceAll('\\','/'),css=readFileSync('dist/assets/'+readdirSync('dist/assets').find(f=>/^index-.*\.css$/.test(f)),'utf8')+['exploration.css','exploration-hud.css','spell-cast-effect.css'].map(f=>readFileSync('src/features/exploration/'+f,'utf8')).join('\n')
 let html=document.body.innerHTML.replaceAll('data-starting-style=""','').replace(/(?:http:\/\/localhost:\d+)?\/src\/features\/exploration\/assets\//g,`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`)
 writeFileSync(`artifacts/spell-flight-${id}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0}</style>${html}`)
}
