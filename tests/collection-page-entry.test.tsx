import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {CollectionPage} from '@/features/collection/collection-page'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'test'}}})}))
vi.mock('@/features/collection/collection-dialog',()=>({CollectionBook:({initialTab,mode}:{initialTab?:string;mode:string})=><div data-testid="book" data-tab={initialTab} data-mode={mode}/>}))
afterEach(cleanup)
it('opens the relic tab from the relic inventory link and ignores it for creature books',()=>{
 const view=render(<MemoryRouter initialEntries={['/item-collection?tab=relic']}><CollectionPage items/></MemoryRouter>)
 expect(screen.getByTestId('book').dataset.tab).toBe('relic')
 view.unmount()
 render(<MemoryRouter initialEntries={['/collection?tab=relic']}><CollectionPage/></MemoryRouter>)
 expect(screen.getByTestId('book').dataset.tab).toBeUndefined()
})
