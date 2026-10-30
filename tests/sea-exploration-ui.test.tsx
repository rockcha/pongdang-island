import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {SeaExplorationPage} from '@/features/sea-exploration/sea-exploration-page'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('spends only demo money once for the submarine and resets on a fresh visit',()=>{
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null)
 const view=render(<SeaExplorationPage/>)
 fireEvent.click(screen.getByRole('button',{name:/작은 잠수함/}))
 fireEvent.click(screen.getByRole('button',{name:/구매하고 탐험 시작/}))
 expect(screen.getByText(/임시 돈 7,000조개/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'해변으로'}))
 expect(screen.getByRole('button',{name:/구매 완료/})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:/탐험 시작/}))
 expect(screen.getByText(/임시 돈 7,000조개/)).toBeTruthy()
 view.unmount();render(<SeaExplorationPage/>)
 expect(screen.getByText(/임시 돈 10,000조개/)).toBeTruthy()
})
