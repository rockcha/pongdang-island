import {cleanup,render,screen,fireEvent,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {IslandPreviewPage as MyIslandPage} from '@/features/my-island/my-island-page'
import {defaultState,facilityFor} from '@/features/my-island/island-model'
import {buyIslandBatch} from '@/features/my-island/island-purchase'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'quantity'}}})}))
beforeEach(()=>vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}}))
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals()})
it('buys the exact quantity atomically and obeys coins and inventory limits',()=>{
 const state=defaultState();let seq=0
 const ids=(type:string)=>`${type}~${seq++}`
 const land=buyIslandBatch(state,{kind:'land'},10,ids)!
 expect(land.landStock).toBe(state.landStock+10);expect(land.coins).toBe(state.coins-500)
 const floor=buyIslandBatch(state,{kind:'floor',type:'brick'},5,ids)!
 expect(floor.tileStock.brick).toBe(5);expect(floor.coins).toBe(state.coins-100)
 const items=buyIslandBatch(state,{kind:'item',type:'wood-fence'},5,ids)!
 expect(items.owned.length).toBe(state.owned.length+5);expect(items.coins).toBe(state.coins-facilityFor('wood-fence')!.price*5)
 expect(buyIslandBatch({...state,coins:50},{kind:'land'},5,ids)).toBeNull()
 expect(buyIslandBatch({...state,landStock:9999},{kind:'land'},5,ids)).toBeNull()
 expect(buyIslandBatch({...state,tileStock:{brick:9999}},{kind:'floor',type:'brick'},5,ids)).toBeNull()
 expect(buyIslandBatch({...state,owned:Array.from({length:299},(_,i)=>'wood-fence~'+i)},{kind:'item',type:'wood-fence'},5,ids)).toBeNull()
 expect(state).toEqual(defaultState())
})
it('selects one bulk quantity for land, floors and decorations and undoes a purchase once',()=>{
 const key='pongdang:island:v2:quantity',saved=()=>JSON.parse(localStorage.getItem(key)!)
 render(<MemoryRouter><MyIslandPage/></MemoryRouter>)
 const before=saved()
 fireEvent.click(screen.getByRole('button',{name:'상점',exact:true}))
 fireEvent.change(screen.getByRole('spinbutton',{name:'구매 수량'}),{target:{value:'7'}})
 expect(screen.getByRole('button',{name:'7개 구매 350'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'5개씩 구매'}))
 const article=(name:string)=>screen.getByRole('heading',{name,exact:true}).closest('article')!
 expect(article('땅 조각').querySelector('img[src="/currency/gold-coin-starfish.png"]')).toBeTruthy()
 fireEvent.click(within(article('땅 조각')).getByRole('button',{name:'5개 구매 250'}))
 expect(saved().landStock).toBe(before.landStock+5)
 fireEvent.click(within(article('벽돌길')).getByRole('button',{name:/5개 구매/}))
 expect(saved().tileStock.brick).toBe(5)
 const owned=saved().owned.length
 fireEvent.click(within(article('나무 울타리')).getByRole('button',{name:/5개 구매/}))
 expect(saved().owned.length).toBe(owned+5)
 fireEvent.click(screen.getByRole('button',{name:'패널 닫기'}))
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}))
 expect(saved().owned.length).toBe(owned)
 expect(saved().landStock).toBe(before.landStock+5);expect(saved().tileStock.brick).toBe(5)
})
