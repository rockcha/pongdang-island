import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TankInhabitants } from '../src/features/aquarium/tank-inhabitants'
import type { OwnedCollectible } from '../src/features/collection/api'

const mock=vi.hoisted(()=>({setItems:vi.fn(),resize:vi.fn(),setReduced:vi.fn(),setVisible:vi.fn(),destroy:vi.fn(),create:vi.fn()}))
vi.mock('../src/features/aquarium/phaser-tank',()=>({createTankRenderer:mock.create}))
beforeEach(()=>{
 vi.clearAllMocks();mock.create.mockReturnValue(mock)
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}))
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('creates one renderer and updates the collection without restarting it, then destroys it',async()=>{
 const first={id:'fish-a',species:{name:'멸치'}} as OwnedCollectible
 const second={id:'fish-b',species:{name:'상어'}} as OwnedCollectible
 const view=render(<TankInhabitants items={[first]}/> )
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 view.rerender(<TankInhabitants items={[first,second]}/> )
 expect(mock.setItems).toHaveBeenLastCalledWith([first,second])
 expect(mock.create).toHaveBeenCalledOnce()
 expect(screen.getByText('상어')).toBeTruthy()
 expect(view.container.firstElementChild?.className).toContain('cursor-pointer')
 view.unmount()
 expect(mock.destroy).toHaveBeenCalledOnce()
})
it('shows a helpful error when the renderer cannot start',async()=>{
 mock.create.mockImplementation(()=>{throw new Error('renderer unavailable')})
 render(<TankInhabitants items={[]}/> )
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','어항 화면을 시작하지 못했어요. 새로고침해주세요.')
})
