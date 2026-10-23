import {StrictMode} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter,useLocation} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {PlayerLevel,PlayerLevelsProvider} from '@/features/experience/player-level'
import {PlayerIdentityLink} from '@/features/profile/player-identity-link'
import {PlayerAvatar} from '@/features/profile/player-avatar'
const api=vi.hoisted(()=>({loadPlayerLevels:vi.fn()}))
vi.mock('@/features/experience/api',()=>api)
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('batches all visible identities, deduplicates users and survives StrictMode replay',async()=>{
 api.loadPlayerLevels.mockResolvedValue([{userId:'one',level:42},{userId:'two',level:1}])
 render(<StrictMode><PlayerLevelsProvider><PlayerLevel userId="one"/><PlayerLevel userId="one"/><PlayerLevel userId="two"/></PlayerLevelsProvider></StrictMode>)
 await screen.findByRole('button',{name:'레벨 1'})
 expect(screen.getAllByRole('button',{name:'레벨 42'})).toHaveLength(2)
 expect(api.loadPlayerLevels).toHaveBeenCalledOnce()
 expect(api.loadPlayerLevels.mock.calls[0][0].sort()).toEqual(['one','two'])
})
it('opens the badge independently of a stretched navigation link',async()=>{
 api.loadPlayerLevels.mockResolvedValue([{userId:'one',level:42}])
 function Location(){return <output>{useLocation().pathname}</output>}
 render(<MemoryRouter><Location/><PlayerLevelsProvider><PlayerIdentityLink to="/exchange/detail" label="판매글"><PlayerLevel userId="one"/>판매자</PlayerIdentityLink></PlayerLevelsProvider></MemoryRouter>)
 const button=await screen.findByRole('button',{name:'레벨 42'})
 expect(screen.getByRole('link',{name:'판매글'}).contains(button)).toBe(false)
 fireEvent.click(button)
 expect(await screen.findByRole('dialog',{name:'Lv.42'})).toBeTruthy()
 expect(screen.getByRole('status').textContent).toBe('/')
})
it('ignores an old account response after the provider remounts',async()=>{
 let resolve:(value:unknown)=>void=()=>{}
 api.loadPlayerLevels.mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValue([{userId:'two',level:1}])
 const view=render(<PlayerLevelsProvider key="first"><PlayerLevel userId="one"/></PlayerLevelsProvider>)
 await waitFor(()=>expect(api.loadPlayerLevels).toHaveBeenCalledOnce())
 view.rerender(<PlayerLevelsProvider key="second"><PlayerLevel userId="two"/></PlayerLevelsProvider>)
 await screen.findByRole('button',{name:'레벨 1'})
 await act(async()=>resolve([{userId:'one',level:100}]))
 expect(screen.queryByRole('button',{name:'레벨 100'})).toBeNull()
})
it('keeps links available after lookup failure and retries on focus',async()=>{
 api.loadPlayerLevels.mockRejectedValueOnce(Error('offline')).mockResolvedValue([{userId:'one',level:10}])
 render(<MemoryRouter><PlayerLevelsProvider><PlayerIdentityLink to="/exchange/detail" label="판매글"><PlayerLevel userId="one"/>판매자</PlayerIdentityLink></PlayerLevelsProvider></MemoryRouter>)
 await waitFor(()=>expect(api.loadPlayerLevels).toHaveBeenCalledOnce())
 expect(screen.getByRole('link',{name:'판매글'})).toBeTruthy()
 fireEvent.focus(window)
 await screen.findByRole('button',{name:'레벨 10'})
})

it('anchors the clickable insignia to the avatar top right instead of the name',async()=>{
 api.loadPlayerLevels.mockResolvedValue([{userId:'one',level:42}])
 render(<PlayerLevelsProvider><PlayerAvatar userId="one" nickname="판매자" className="size-9"/></PlayerLevelsProvider>)
 const badge=await screen.findByRole('button',{name:'레벨 42'})
 expect(badge.parentElement?.className).toContain('absolute -right-1 -top-1')
 expect(badge.parentElement?.parentElement?.className).toContain('relative inline-flex')
 fireEvent.click(badge)
 expect(await screen.findByRole('dialog',{name:'Lv.42'})).toBeTruthy()
})
