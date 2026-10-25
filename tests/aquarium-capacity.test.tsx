import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumCapacityExpansion} from '@/features/aquarium/capacity-expansion'
import type {AquariumTank} from '@/features/aquarium/api'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'capacity-test'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
const tank={id:'tank-a',capacity:50,nextCapacityExpansion:{capacity:70,price:1000}} as AquariumTank
afterEach(()=>{cleanup();localStorage.clear()})
it('shows occupancy, quotes the selected tank price and waits for confirmation',async()=>{
 const expand=vi.fn().mockResolvedValue(undefined)
 render(<AquariumCapacityExpansion tank={tank} count={48} gold={1000} busy={false} onExpand={expand}/> )
 expect(screen.getByText('48 / 50')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:/어항 수용량/}))
 const guard=screen.getByRole('alertdialog');expect(guard.textContent).toContain('1,000');expect(guard.textContent).toContain('선택한 어항만')
 expect(expand).not.toHaveBeenCalled();fireEvent.click(within(guard).getByRole('button',{name:'확장하기'}))
 await waitFor(()=>expect(expand).toHaveBeenCalledWith(70,expect.any(String)))
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
})
it('blocks an unaffordable purchase and displays the maximum capacity',()=>{
 const expand=vi.fn(),view=render(<AquariumCapacityExpansion tank={{...tank,capacity:70,nextCapacityExpansion:{capacity:90,price:1000}}} count={70} gold={999} busy={false} onExpand={expand}/> )
 fireEvent.click(screen.getByRole('button',{name:/어항 수용량/}))
 expect(screen.getByRole('alertdialog').textContent).toContain('1,000');expect(screen.getByRole('button',{name:'확장하기'}).hasAttribute('disabled')).toBe(true)
 view.unmount();render(<AquariumCapacityExpansion tank={{...tank,capacity:100,nextCapacityExpansion:null}} count={99} gold={10000} busy={false} onExpand={expand}/> )
 expect(screen.getByRole('button',{name:/최대 확장 완료/}).hasAttribute('disabled')).toBe(true)
})
it('restores an uncertain purchase across reopening without generating another operation',async()=>{
 const pending={capacity:70,price:1000,operation:crypto.randomUUID()}
 localStorage.setItem('pongdang:aquarium-tank-expansion:capacity-test:tank-a',JSON.stringify(pending))
 const expand=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined)
 render(<AquariumCapacityExpansion tank={tank} count={50} gold={0} busy={false} onExpand={expand}/> )
 fireEvent.click(screen.getByRole('button',{name:'어항 확장 결과 확인'}));fireEvent.click(screen.getByRole('button',{name:'결과 다시 확인'}))
 await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'결과 다시 확인'}))
 await waitFor(()=>expect(expand).toHaveBeenCalledTimes(2));expect(expand.mock.calls[0]).toEqual(expand.mock.calls[1])
 await waitFor(()=>expect(localStorage.getItem('pongdang:aquarium-tank-expansion:capacity-test:tank-a')).toBeNull())
})

it('keeps pending purchases scoped to their original tank when switching tanks',()=>{
 localStorage.setItem('pongdang:aquarium-tank-expansion:capacity-test:tank-a',JSON.stringify({capacity:70,price:1000,operation:crypto.randomUUID()}))
 const expand=vi.fn(),view=render(<AquariumCapacityExpansion tank={tank} count={0} gold={1000} busy={false} onExpand={expand}/>)
 expect(screen.getByRole('button',{name:'어항 확장 결과 확인'})).toBeTruthy()
 view.rerender(<AquariumCapacityExpansion tank={{...tank,id:'tank-b'}} count={0} gold={1000} busy={false} onExpand={expand}/>)
 expect(screen.queryByRole('button',{name:'어항 확장 결과 확인'})).toBeNull()
 expect(expand).not.toHaveBeenCalled()
})
