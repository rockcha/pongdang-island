import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FirstDayFishingGuide} from '@/features/fishing/first-day-fishing-guide'
const user=vi.hoisted(()=>({id:'new-player',created_at:'2026-10-23T01:00:00Z'}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user}})}))
beforeEach(()=>{localStorage.clear();user.created_at='2026-10-23T01:00:00Z';vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-23T03:00:00Z'))})
afterEach(()=>{cleanup();vi.useRealTimers()})
const show=()=>render(<MemoryRouter><FirstDayFishingGuide/></MemoryRouter>)
it('shows again on reentry unless today suppression was selected',async()=>{
 let view=show();expect(await screen.findByRole('dialog')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'알겠어요 · 닫기'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());view.unmount()
 view=show();await screen.findByRole('dialog')
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'알겠어요 · 닫기'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());view.unmount()
 show();expect(screen.queryByRole('dialog')).toBeNull()
})
it('does not show to existing players after the Korean signup day',()=>{
 user.created_at='2026-10-22T14:59:59Z';show();expect(screen.queryByRole('dialog')).toBeNull()
})
