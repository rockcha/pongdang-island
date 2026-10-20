import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {BaitShop} from '@/features/fishing/bait-shop'
const mock=vi.hoisted(()=>({transact:vi.fn().mockResolvedValue(undefined)}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:1000,inventory:{}},transact:mock.transact,batchEffects:async(work:()=>Promise<void>)=>work(),loading:false,busy:false,error:''})}))
vi.mock('@/features/fishing/api',()=>({loadFishing:async()=>({baits:[{id:'bait',name:'테스트 미끼',description:'미끼',image_path:'/bait.png',price:10,effect_description:'효과'}]})}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('lets users erase one and type thirty without restoring one mid-edit',async()=>{
 render(<BaitShop/>);fireEvent.click(await screen.findByRole('button',{name:'테스트 미끼 상세 보기'}))
 const input=screen.getByRole('spinbutton',{name:'구매 수량'}) as HTMLInputElement
 fireEvent.change(input,{target:{value:''}});expect(input.value).toBe('')
 expect(screen.getByRole('button',{name:'테스트 미끼 0개 구매'})).toHaveProperty('disabled',true)
 fireEvent.change(input,{target:{value:'30'}});expect(input.value).toBe('30')
 fireEvent.click(screen.getByRole('button',{name:'테스트 미끼 30개 구매'}))
 await waitFor(()=>expect(mock.transact).toHaveBeenCalledTimes(30))
})
it('restores the minimum only when an empty field loses focus',async()=>{
 render(<BaitShop/>);fireEvent.click(await screen.findByRole('button',{name:'테스트 미끼 상세 보기'}))
 const input=screen.getByRole('spinbutton',{name:'구매 수량'}) as HTMLInputElement
 fireEvent.change(input,{target:{value:''}});fireEvent.blur(input);expect(input.value).toBe('1')
})
