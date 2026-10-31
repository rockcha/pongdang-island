import {writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {act,cleanup,fireEvent,render} from '@testing-library/react'
import {it,vi} from 'vitest'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import * as practice from '@/features/exploration/practice-state'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <img src="/branding/pongi.png" style={{width:28,height:28}}/>}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
it.skipIf(process.env.EXPLORATION_LAYOUT_QA!=='1')('captures layout for browser review',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(0);vi.useFakeTimers()
 const fresh=practice.grantPracticeSupplies(practice.newPractice(()=>0));vi.spyOn(practice,'newPractice').mockImplementation(()=>({...fresh,hp:79,mp:20,potions:{health:3,mana:2},equippedSpells:['ember','ripple']}))
 const root=process.cwd().replaceAll('\\','/')
 const css=readFileSync('dist/assets/'+readdirSync('dist/assets').find(x=>/^index-.*\.css$/.test(x)),'utf8')+readFileSync('src/features/exploration/exploration.css','utf8')+readFileSync('src/features/exploration/exploration-hud.css','utf8')
 for(const mode of ['doors','monster']){
  render(<ExplorationGame nickname="Pongi" onLeave={()=>{}}/>);await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
  if(mode==='monster'){fireEvent.change(document.querySelector('select')!,{target:{value:'monster'}});fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(document.querySelector('.exploration-preview-enter')!);for(let i=0;i<3;i++)await act(async()=>{await vi.advanceTimersByTimeAsync(100)})}
  else fireEvent.click(document.querySelectorAll('.exploration-choice')[1])
  await act(async()=>{await vi.advanceTimersByTimeAsync(6000)});
  let html=document.body.innerHTML.replaceAll('data-starting-style=""','').replaceAll('http://localhost:3000','').replaceAll('/src/features/exploration/assets/',`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`).replaceAll('/branding/',`file:///${root}/public/branding/`)
  writeFileSync(`artifacts/quickslots-${mode}-static.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`);cleanup()
 }
 vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()
})
