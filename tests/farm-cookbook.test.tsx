import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {FarmCookbook} from '@/features/farm/cookbook'
import {initialTopview} from '@/features/farm/topview-model'
afterEach(cleanup)
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('links an owned kitchen to its facility and an unowned bakery to purchase',()=>{
 const onNavigate=vi.fn()
 render(<FarmCookbook state={initialTopview()} onClose={()=>{}} onNavigate={onNavigate}/>)
 click('통밀죽 제작법');click('작은 주방 이동하기')
 expect(onNavigate).toHaveBeenLastCalledWith('kitchen')
 click('요리 목록');click('쿠키 제작법');click('작은 빵집 구매하기')
 expect(onNavigate).toHaveBeenLastCalledWith('bakery')
})
it('follows food through processing to a crop and returns to the parent recipe',()=>{
 render(<FarmCookbook state={initialTopview()} onClose={()=>{}}/>)
 click('쿠키 제작법');click('밀가루 획득 방법')
 expect(screen.getByText('제분소에서 가공')).toBeTruthy()
 click('밀 획득 방법');expect(screen.getByText('밭에서 재배')).toBeTruthy()
 click('밀가루');expect(screen.getByText('제분소에서 가공')).toBeTruthy()
 click('전체 요리');expect(screen.getByRole('textbox',{name:'요리 이름 검색'})).toBeTruthy()
})
it('shows animal sources, meat consumption, and locked crop research',()=>{
 render(<FarmCookbook state={initialTopview()} onClose={()=>{}}/>)
 click('꿀우유 제작법');click('우유 획득 방법')
 expect(screen.getByText('동물에게서 획득')).toBeTruthy()
 click('전체 요리');click('닭고기수프 제작법');click('닭고기 획득 방법')
 expect(screen.getByText(/사용한 동물은 소모됩니다/)).toBeTruthy()
 click('전체 요리');click('토마토 샐러드 제작법');click('토마토 획득 방법')
 expect(screen.getByText(/연구 3시간/)).toBeTruthy()
})
it('filters completed foods and offers an empty result state',()=>{
 render(<FarmCookbook state={initialTopview()} onClose={()=>{}}/>)
 fireEvent.change(screen.getByRole('textbox',{name:'요리 이름 검색'}),{target:{value:'없는요리'}})
 expect(screen.getByText('검색한 요리가 없어요.')).toBeTruthy()
})
