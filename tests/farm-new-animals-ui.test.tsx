import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it.each([
 {name:'오리',house:'가금사 (10,9)',price:'500',product:'오리알',workshop:'작은 빵집 (18,9)',recipe:'에그타르트'},
 {name:'양',house:'축사 (15,6)',price:'600',product:'양털',workshop:'유제품 공방 (14,13)',recipe:'염소치즈'},
])('buys $name from its house, previews its unlocks, places it and collects the matching product',({name,house,price,product,workshop,recipe})=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click(workshop);expect(screen.queryByRole('button',{name:`${recipe} 선택`})).toBeNull();click('Close')
 click(house);click(`${name} 선택`)
 expect(screen.getByLabelText(`${name} 1회 생산 시간 10초`)).toBeTruthy()
 expect(screen.getByRole('region',{name:'생산 가능한 상품'}).textContent).toContain(product)
 expect(screen.queryByText(recipe)).toBeNull()
 click(`${name} 구매 · ${price} G`)
 expect(screen.queryByRole('dialog')).toBeNull()
 click(house);expect(screen.getByLabelText('사육 정원 3 / 4마리 · 보관·준비 중 포함')).toBeTruthy();click('Close')
 act(()=>vi.advanceTimersByTime(10000));click(`${name} 보관함으로 받기`)
 expect(screen.getByRole('status').textContent).toContain(`${name} ×1`)
 click('보관함');click('동물');click(`${name} 보관 1개 배치하기`)
 fireEvent.click(document.querySelector('[data-farm-cell="7,7"]')!);click('완료')
 click(`${name} 생산 시작`);act(()=>vi.advanceTimersByTime(10000));click(`${product} 생산 (7,7)`)
 expect(screen.getByRole('status').textContent).toContain(`${product} ×1`)
 if(name==='양'){click(workshop);expect(screen.queryByRole('button',{name:`${recipe} 선택`})).toBeNull();return}
 click(workshop);click(`${recipe} 선택`)
 expect(screen.getByRole('article',{name:`${recipe} 제작법`})).toBeTruthy()
 expect(screen.getByRole('button',{name:`${recipe} 만들기`})).toHaveProperty('disabled',true)
})
