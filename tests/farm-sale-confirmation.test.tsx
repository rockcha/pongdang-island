import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {topviewItems} from '@/features/farm/topview-model'
import {farmResalePrice} from '@/features/farm/resale'
import {playSaleSound} from '@/features/gold/purchase-sound'

vi.mock('@/features/gold/purchase-sound',()=>({playSaleSound:vi.fn(),playPurchaseSound:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
const setup=()=>render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
const balance=()=>document.querySelector('.top-farm-gold')!.textContent!.replace(/[^0-9]/g,'')

it('keeps the placed building and gold on cancel, then sells once after a Pongi confirmation',()=>{
 setup();const name=topviewItems.kitchen.name,object=document.querySelector('[data-object-id="28"]')!
 fireEvent.click(object);click(`${name} 건물 제거`)
 const dialog=screen.getByRole('alertdialog')
 expect(within(dialog).getByRole('heading',{name:`${name} 1개를 제거하시겠습니까?`})).toBeTruthy()
 expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/branding/confirm/pongi-sale.png')
 expect(balance()).toBe('15000');expect(document.querySelector('[data-object-id="28"]')).toBeTruthy()
 expect(playSaleSound).not.toHaveBeenCalled()
 click('취소')
 expect(screen.queryByRole('alertdialog')).toBeNull()
 expect(screen.getByRole('dialog')).toBeTruthy();expect(balance()).toBe('15000')
 click(`${name} 건물 제거`);click('제거하기')
 expect(screen.queryByRole('alertdialog')).toBeNull()
 expect(document.querySelector('[data-object-id="28"]')).toBeNull()
 expect(balance()).toBe(String(15000+farmResalePrice('kitchen')))
 expect(playSaleSound).toHaveBeenCalledTimes(1)
})

it('requires confirmation for stored copies and prevents duplicate confirmation from selling two',()=>{
 setup();const name=topviewItems.mill.name
 click('상점');fireEvent.change(screen.getByRole('spinbutton',{name:`${name} 구매 수량`}),{target:{value:'2'}})
 click(`${name} 2개 구매 · ${(topviewItems.mill.price*2).toLocaleString()} G`);click('Close');click('보관함')
 const original=Number(balance())
 click(`${name} 보관 개체 반값 판매`)
 expect(balance()).toBe(String(original));expect(playSaleSound).not.toHaveBeenCalled()
 click('취소');expect(screen.getByRole('button',{name:`${name} 보관 2개 배치하기`})).toBeTruthy()
 click(`${name} 보관 개체 반값 판매`)
 const confirm=screen.getByRole('button',{name:'제거하기',exact:true})
 act(()=>{fireEvent.click(confirm);fireEvent.click(confirm)})
 expect(balance()).toBe(String(original+farmResalePrice('mill')))
 expect(playSaleSound).toHaveBeenCalledTimes(1)
 click('보관함');expect(screen.getByRole('button',{name:`${name} 보관 1개 배치하기`})).toBeTruthy()
})
