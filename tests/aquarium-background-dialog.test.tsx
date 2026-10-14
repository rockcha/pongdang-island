import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { AquariumBackgroundDialog } from '../src/features/aquarium/aquarium-background-dialog'
import type { AquariumState } from '../src/features/aquarium/api'
vi.mock('@/features/aquarium/api',()=>({backgroundUrl:(path:string)=>`/backgrounds/${path}`}))
afterEach(cleanup)
it('opens the background modal and preserves owned application and purchase limits',async()=>{
 const onAct=vi.fn(async()=>{})
 const state={owned:['coral'],catalog:[{id:'default',name:'기본',price:0,image_path:'default.png'},{id:'coral',name:'산호',price:50,image_path:'coral.png'},{id:'night',name:'밤',price:500,image_path:'night.png'}]} as AquariumState
 render(<AquariumBackgroundDialog state={state} selectedId="default" gold={100} busy={false} loading={false} error={false} onAct={onAct}/> )
 fireEvent.click(screen.getByRole('button',{name:'배경',exact:true}))
 expect(await screen.findByRole('dialog')).toBeTruthy()
 expect((screen.getByRole('button',{name:'적용 중'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.queryByRole('button',{name:'500 구매'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'적용하기'}))
 expect(onAct).toHaveBeenCalledWith('coral',true)
 fireEvent.click(screen.getByRole('tab',{name:'구매'}))
 expect((screen.getByRole('button',{name:'500 구매'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.queryByRole('button',{name:'적용하기'})).toBeNull()
})
