import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
function setup(){
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>),map=result.container.querySelector('.top-farm-map')!,viewport=result.container.querySelector('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:1120,bottom:960,width:1120,height:960,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,x:number,y:number,id=1)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x*40+100,clientY:y*40+100,button:0}),{pointerId:id,pointerType:'mouse'}))
 return {...result,pointer}
}
it('buys, selects, lays and recovers every decorative tile material',()=>{
 const {container,pointer}=setup();click('타일');click('구매하기')
 const materials=[{name:'징검돌 길',id:'stone',cost:100},{name:'나무 데크',id:'deck',cost:125},{name:'붉은 벽돌길',id:'brick',cost:125},{name:'밝은 모래길',id:'sand',cost:75},{name:'밝은 판석길',id:'flagstone',cost:150}]
 for(const {name,cost} of materials){
  click(name);click(`${name} 5개 구매 · ${cost} G`)
  expect(screen.getByRole('status').textContent).toContain(name)
 }
 click('Close')
 for(const [index,{name,id}] of materials.entries()){
  click('타일 깔기');click(`${name} 5개 선택`)
  pointer('pointerdown',7+index,7);pointer('pointerup',7+index,7)
  expect(container.querySelector(`[data-farm-cell="${7+index},7"] [data-farm-tile="${id}"]`)).toBeTruthy()
  expect(container.querySelector(`#farm-path-${id}`)).toBeTruthy()
 }
 click('타일 회수하기');pointer('pointerdown',7,7);pointer('pointermove',11,7);pointer('pointerup',11,7)
 click('타일 깔기')
 for(const {name} of materials)expect(screen.getByRole('button',{name:`${name} 5개 선택`})).toBeTruthy()
})
it('buys decorations in the three-category shop and keeps all storage counts in sync through placement and recovery',()=>{
 setup();click('상점')
 const shop=screen.getByRole('dialog',{name:'상점'})
 expect(within(screen.getByRole('navigation',{name:'상점 분류'})).getAllByRole('button').map(b=>b.textContent)).toEqual(['건물','장식','타일'])
 click('장식');fireEvent.click(within(shop).getByRole('button',{name:'울타리 구매 · 40 G'}));fireEvent.click(within(shop).getByRole('button',{name:'울타리 구매 · 40 G'}))
 expect(shop.querySelector('.farm-count-badge')).toBeNull()
 click('Close');click('보관함')
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByLabelText('전체 보관 2개')).toBeTruthy()
 click('장식');expect(screen.getByLabelText('장식 보관 2개')).toBeTruthy()
 click('울타리 보관 2개 배치하기');fireEvent.click(document.querySelector('[data-farm-cell="8,13"]')!)
 expect(screen.getByLabelText('전체 보관 1개')).toBeTruthy();expect(screen.getByLabelText('울타리 보관 1개')).toBeTruthy()
 click('완료');click('회수하기');click('울타리 (8,13)')
 expect(screen.getByLabelText('전체 보관 2개')).toBeTruthy()
})
it('selects tiles in a modal, drags placement and recovery, and ends the active tool with Done',()=>{
 const {container,pointer}=setup();click('타일');click('구매하기')
 expect(screen.getByRole('dialog',{name:'상점'})).toBeTruthy()
 click('흙길 5개 구매 · 50 G');click('Close');click('타일 깔기');click('흙길 5개 선택')
 expect(screen.queryByRole('dialog')).toBeNull()
 pointer('pointerdown',7,7);pointer('pointermove',9,7)
 expect(container.querySelectorAll('[data-tile-preview="place"]')).toHaveLength(3)
 pointer('pointerup',9,7)
 expect(container.querySelector('[data-farm-cell="8,7"] [data-farm-tile="dirt"]')).toBeTruthy()
 expect(within(screen.getByRole('navigation',{name:'농사 도구'})).getByLabelText('보유 타일 2개')).toBeTruthy()
 click('타일 회수하기');pointer('pointerdown',7,7);pointer('pointermove',9,7);pointer('pointerup',9,7)
 expect(container.querySelector('[data-farm-cell="8,7"] [data-farm-tile]')).toBeNull()
 expect(within(screen.getByRole('navigation',{name:'농사 도구'})).getByLabelText('보유 타일 5개')).toBeTruthy()
 click('완료');expect(screen.getByRole('button',{name:'타일',exact:true}).getAttribute('aria-expanded')).toBe('false')
})
it('turns off object editing when land tools open and still allows land recovery',()=>{
 setup();click('이동하기');click('젖소 (16,9)');click('땅 0칸 보유')
 expect(screen.getByRole('button',{name:'이동하기'}).getAttribute('aria-pressed')).toBe('false')
 expect(screen.queryByRole('group',{name:'젖소 편집 메뉴'})).toBeNull()
 click('땅 회수하기');click('땅 4,7 회수')
 expect(screen.getByRole('button',{name:'땅 1칸 보유'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'이동하기'}).getAttribute('aria-pressed')).toBe('false')
})
