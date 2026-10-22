import { act,cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import BaitLabPage from '@/features/fishing/bait-lab-page'
import { labStorageKey } from '@/features/fishing/bait-lab-model'
import {baitWaitFlavor} from '@/features/fishing/bait-wait-flavor'

const remote = vi.hoisted(() =>
  vi.fn(() => {
    throw Error('Remote account API must not be used in bait lab')
  }),
)
vi.mock('@/lib/client', () => ({ createClient: remote }))
beforeEach(() => {
  localStorage.clear()
  remote.mockClear()
  window.history.replaceState({}, '', '/bait-lab')
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('starts the real gauge with a locally saved cast and never initializes the remote account client', () => {
  render(<BaitLabPage />)
  expect(screen.getByText(baitWaitFlavor('bait'))).toBeTruthy()
  expect(screen.queryByText(/입질 \d+~\d+초/)).toBeNull()
  expect(screen.queryByText(/평균 \d+초/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '퐁당 지렁이 로컬 낚시 시작' }))
  const state = JSON.parse(localStorage.getItem(labStorageKey)!)
  expect(state.inventory.bait).toBe(19)
  expect(state.pending.wait).toBeGreaterThanOrEqual(14)
  expect(state.pending.wait).toBeLessThanOrEqual(18)
  expect(remote).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '낚시 취소' }))
  expect(JSON.parse(localStorage.getItem(labStorageKey)!).history).toHaveLength(1)
  expect(remote).not.toHaveBeenCalled()
})

it('lets the tester advance the long wait while retaining the final gauge interaction',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(.5)
 render(<BaitLabPage/>)
 fireEvent.change(screen.getByRole('combobox',{name:'테스트 미끼 선택'}),{target:{value:'bait_deep_sleep_sachet'}})
 fireEvent.click(screen.getByRole('button',{name:'깊은잠 향낭 로컬 낚시 시작'}))
 expect((screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement).disabled).toBe(true)
 for(let i=0;i<8;i++){
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:/대기 10초 당기기/}))})
 }
 await act(async()=>{vi.advanceTimersByTime(100)})
 expect(screen.queryByRole('button',{name:/대기 10초 당기기/})).toBeNull()
 expect((screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement).disabled).toBe(false)
 const state=JSON.parse(localStorage.getItem(labStorageKey)!)
 expect(state.inventory.bait_deep_sleep_sachet).toBe(19)
 expect(state.pending.waitReduction).toBe(78)
 expect(state.history).toHaveLength(0)
 expect(remote).not.toHaveBeenCalled()
})

it('adds supplies for new baits to an older local save without resetting existing resources',()=>{
 localStorage.setItem(labStorageKey,JSON.stringify({gold:123,inventory:{bait:7},discoveries:[],history:[],pending:null,nextRare:false}))
 render(<BaitLabPage/>)
 fireEvent.change(screen.getByRole('combobox',{name:'테스트 미끼 선택'}),{target:{value:'bait_deep_sleep_sachet'}})
 fireEvent.click(screen.getByRole('button',{name:'깊은잠 향낭 로컬 낚시 시작'}))
 const state=JSON.parse(localStorage.getItem(labStorageKey)!)
 expect(state.gold).toBe(123)
 expect(state.inventory.bait).toBe(7)
 expect(state.inventory.bait_deep_sleep_sachet).toBe(19)
})
