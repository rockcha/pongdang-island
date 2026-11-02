import {afterEach,it,expect} from 'vitest'
import {render,screen,within,cleanup} from '@testing-library/react'
import {PlayerAilments,EnemyAilments} from '../src/features/exploration/ailments'
import {plannedSpells} from '../src/features/exploration/spell-catalog'
import {newPractice,incomingDamage,basicAttackEvasion,type PracticeState} from '../src/features/exploration/practice-state'
import {startMonsterCombat,resolveCombatTurn} from '../src/features/exploration/combat-state'

afterEach(cleanup)
it('prioritizes the player shield with absorb amount and no time limit in buffs',()=>{
 const s=fight();s.combat!.shield={remaining:18,turns:3};s.combat!.shieldSpellId='crystal-petals'
 const view=render(<PlayerAilments state={s}/>)
 expect(within(screen.getByRole('region',{name:'버프'})).getByRole('button',{name:/보호막 18/})).toBeTruthy()
 expect(within(screen.getByRole('region',{name:'상태이상'})).queryByText('보호막 18')).toBeNull()
 view.rerender(<PlayerAilments state={{...s,combat:{...s.combat!,shield:{remaining:0,turns:3}}}}/>)
 expect(screen.queryByText('보호막 18')).toBeNull()
})
it('shows an enemy shield in the same strip as weakness and removes it on depletion',()=>{
 const view=render(<EnemyAilments effects={[{kind:'weaken',amount:6,turns:2}]} shield={{remaining:40,turns:3}}/>)
 expect(screen.getByRole('button',{name:'보호막 40'})).toBeTruthy()
 expect(screen.getByText('약화')).toBeTruthy()
 view.rerender(<EnemyAilments effects={[]} shield={{remaining:0,turns:3}}/>)
 expect(screen.queryByRole('list')).toBeNull()
})
const owned=plannedSpells.map(spell=>({...spell,message:spell.description}))
function fight():PracticeState{return startMonsterCombat({...newPractice(),mp:40,spells:owned,equippedSpells:owned.map(spell=>spell.id)},'golden-scales-maaken')}
const cast=(s:PracticeState,id:string)=>resolveCombatTurn(s,{type:'magic',id},()=>.99)

it('marks exactly three subsequent direct attacks, without stacking or mutating snapshots',()=>{
 const s=fight(),branded=cast(s,'solar-brand').state
 expect(s.combat?.spellEffects).toBeUndefined()
 expect(branded.combat?.spellEffects).toEqual([{id:'solar-brand',turns:3}])
 const plain=resolveCombatTurn(s,{type:'attack'},()=>.99).events.find(e=>e.kind==='player')!.damage!
 let next=branded
 for(let i=0;i<3;i++){const turn=resolveCombatTurn(next,{type:'attack'},()=>.99);expect(turn.events.find(e=>e.kind==='player')?.damage).toBe(Math.floor((plain+5)*1.2)-5);next=turn.state}
 expect(next.combat?.spellEffects).toEqual([])
 expect(branded.combat?.spellEffects).toEqual([{id:'solar-brand',turns:3}])
})
it('destroys all enemy shield before applying damage',()=>{
 const s=fight();s.combat!.pattern={shieldHp:200,shieldTurns:3}
 const result=cast(s,'golden-shell-break')
 expect(result.state.combat?.pattern?.shieldHp).toBe(0)
 expect(result.events.find(e=>e.kind==='player')?.damage).toBe(27)
 expect(s.combat?.pattern?.shieldHp).toBe(200)
})
it('survives lethal damage once at one HP before consuming a soul lantern',()=>{
 const s=fight();s.hp=1;s.soulLantern='ready'
 const saved=cast(s,'soul-knot').state
 expect(saved.hp).toBe(1);expect(saved.soulLantern).toBe('ready')
 expect(saved.combat?.spellEffects?.find(e=>e.id==='soul-knot')).toBeUndefined()
 expect(resolveCombatTurn(saved,{type:'attack'},()=>.99).state.soulLantern).toBe('spent')
})
it('expires the soul knot after four counters',()=>{
 let s=fight();s.hp=100;s.armor=[{id:'test',name:'test',description:'',reduction:100}];s.armorId='test'
 s=cast(s,'soul-knot').state
 for(let i=0;i<3;i++)s=resolveCombatTurn(s,{type:'attack'},()=>.99).state
 expect(s.combat?.spellEffects).toEqual([])
})
it('seals skills for two counters even with a boss skill queued by its pattern',()=>{
 let s=startMonsterCombat({...newPractice(),spells:owned,equippedSpells:['silent-seal']},'black-sun-aker')
 s.combat!.pattern={cycle:2}
 let result=resolveCombatTurn(s,{type:'magic',id:'silent-seal'},()=>.4)
 expect(result.events.some(e=>e.moveId==='mask-condemnation')).toBe(false)
 expect(result.events.some(e=>e.kind==='monster')).toBe(true)
 result=resolveCombatTurn(result.state,{type:'attack'},()=>.4)
 expect(result.events.some(e=>e.moveId==='mask-condemnation')).toBe(false)
 expect(result.state.combat?.spellEffects).toEqual([])
 result=resolveCombatTurn(result.state,{type:'attack'},()=>.4)
 expect(result.events.some(e=>e.moveId==='mask-condemnation')).toBe(true)
})
it('records the basic attack actually used under silence rather than a suppressed random skill',()=>{
 const s=fight()
 const sealed=resolveCombatTurn(s,{type:'magic',id:'silent-seal'},()=>.1)
 expect(sealed.state.combat?.pattern?.lastMove).toBe('maaken-hammer')
 const second=resolveCombatTurn(sealed.state,{type:'attack'},()=>.1)
 expect(second.state.combat?.pattern?.lastMove).toBe('maaken-hammer')
 const resumed=resolveCombatTurn(second.state,{type:'attack'},()=>.1)
 expect(resumed.events.some(event=>event.moveId==='maaken-weight')).toBe(true)
})
it('doubles equipped defenses, clamps evasion, refreshes rather than stacking, then expires',()=>{
 let s=fight();s.armor=[{id:'test',name:'test',description:'',reduction:4,magicReduction:5,evasion:5}];s.armorId='test'
 s.combat!.spellEffects=[{id:'lapis-veil',turns:4},{id:'sandstone-skin',turns:3}]
 expect(incomingDamage(s,20,'physical')).toBe(12)
 expect(incomingDamage(s,20,'magic',0,2)).toBe(12)
 expect(basicAttackEvasion(s,'physical')).toBe(0)
 s=cast(s,'lapis-veil').state
 expect(s.combat?.spellEffects?.filter(e=>e.id==='lapis-veil')).toEqual([{id:'lapis-veil',turns:3}])
 s.combat!.spellEffects=[]
 expect(incomingDamage(s,20,'physical')).toBe(16)
 expect(incomingDamage(s,20,'magic',0,0)).toBe(15)
})
it('separates beneficial spell badges from ailments with their icons and remaining turns',()=>{
 const s=fight();s.combat!.spellEffects=[{id:'lapis-veil',turns:3},{id:'sandstone-skin',turns:2}]
 s.playerEffects=[{kind:'bleed',amount:2,turns:2}]
 render(<PlayerAilments state={s}/>)
 const buffs=screen.getByRole('region',{name:'버프'}),ailments=screen.getByRole('region',{name:'상태이상'})
 expect(within(buffs).getByText('청금석의 장막')).toBeTruthy()
 expect(within(buffs).getByText('3턴')).toBeTruthy()
 expect(buffs.querySelector('img')?.getAttribute('src')).toContain('lapis-veil.svg')
 expect(within(ailments).getByText('출혈')).toBeTruthy()
 expect(within(ailments).getByText('회피 감소')).toBeTruthy()
 expect(within(ailments).queryByText('청금석의 장막')).toBeNull()
})
