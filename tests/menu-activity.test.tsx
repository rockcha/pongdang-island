import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {summarizeMenuActivity,MenuActivityLine,activityRemaining} from '@/components/menu-activity'
import type {MenuStatus} from '@/lib/menu-status'
afterEach(cleanup)
const now=Date.parse('2026-10-26T12:00:00Z'),past=new Date(now-60000).toISOString(),future=new Date(now+120000).toISOString()
it('separates running, claimable and expired production and uses owned boats instead of dock slots',()=>{
 const summary={serverNow:new Date(now).toISOString(),production:{total:4,sites:[{completesAt:future,expiresAt:future},{completesAt:past,expiresAt:future},{completesAt:past,expiresAt:past}]},baitProduction:{total:0,sites:[]},harbor:{total:5,dockSlots:2,returnsAt:[past,future]},expedition:{returnsAt:future},personalBait:{completesAt:past},savings:{account:null}} satisfies MenuStatus
 const activity=summarizeMenuActivity(summary,now)
 expect(activity['/production']).toMatchObject({total:4,running:1,ready:1,expired:1})
 expect(activity['/port']).toMatchObject({total:5,running:1,ready:1})
 expect(activity['/expeditions']).toMatchObject({running:1,ready:0,remaining:120000})
 expect(activity['/my-bait-production']).toMatchObject({running:0,ready:1})
 expect(summarizeMenuActivity(summary,now+120000)['/expeditions'].ready).toBe(1)
 expect(summarizeMenuActivity(undefined,now)).toEqual({})
})
it('formats compact status lines and does not show zero counts',()=>{
 const view=render(<MenuActivityLine activity={{total:5,unit:'척',running:2,ready:1}}/>)
 expect(screen.getByText('총 5척 · 진행 2')).toBeTruthy();expect(screen.getByText('수령 1')).toBeTruthy()
 view.rerender(<MenuActivityLine activity={{single:'제작',running:1,ready:0,remaining:120000}}/>)
 expect(screen.getByText('제작 중 · 2분 남음')).toBeTruthy();expect(screen.queryByText(/수령/)).toBeNull()
 expect(activityRemaining(59000)).toBe('1분 미만');expect(activityRemaining(4320000)).toBe('1시간 12분')
})
