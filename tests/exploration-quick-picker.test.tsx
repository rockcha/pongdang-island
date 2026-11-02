import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {ScorpionRoom} from '@/features/exploration/scorpion-room'
import {newLocalGrowthModel} from '@/features/exploration/local-growth-model'
import {startScorpionCombat} from '@/features/exploration/combat-state'
import {mkdirSync,writeFileSync} from 'node:fs'

vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
beforeEach(()=>vi.stubGlobal('matchMedia',()=>({matches:true})))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
function setup({hp=70,mp=20,health=2,mana=1}={}){
 const state=startScorpionCombat({...newLocalGrowthModel(()=>0).state,hp,mp,potions:{health,mana}})
 state.combat!.turn=1
 const onAction=vi.fn(),props={state,busy:false,feedback:null,latestLog:'전투 중입니다.',speaker:'탐험',onAction,onDescend:vi.fn(),onReturnToMain:vi.fn()}
 const view=render(<div className="exploration-game is-verified"><ScorpionRoom {...props}/></div>)
 return {view,props,onAction}
}
function capture(name:string){if(process.env.QUICK_PICKER_PREVIEW==='1'){mkdirSync('artifacts',{recursive:true});writeFileSync(`artifacts/exploration-quick-${name}.html`,'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>'+document.body.outerHTML+'</html>')}}
it('opens above the magic button without a modal backdrop and casts in one choice',async()=>{
 const {onAction}=setup()
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 const popup=await screen.findByRole('dialog',{name:'마법 시전'})
 expect(document.querySelector('.exploration-modal')).toBeNull();expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeNull()
 expect(popup.getAttribute('aria-modal')).not.toBe('true')
 expect(screen.getByRole('button',{name:'공격',exact:true})).toHaveProperty('disabled',false)
 expect(onAction).not.toHaveBeenCalled()
 capture('magic')
 fireEvent.click(within(popup).getByRole('button',{name:'마력탄 · MP 5 시전'}))
 expect(onAction).toHaveBeenCalledExactlyOnceWith({type:'magic',id:'mana-bolt'})
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'마법 시전'})).toBeNull())
})
it('shows potion counts and capped recovery and uses one potion immediately',async()=>{
 const {onAction}=setup({hp:85})
 fireEvent.click(screen.getByRole('button',{name:'포션 마시기'}))
 const popup=await screen.findByRole('dialog',{name:'포션 마시기'})
 expect(within(popup).getByText('체력 85 → 100 · +15 회복')).toBeTruthy()
 expect(within(popup).getByText('×2')).toBeTruthy()
 capture('potion')
 fireEvent.click(within(popup).getByRole('button',{name:'체력 포션 마시기'}))
 expect(onAction).toHaveBeenCalledExactlyOnceWith({type:'potion',kind:'health'})
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('switches between pickers and closes on the same trigger or Escape without a turn',async()=>{
 const {onAction}=setup()
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 await screen.findByRole('dialog',{name:'마법 시전'})
 fireEvent.click(screen.getByRole('button',{name:'포션 마시기'}))
 await screen.findByRole('dialog',{name:'포션 마시기'})
 expect(screen.queryByRole('dialog',{name:'마법 시전'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'포션 마시기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 const popup=await screen.findByRole('dialog',{name:'마법 시전'})
 const leave=vi.fn();document.addEventListener('keydown',leave)
 try{fireEvent.keyDown(popup,{key:'Escape'});expect(leave).not.toHaveBeenCalled()}finally{document.removeEventListener('keydown',leave)}
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(onAction).not.toHaveBeenCalled()
})
it('blocks unaffordable magic and empty or full-resource potions and closes when combat becomes busy',async()=>{
 const {view,props,onAction}=setup({hp:100,mp:0,health:1,mana:0})
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 const magic=await screen.findByRole('dialog',{name:'마법 시전'})
 const spell=within(magic).getByRole('button',{name:'마력탄 · MP 5 시전'})
 expect(spell).toHaveProperty('disabled',true);fireEvent.click(spell);expect(onAction).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'포션 마시기'}))
 const potions=await screen.findByRole('dialog',{name:'포션 마시기'})
 for(const label of ['체력 포션 마시기','마나 포션 마시기'])expect(within(potions).getByRole('button',{name:label})).toHaveProperty('disabled',true)
 view.rerender(<div className="exploration-game is-verified"><ScorpionRoom {...props} busy/></div>)
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(screen.getByRole('button',{name:'마법',exact:true})).toHaveProperty('disabled',true)
})
it('dismisses on an outside press without using a turn',async()=>{
 const {onAction}=setup()
 fireEvent.click(screen.getByRole('button',{name:'마법',exact:true}))
 await screen.findByRole('dialog',{name:'마법 시전'})
 fireEvent.mouseDown(document.body);fireEvent.mouseUp(document.body);fireEvent.click(document.body)
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(onAction).not.toHaveBeenCalled()
})
