import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { AquariumBackgroundDialog } from '../src/features/aquarium/aquarium-background-dialog'
import type { AquariumState } from '../src/features/aquarium/api'
vi.mock('@/features/aquarium/api',()=>({backgroundUrl:(path:string)=>`/backgrounds/${path}`}))
afterEach(cleanup)
it('requires purchase confirmation, supports cancellation and prevents duplicate purchases',async()=>{
 let finish!:()=>void
 const onAct=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve}))
 const state={owned:[],catalog:[{id:'night',name:'달밤',price:500,image_path:'night.png'}]} as AquariumState
 render(<AquariumBackgroundDialog state={state} selectedId="default" gold={1000} busy={false} loading={false} error={false} onAct={onAct}/>)
 fireEvent.click(screen.getByRole('button',{name:'배경 바꾸기',exact:true}))
 fireEvent.click(await screen.findByRole('tab',{name:'구매'}))
 fireEvent.click(screen.getByRole('button',{name:'500 구매'}))
 let guard=await screen.findByRole('alertdialog')
 expect(within(guard).getByText('구매하시겠습니까?')).toBeTruthy()
 expect(within(guard).getByText('달밤 배경을 500골드에 구매합니다.')).toBeTruthy()
 expect(onAct).not.toHaveBeenCalled()
 fireEvent.click(within(guard).getByRole('button',{name:'취소'}))
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(onAct).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'500 구매'}))
 guard=await screen.findByRole('alertdialog')
 const confirm=within(guard).getByRole('button',{name:'구매하기'})
 fireEvent.click(confirm);fireEvent.click(confirm)
 expect(onAct).toHaveBeenCalledTimes(1)
 expect(onAct).toHaveBeenCalledWith('night',false)
 finish()
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(screen.getByRole('dialog')).toBeTruthy()
})
it('rechecks current gold before allowing a confirmed purchase',async()=>{
 const onAct=vi.fn(async()=>{})
 const props={state:{owned:[],catalog:[{id:'night',name:'달밤',price:500,image_path:'night.png'}]} as AquariumState,selectedId:'default',busy:false,loading:false,error:false,onAct}
 const view=render(<AquariumBackgroundDialog {...props} gold={1000}/>)
 fireEvent.click(screen.getByRole('button',{name:'배경 바꾸기',exact:true}))
 fireEvent.click(await screen.findByRole('tab',{name:'구매'}))
 fireEvent.click(screen.getByRole('button',{name:'500 구매'}))
 await screen.findByRole('alertdialog')
 view.rerender(<AquariumBackgroundDialog {...props} gold={100}/>)
 const confirm=within(screen.getByRole('alertdialog')).getByRole('button',{name:'구매하기'}) as HTMLButtonElement
 expect(confirm.disabled).toBe(true)
 fireEvent.click(confirm)
 expect(onAct).not.toHaveBeenCalled()
})
it('filters owned and purchasable themes by visual tier and explains empty results',async()=>{
 const state={owned:['mood-owned'],catalog:[
  {id:'default',name:'단순 배경',price:0,image_path:'default.png',tier:'simple'},
  {id:'mood-owned',name:'자연 배경',price:400,image_path:'mood.png',tier:'mood'},
  {id:'special-shop',name:'공간 배경',price:500,image_path:'special.png',tier:'special'},
 ]} as AquariumState
 render(<AquariumBackgroundDialog state={state} selectedId="default" gold={1000} busy={false} loading={false} error={false} onAct={vi.fn(async()=>{})}/>)
 fireEvent.click(screen.getByRole('button',{name:'배경 바꾸기',exact:true}))
 fireEvent.click(await screen.findByRole('button',{name:'감성 1'}))
 expect(screen.getByRole('img',{name:'자연 배경'})).toBeTruthy()
 expect(screen.queryByRole('img',{name:'단순 배경'})).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'구매'}))
 expect(screen.getByText('이 등급에 해당하는 배경이 없어요.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'스페셜 1'}))
 expect(screen.getByRole('img',{name:'공간 배경'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'500 구매'})).toBeTruthy()
})
it('shows stable skeletons for the catalog and allows failed previews to retry',async()=>{
 const props={selectedId:'default',gold:0,busy:false,loading:true,error:false,onAct:vi.fn(async()=>{})}
 const view=render(<AquariumBackgroundDialog {...props} state={{owned:[],catalog:[]} as unknown as AquariumState}/> )
 fireEvent.click(screen.getByRole('button',{name:'배경 바꾸기',exact:true}))
 expect(await screen.findByRole('status',{name:'배경 목록을 불러오는 중'})).toBeTruthy()
 view.rerender(<AquariumBackgroundDialog {...props} loading={false} state={{owned:[],catalog:[{id:'default',name:'기본',price:0,image_path:'default.png'}]} as AquariumState}/> )
 const image=screen.getByRole('img',{name:'기본'})
 expect(image.className).toContain('opacity-0')
 fireEvent.error(image)
 fireEvent.click(screen.getByRole('button',{name:'다시 시도'}))
 fireEvent.load(screen.getByRole('img',{name:'기본'}))
 expect(screen.getByRole('img',{name:'기본'}).className).toContain('opacity-100')
})
it('opens the background modal and preserves owned application and purchase limits',async()=>{
 const onAct=vi.fn(async()=>{})
 const state={owned:['coral'],catalog:[{id:'default',name:'기본',price:0,image_path:'default.png'},{id:'coral',name:'산호',price:50,image_path:'coral.png'},{id:'night',name:'밤',price:500,image_path:'night.png'}]} as AquariumState
 render(<AquariumBackgroundDialog state={state} selectedId="default" gold={100} busy={false} loading={false} error={false} onAct={onAct}/> )
 fireEvent.click(screen.getByRole('button',{name:'배경 바꾸기',exact:true}))
 expect(await screen.findByRole('dialog')).toBeTruthy()
 expect((screen.getByRole('button',{name:'적용 중'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.queryByRole('button',{name:'500 구매'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'적용하기'}))
 expect(onAct).toHaveBeenCalledWith('coral',true)
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 fireEvent.click(screen.getByRole('button',{name:'배경 바꾸기',exact:true}))
 fireEvent.click(screen.getByRole('tab',{name:'구매'}))
 expect((screen.getByRole('button',{name:'500 구매'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.queryByRole('button',{name:'적용하기'})).toBeNull()
})
it('keeps the background sheet open when applying fails',async()=>{
 const state={owned:['coral'],catalog:[{id:'coral',name:'산호',price:100,image_path:'coral.png'}]} as AquariumState
 render(<AquariumBackgroundDialog state={state} selectedId="default" gold={100} busy={false} loading={false} error={false} onAct={vi.fn().mockRejectedValue(new Error('offline'))}/>)
 fireEvent.click(screen.getByRole('button',{name:'배경 바꾸기',exact:true}))
 fireEvent.click(await screen.findByRole('button',{name:'적용하기'}))
 expect(await screen.findByRole('alert')).toBeTruthy()
 expect(screen.getByRole('dialog')).toBeTruthy()
})
