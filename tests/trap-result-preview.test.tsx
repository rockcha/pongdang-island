import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {TrapResultPreview} from '@/features/expeditions/trap-result-preview'
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span>{name}</span>}))
afterEach(()=>{cleanup();vi.useRealTimers()})
it('shows sample rarities after ten seconds and never claims them as inventory',async()=>{
 vi.useFakeTimers();render(<TrapResultPreview/>)
 fireEvent.click(screen.getByRole('button',{name:'임시 통발 설치'}))
 expect(screen.getByText(/통발을 확인하는 중 · 10초/)).toBeTruthy()
 await act(()=>vi.advanceTimersByTimeAsync(9800))
 expect(screen.queryByText('통발 결과')).toBeNull()
 await act(()=>vi.advanceTimersByTimeAsync(200))
 expect(screen.getByText('통발 결과')).toBeTruthy()
 expect(screen.getByText('희귀')).toBeTruthy();expect(screen.getAllByText('특급')).toHaveLength(2)
 expect(screen.getByText('성공').parentElement?.textContent).toBe('성공4')
 expect(screen.getByText('실패').parentElement?.textContent).toBe('실패1')
 expect(screen.getAllByText('신화')[0].closest('dt')?.nextElementSibling?.textContent).toBe('1개')
 expect(screen.getByRole('button',{name:'닫기',exact:true}).className).toContain('rounded-none')
 expect(screen.getByText('예시 결과예요. 보관함에 추가되지 않아요.')).toBeTruthy()
 expect(screen.queryByText('잡은 개체는 보관함에 보냈어요.')).toBeNull()
})
