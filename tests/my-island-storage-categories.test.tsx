import {cleanup,render,screen,fireEvent,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {IslandPreviewPage as MyIslandPage} from '@/features/my-island/my-island-page'
import {defaultState} from '@/features/my-island/island-model'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'storage-categories'}}})}))
beforeEach(()=>vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}}))
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals()})
it('shows land after tiles, counts only stored items and uses placement illustrations',()=>{
 localStorage.setItem('pongdang:island:v2:storage-categories',JSON.stringify({...defaultState(),owned:['wood-fence~stored','wood-fence~placed','wood-bridge-3~stored'],layout:[{id:'wood-fence~placed',x:8,y:8}],tileStock:{grass:3},landStock:12}))
 render(<MemoryRouter><MyIslandPage/></MemoryRouter>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'섬 꾸미기 도구'})).getByRole('button',{name:/^보관함/}))
 const panel=screen.getByRole('complementary',{name:'시설 보관함'})
 const categories=within(panel).getByRole('group',{name:'보관함 분류'})
 expect(within(categories).getAllByRole('button').map(b=>b.textContent)).toEqual(['건물','장식','타일','땅'])
 expect(within(panel).queryByText(/배치됨/)).toBeNull()
 expect(within(panel).queryByText(/보관 중/)).toBeNull()
 fireEvent.click(within(categories).getByRole('button',{name:'장식',exact:true}))
 const fence=within(panel).getByRole('heading',{name:'나무 울타리'}).closest('article')!
 expect(fence.querySelector('.island-count')?.textContent).toBe('1')
 expect(within(fence).getByRole('img',{name:'땅에 배치'})).toBeTruthy()
 const bridge=within(panel).getByRole('heading',{name:'긴 나무다리'}).closest('article')!
 expect(within(bridge).getByRole('img',{name:'바다에 배치'})).toBeTruthy()
 fireEvent.click(within(categories).getByRole('button',{name:'타일',exact:true}))
 expect(within(panel).getByRole('heading',{name:'잔디 타일'})).toBeTruthy()
 expect(panel.querySelector('.island-count')?.textContent).toBe('3')
 expect(within(panel).queryByText(/바닥 전용|지형 변화 없음/)).toBeNull()
 expect(within(panel).getByRole('img',{name:'땅에 배치'})).toBeTruthy()
 expect(within(panel).queryByRole('heading',{name:'땅 조각'})).toBeNull()
})
