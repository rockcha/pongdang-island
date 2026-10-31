import {StrictMode} from 'react'
import {act,cleanup,render} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {writeFileSync} from 'node:fs'
import {StatusScreenEffects} from '@/features/exploration/status-screen-effects'
import {newPractice,type PracticeState} from '@/features/exploration/practice-state'
import {startMonsterCombat,type CombatEvent,type TurnFeedback} from '@/features/exploration/combat-state'
import type {AilmentKind} from '@/features/exploration/ailments'

afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
const fresh=()=>startMonsterCombat(newPractice(()=>0),'sand-wraith')
const frame=(phase:TurnFeedback['phase'],events:CombatEvent[],id=1):TurnFeedback=>({id,phase,events,action:'attack'})
async function advance(ms:number){await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
function capture(id:string){if(process.env.STATUS_LAYOUT_QA)writeFileSync(`artifacts/statusfx-${id}.fragment.html`,document.querySelector('.exploration-status-screen')?.outerHTML??'')}

it.each(['bleed','blind','weaken','magic-break','burn','freeze'] as const)('keeps %s at the edges after its onset, then fades it on removal',async kind=>{
 vi.useFakeTimers()
 const base=fresh(),state:PracticeState=kind==='blind'?{...base,combat:{...base.combat!,playerBlind:30}}:kind==='weaken'?{...base,combat:{...base.combat!,playerWeaken:2}}:kind==='magic-break'?{...base,combat:{...base.combat!,magicResistanceDown:10}}:{...base,playerEffects:[{kind:kind as AilmentKind,amount:3,turns:2}]}
 const snapshot=structuredClone(state)
 const view=render(<StrictMode><StatusScreenEffects state={state} feedback={null}/></StrictMode>)
 expect(document.querySelector(`.exploration-status-layer[data-fx="${kind}"]`)).toBeTruthy()
 expect(document.querySelectorAll('.exploration-status-toast')).toHaveLength(1);capture(kind+'-onset')
 await advance(500)
 expect(document.querySelector('.exploration-status-toast')).toBeNull();expect(document.querySelector('.exploration-status-layer')).toBeTruthy();capture(kind+'-sustain')
 view.rerender(<StrictMode><StatusScreenEffects state={base} feedback={null}/></StrictMode>)
 expect(document.querySelector('.exploration-status-layer')?.getAttribute('data-phase')).toBe('leaving')
 await advance(399);expect(document.querySelector('.exploration-status-layer')).toBeTruthy()
 await advance(1);expect(document.querySelector('.exploration-status-layer')).toBeNull()
 expect(state).toEqual(snapshot)
})

it('waits until the reply lands, and does not replay a status when the same turn is rendered again',async()=>{
 vi.useFakeTimers();const base=fresh(),events:CombatEvent[]=[{kind:'status',source:'모래망령',effect:'blind',text:'실명!'}]
 const view=render(<StatusScreenEffects state={base} feedback={frame('prepare',events)}/>)
 view.rerender(<StatusScreenEffects state={base} feedback={frame('counter',events)}/>)
 expect(document.querySelector('.exploration-status-toast')).toBeNull()
 const afflicted={...base,combat:{...base.combat!,playerBlind:30}}
 view.rerender(<StatusScreenEffects state={afflicted} feedback={frame('reply',events)}/>)
 expect(document.querySelector('.exploration-status-toast')?.textContent).toBe('실명')
 await advance(500)
 view.rerender(<StatusScreenEffects state={{...afflicted,combat:{...afflicted.combat}}} feedback={frame('reply',events)}/>)
 expect(document.querySelector('.exploration-status-toast')).toBeNull()
})

it('pulses only real player bleeding damage, without restarting its announcement or consuming game randomness',async()=>{
 vi.useFakeTimers();const base=fresh(),state:PracticeState={...base,playerEffects:[{kind:'bleed',amount:3,turns:2}]}
 const random=vi.spyOn(Math,'random')
 const view=render(<StatusScreenEffects state={state} feedback={null}/>);await advance(500)
 const events:CombatEvent[]=[{kind:'status',effect:'bleed',target:'player',damage:3,source:'출혈',text:'출혈'}]
 view.rerender(<StatusScreenEffects state={{...state,hp:97}} feedback={frame('player',events)}/>)
 expect(document.querySelector('.exploration-status-burst[data-fx=bleed]')).toBeTruthy();expect(document.querySelector('.exploration-status-toast')).toBeNull()
 await advance(500)
 view.rerender(<StatusScreenEffects state={state} feedback={frame('reply',events)}/>)
 expect(document.querySelector('.exploration-status-burst')).toBeNull();expect(random).not.toHaveBeenCalled()
})

it('ignores ailments applied to the enemy and zero mana loss, then displays a real drain only on reply',async()=>{
 vi.useFakeTimers();const base=fresh(),events:CombatEvent[]=[{kind:'status',target:'monster',source:'무기',effect:'bleed',text:'출혈'},{kind:'defense',effect:'freeze',text:'빙결'},{kind:'status',effect:'mana-drain',manaLost:0,source:'아누비스',text:'마나 0'}]
 const view=render(<StatusScreenEffects state={base} feedback={frame('reply',events)}/>)
 expect(document.querySelector('.exploration-status-cue')).toBeNull()
 const drain:CombatEvent[]=[{kind:'status',effect:'mana-drain',manaLost:4,source:'아누비스',text:'마나 4 감소'}]
 view.rerender(<StatusScreenEffects state={base} feedback={frame('counter',drain,2)}/>)
 expect(document.querySelector('.status-drain-particles')).toBeNull()
 view.rerender(<StatusScreenEffects state={{...base,mp:36}} feedback={frame('reply',drain,2)}/>)
 expect(document.querySelectorAll('.status-drain-particles i')).toHaveLength(12);capture('mana-drain-onset')
 await advance(500);expect(document.querySelector('.status-drain-particles')).toBeNull();expect(document.querySelector('.exploration-status-layer')).toBeNull()
})

it('combines multiple ailments, cancels a fade when reapplied, and clears immediately on death or unmount',async()=>{
 vi.useFakeTimers();const base=fresh(),state:PracticeState={...base,playerEffects:[{kind:'bleed',amount:3,turns:2},{kind:'burn',amount:40,turns:2}],combat:{...base.combat!,playerBlind:30,magicResistanceDown:10}}
 const view=render(<StatusScreenEffects state={state} feedback={null}/>);expect(document.querySelectorAll('.exploration-status-layer')).toHaveLength(4);capture('multiple-onset');await advance(500);capture('multiple-sustain')
 view.rerender(<StatusScreenEffects state={base} feedback={null}/>);await advance(200)
 view.rerender(<StatusScreenEffects state={state} feedback={null}/>);await advance(400)
 expect(document.querySelectorAll('.exploration-status-layer[data-phase=active]')).toHaveLength(4)
 view.rerender(<StatusScreenEffects state={{...state,hp:0}} feedback={null}/>);expect(document.querySelector('.exploration-status-screen')).toBeNull()
 view.unmount();await advance(1000);expect(document.querySelector('.exploration-status-screen')).toBeNull()
})
