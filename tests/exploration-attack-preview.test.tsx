import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {writeFileSync} from 'node:fs'
import {ScorpionRoom} from '@/features/exploration/scorpion-room'
import {ExplorerCombatStats} from '@/features/exploration/combat-stats'
import {newPractice,playerAttackStats,type PracticeState} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'

afterEach(cleanup)
const initial=()=>startMonsterCombat(newPractice(()=>0),'sand-scorpion')
const props={busy:false,feedback:null,latestLog:'',speaker:'탐험',onAction:vi.fn(),onDescend:vi.fn(),onReturnToMain:vi.fn()}
function capture(name:string){if(process.env.ATTACK_PREVIEW_QA)writeFileSync(`artifacts/attack-preview-${name}.fragment.html`,screen.getByRole('button',{name:'공격',exact:true}).outerHTML)}

it('shows the actual range and critical chance, includes a curse, and updates after that curse is consumed',()=>{
 const base=initial(),state:PracticeState={...base,weapons:base.weapons.map(weapon=>({...weapon,attackVariance:3})),combat:{...base.combat!,playerWeaken:2,attackBuff:{attack:4,critical:10,turns:2}}}
 const content=(current:PracticeState)=><><ExplorerCombatStats state={current}/><ScorpionRoom {...props} state={current}/></>
 const view=render(content(state))
 const button=screen.getByRole('button',{name:'공격',exact:true})
 expect(within(button).getByText('9–15')).toBeTruthy();expect(within(button).getByText('15%')).toBeTruthy();expect(within(button).getByText('약화 −2')).toBeTruthy()
 expect(button.title).toContain('공격력 12');capture('weakened')
 expect(screen.getByRole('button',{name:'공격력 9–15 설명'})).toBeTruthy()
 fireEvent.click(button);expect(props.onAction).toHaveBeenCalledWith({type:'attack'})
 const result=resolveCombatTurn(state,{type:'attack'},()=>.5)
 expect(result.events[0].damage).toBe(11)
 view.rerender(content(result.state))
 expect(screen.getByRole('button',{name:'공격력 11–17 설명'})).toBeTruthy()
 expect(within(button).getByText('11–17')).toBeTruthy();expect(within(button).queryByText(/약화/)).toBeNull();capture('buffed')
})

it('clamps a heavily weakened attack at one and caps the displayed critical chance at one hundred',()=>{
 const base=initial(),state={...base,combat:{...base.combat!,playerWeaken:100,attackBuff:{attack:0,critical:200,turns:2}}}
 const view=render(<ScorpionRoom {...props} state={state}/>)
 const button=screen.getByRole('button',{name:'공격',exact:true})
 expect(within(button).getByText('1')).toBeTruthy();expect(within(button).getByText('100%')).toBeTruthy()
 view.rerender(<ScorpionRoom {...props} state={{...state,weapons:state.weapons.map(weapon=>({...weapon,attackVariance:3}))}}/>)
 expect(within(button).getByText('1–4')).toBeTruthy()
})

it('previews guaranteed ambush critical damage without adding another random roll to combat',()=>{
 const base=initial(),state={...base,combat:{...base.combat!,ambush:true}}
 expect(playerAttackStats(state).critical).toBe(100)
 const random=vi.fn(()=>.5),result=resolveCombatTurn(state,{type:'attack'},random)
 expect(result.events[0]).toMatchObject({critical:true,damage:19});expect(random).not.toHaveBeenCalled()
 const view=render(<ScorpionRoom {...props} state={base}/>);capture('normal')
 view.rerender(<ScorpionRoom {...props} state={{...base,combat:{...base.combat!,playerWeaken:2}}}/>)
 expect(within(screen.getByRole('button',{name:'공격',exact:true})).getByText('8')).toBeTruthy();capture('curse-only')
})
