import {afterEach,expect,it} from 'vitest'
import {gameIsCovered} from '@/features/arcade/game-interaction'
afterEach(()=>document.body.replaceChildren())
it('blocks a collapsed game and other open dialogs, but ignores its own modal and hidden dialogs',()=>{
 document.body.innerHTML='<dialog open data-game-active="true"><div id="game"></div></dialog>'
 const host=document.getElementById('game')!
 expect(gameIsCovered(host)).toBe(false)
 host.closest('dialog')!.dataset.gameActive='false'
 expect(gameIsCovered(host)).toBe(true)
 host.closest('dialog')!.dataset.gameActive='true'
 const overlay=document.createElement('div');overlay.setAttribute('role','alertdialog');document.body.append(overlay)
 expect(gameIsCovered(host)).toBe(true)
 overlay.hidden=true
 expect(gameIsCovered(host)).toBe(false)
 overlay.hidden=false;overlay.setAttribute('data-closed','')
 expect(gameIsCovered(host)).toBe(false)
})
