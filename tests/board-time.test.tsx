import {cleanup,render,screen,act} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {BoardTime,boardTime} from '@/features/board/board-time'

afterEach(()=>{cleanup();vi.useRealTimers()})
it('formats recent times and preserves dates for older posts',()=>{
 const now=Date.parse('2026-10-21T12:00:00Z')
 for(const [elapsed,label] of [[0,'방금 전'],[5*60000,'5분 전'],[3*3600000,'3시간 전'],[86400000,'어제'],[3*86400000,'3일 전']] as const){
  expect(boardTime(new Date(now-elapsed).toISOString(),now)).toBe(label)
 }
 expect(boardTime('2026-10-12T12:00:00Z',now)).toContain('10월 12일')
 expect(boardTime('2025-10-12T12:00:00Z',now)).toContain('2025')
})
it('updates elapsed time while the page stays open and retains the exact timestamp',()=>{
 vi.useFakeTimers()
 vi.setSystemTime(new Date('2026-10-21T12:00:00Z'))
 render(<BoardTime value="2026-10-21T12:00:00Z" />)
 expect(screen.getByText('방금 전').getAttribute('dateTime')).toBe('2026-10-21T12:00:00Z')
 act(()=>vi.advanceTimersByTime(60000))
 expect(screen.getByText('1분 전')).toBeTruthy()
})
