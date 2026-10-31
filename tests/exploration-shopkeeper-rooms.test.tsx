import {writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import {shopkeepers} from '@/features/exploration/shopkeepers'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
it.each(shopkeepers)('selects $name and opens their tier-specific shop',async profile=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.spyOn(Math,'random').mockReturnValue(0);vi.useFakeTimers()
 render(<ExplorationGame nickname="퐁이" onLeave={()=>{}}/>);await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 fireEvent.change(screen.getByLabelText('1번 문 방 유형'),{target:{value:profile.roomId}})
 fireEvent.click(document.querySelector('.exploration-choice')!);fireEvent.click(document.querySelector('.exploration-preview-enter')!);await act(async()=>{await vi.advanceTimersByTimeAsync(100)})
 expect(screen.getByRole('heading',{name:new RegExp(profile.name)})).toBeTruthy()
 expect(document.querySelector('.exploration-scene')?.getAttribute('style')).toContain(profile.background)
 expect(screen.getByRole('img',{name:profile.name}).getAttribute('src')).toBe(profile.portrait)
 if(process.env.SHOP_LAYOUT_QA)capture(profile.id)
 fireEvent.click(screen.getByRole('button',{name:profile.kind==='magic'?'마법을 살펴본다':'구매한다'}))
 const dialog=screen.getByRole('dialog');expect(within(dialog).getAllByRole('heading',{level:4})).toHaveLength(3)
 expect(within(dialog).getByRole('heading',{name:new RegExp(profile.shopName)})).toBeTruthy()
 if(process.env.SHOP_LAYOUT_QA){
  capture(profile.id+'-shop')
  if(profile.kind!=='magic'){
   fireEvent.click(within(dialog).getByRole('button',{name:'포션',exact:true}))
   capture(profile.id+'-potions')
   fireEvent.click(within(dialog).getByRole('button',{name:'무기',exact:true}))
  }
  fireEvent.click(within(dialog).getAllByRole('button',{name:profile.kind==='magic'?'배우기':'구매',exact:true})[0])
  await act(async()=>{await vi.advanceTimersByTimeAsync(30)})
  expect(screen.getByRole('status',{name:'구매 알림'}).textContent).toContain('구매 완료')
  capture(profile.id+'-purchase')
 }
})
function capture(id:string){
 const root=process.cwd().replaceAll('\\','/')
 const css=readFileSync('dist/assets/'+readdirSync('dist/assets').find(x=>/^index-.*\.css$/.test(x)),'utf8')+readFileSync('src/features/exploration/exploration.css','utf8')+readFileSync('src/features/exploration/exploration-hud.css','utf8')
 const html=document.body.innerHTML.replaceAll('data-starting-style=""','').replaceAll('http://localhost:3000','').replaceAll('/src/features/exploration/assets/',`file:///${root}/src/features/exploration/assets/`).replace(/([="(;])\/exploration\//g,`$1file:///${root}/public/exploration/`)
 writeFileSync(`artifacts/shopkeeper-${id}.html`,`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}*,*::before,*::after{animation:none!important;transition:none!important}body{margin:0}</style>${html}`)
}
