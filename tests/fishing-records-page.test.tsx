import { cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { FishingRecordsPage } from '@/features/fishing-records/fishing-records-page'
const mock=vi.hoisted(()=>({now:Date.parse('2026-10-29T14:59:59Z'),refetch:vi.fn().mockResolvedValue({}),data:{serverNow:'2026-10-29T14:59:59Z',day:'2026-10-29',nextResetAt:'2026-10-29T15:00:00Z',totalCasts:0,caughtCount:0,failedCount:0,unfinishedCount:0,rarities:{mythic:0,epic:0,rare:0,common:0},baits:[]}}))
vi.mock('@/lib/account-query',()=>({useAccountResource:()=>({data:mock.data,dataUpdatedAt:mock.now,isFetching:false,isError:false,refetch:mock.refetch}),useServerDeadlines:()=>mock.now}))
afterEach(cleanup)
it('refreshes once at Korean midnight and waits for the confirmed new-day snapshot',async()=>{
 const view=render(<MemoryRouter><FishingRecordsPage/></MemoryRouter>)
 expect(mock.refetch).not.toHaveBeenCalled()
 mock.now+=1000
 view.rerender(<MemoryRouter><FishingRecordsPage/></MemoryRouter>)
 await waitFor(()=>expect(mock.refetch).toHaveBeenCalledOnce())
 view.rerender(<MemoryRouter><FishingRecordsPage/></MemoryRouter>)
 expect(mock.refetch).toHaveBeenCalledOnce()
 mock.data={...mock.data,day:'2026-10-30',nextResetAt:'2026-10-30T15:00:00Z'}
 view.rerender(<MemoryRouter><FishingRecordsPage/></MemoryRouter>)
 expect(mock.refetch).toHaveBeenCalledOnce()
})
