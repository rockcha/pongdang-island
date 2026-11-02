import {StrictMode} from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {monsterPreludeLines,ScorpionRoom} from '@/features/exploration/scorpion-room'
import {newPractice,practiceSpells} from '@/features/exploration/practice-state'
import {startMonsterCombat} from '@/features/exploration/combat-state'

afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
function setup(intro=false){
 const state=startMonsterCombat({...newPractice(),hp:50,potions:{health:2,mana:2},spells:practiceSpells,equippedSpells:['tide']},'sand-scorpion'),onAction=vi.fn()
 if(!intro)state.combat!.turn=1
 const props={state,busy:true,feedback:null,latestLog:'전투 중',speaker:'탐험',onAction,onDescend:vi.fn(),onReturnToMain:vi.fn()}
 const view=render(<StrictMode><ScorpionRoom {...props}/></StrictMode>)
 return {state,onAction,update:(patch:Partial<typeof props>)=>view.rerender(<StrictMode><ScorpionRoom {...props} {...patch}/></StrictMode>)}
}
it('keeps the shield aura only while the living enemy has absorb capacity',()=>{
 const {state,update}=setup()
 const shielded={...state,combat:{...state.combat!,pattern:{shieldHp:40,shieldTurns:3}}}
 update({state:shielded})
 expect(document.querySelector('.combat-enemy-shield')).toBeTruthy()
 expect(screen.getByRole('button',{name:'보호막 40'})).toBeTruthy()
 update({state:{...shielded,combat:{...shielded.combat,pattern:{shieldHp:0,shieldTurns:3}}}})
 expect(document.querySelector('.combat-enemy-shield')).toBeNull()
})
it('labels soul-knot survival without claiming that the lantern was used',()=>{
 const state=startMonsterCombat(newPractice(),'sand-scorpion');state.combat!.turn=1;state.hp=1
 render(<ScorpionRoom state={state} busy latestLog="영혼의 매듭으로 살아남았다." speaker="탐험" feedback={{id:1,phase:'reply',action:'magic',events:[{kind:'system',phase:'reply',spellId:'soul-knot',healing:1,text:'영혼의 매듭으로 살아남았다.'}]}} onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/> )
 expect(screen.getByText('영혼의 매듭 · 체력 1로 생존')).toBeTruthy()
 expect(screen.queryByText(/등불 부활/)).toBeNull()
})
it('ignores busy clicks and requires a fresh choice after the current action finishes',()=>{
 const {onAction,update}=setup()
 const attack=screen.getByRole('button',{name:'공격',exact:true})
 expect(attack).toHaveProperty('disabled',true)
 for(let i=0;i<10;i++)fireEvent.click(attack)
 expect(onAction).not.toHaveBeenCalled()
 update({busy:false});update({busy:false})
 expect(onAction).not.toHaveBeenCalled()
 expect(attack).toHaveProperty('disabled',false)
 fireEvent.click(attack)
 expect(onAction).toHaveBeenCalledExactlyOnceWith({type:'attack'})
})
it('disables every action while the current turn is being presented',()=>{
 const {onAction,update}=setup()
 for(const name of ['공격','마법','포션 마시기',/도망/]){
  const button=screen.getByRole('button',{name,exact:typeof name==='string'})
  expect(button).toHaveProperty('disabled',true);fireEvent.click(button)
 }
 expect(screen.queryByRole('dialog')).toBeNull()
 update({busy:false})
 expect(onAction).not.toHaveBeenCalled()
})
it('shows defeat immediately when the hit snapshot has zero enemy HP before the victory receipt',()=>{
 const {state,update}=setup()
 update({state:{...state,combat:{...state.combat!,enemyHp:0,status:'active'}}})
 expect(document.querySelector('.exploration-combat.is-victory')).toBeTruthy()
 expect(document.querySelector('.exploration-enemy-art.is-defeated')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'공격',exact:true})).toBeNull()
 expect(screen.getByLabelText('탐험 로그').textContent).not.toContain('전투 중')
})
it('shows the used skill name, attack category and bleeding effect during a monster reply',()=>{
 const state=startMonsterCombat(newPractice(),'golden-armored-crocodile')
 state.combat!.turn=1
 const event={kind:'monster' as const,phase:'reply' as const,source:'황금 갑주 악어',moveId:'gilded-fangs',attackType:'physical' as const,damage:19,text:'황금 송곳니! 19 피해를 받았습니다.'}
 render(<ScorpionRoom state={state} busy={true} feedback={{id:1,phase:'reply',action:'attack',events:[event]}} logEvent={event} latestLog={event.text} speaker="탐험" onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/>)
 const banner=document.querySelector('.combat-used-move')!
 expect(banner.getAttribute('aria-label')).toBe('스킬 · 황금 송곳니')
 expect(banner.textContent).toContain('황금 송곳니')
 expect(banner.textContent).toBe('황금 송곳니')
 expect(document.querySelector('.combat-used-move-name')?.textContent).toBe('황금 송곳니 · ')
})
it('never sends a delayed action after death',()=>{
 const {state,onAction,update}=setup()
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 update({busy:false,state:{...state,hp:0,combat:{...state.combat!,status:'lost'}}})
 expect(onAction).not.toHaveBeenCalled()
})
it('lets the player explicitly choose a spell or potion on their own turn',()=>{
 const {onAction,update}=setup();update({busy:false})
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:/시전$/}))
 expect(onAction).toHaveBeenLastCalledWith({type:'magic',id:'tide'})
 fireEvent.click(screen.getByRole('button',{name:'포션 마시기'}))
 fireEvent.click(screen.getByRole('button',{name:'체력 포션 마시기'}))
 expect(onAction).toHaveBeenLastCalledWith({type:'potion',kind:'health'})
})
it('waits for the final typed character and another full second before revealing the monster',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance']})
 vi.stubGlobal('matchMedia',()=>({matches:false}))
 vi.spyOn(Math,'random').mockReturnValue(0)
 setup(true)
 const typingMs=Math.ceil(Math.min(1100,Math.max(280,Array.from(monsterPreludeLines[0]).length*22))/16)*16
 await act(async()=>vi.advanceTimersByTimeAsync(typingMs-1))
 expect(document.querySelector('.is-encounter-prelude')).toBeTruthy()
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 await act(async()=>vi.advanceTimersByTimeAsync(999))
 expect(document.querySelector('.is-encounter-prelude')).toBeTruthy()
 await act(async()=>vi.advanceTimersByTimeAsync(1))
 expect(document.querySelector('.is-encounter-prelude')).toBeNull()
})
it('ignores clicks during the approach and waits for a new choice after the introduction',async()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 const {onAction,update}=setup(true);update({busy:false})
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 expect(screen.getByRole('button',{name:'공격',exact:true})).toHaveProperty('disabled',true)
 expect(onAction).not.toHaveBeenCalled()
 await act(async()=>vi.advanceTimersByTimeAsync(999));expect(onAction).not.toHaveBeenCalled()
 await act(async()=>vi.advanceTimersByTimeAsync(1));expect(onAction).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'공격',exact:true}))
 expect(onAction).toHaveBeenCalledExactlyOnceWith({type:'attack'})
})
