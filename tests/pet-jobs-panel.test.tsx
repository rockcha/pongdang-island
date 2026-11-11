import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PetJobsPanel, petJobCountdown } from '@/features/pets/pet-jobs-panel'
import { createPetPreview, petPreviewReducer } from '@/features/pets/pet-preview-model'
const now = Date.parse('2026-11-09T14:30:00Z')
afterEach(cleanup)
function show(at = now, jobId: 'bakery' | 'lighthouse' | null = null) {
  let state = createPetPreview(now)
  if(jobId==='lighthouse')state.pets[0].level=4
  if (jobId) state = petPreviewReducer(state, { type: 'start-job', jobId, roll: 0, now })
  const props = {
    pets: state.pets,
    active: state.pets[0],
    now: at,
    busy: false,
    onStart: vi.fn(),
    onClaim: vi.fn(),
    onChoosePet: vi.fn(),
    onCare: vi.fn(),
  }
  const view = render(<PetJobsPanel {...props} />)
  return { ...view, props }
}
it('shows three illustrated options per tier and image currency with departure actions', () => {
  const { container, props } = show()
  expect(container.querySelectorAll('.pet-job-thumb svg')).toHaveLength(3)
  expect(screen.getAllByRole('button', { name: /보내기$/ })).toHaveLength(3)
  expect(
    container.querySelectorAll('.pet-gold img[src="/currency/gold-coin-starfish.png"]'),
  ).toHaveLength(3)
  fireEvent.click(screen.getByRole('button', { name: '빵집 반죽 지킴이 보내기' }))
  expect(props.onStart).toHaveBeenCalledWith('bakery')
})
it('updates the visible countdown and progress without disabled send/claim clutter', () => {
  const { container, props, rerender } = show(now, 'bakery')
  expect(screen.getByRole('timer').textContent).toBe('01:00:00')
  expect(screen.queryByRole('button', { name: /보내기$/ })).toBeNull()
  expect(screen.queryByRole('button', { name: '보상 받기' })).toBeNull()
  expect(container.querySelectorAll('.pet-job-thumb')).toHaveLength(0)
  rerender(<PetJobsPanel {...props} now={now + 1800_000} />)
  expect(screen.getByRole('timer').textContent).toBe('00:30:00')
  expect(screen.getByRole('progressbar', { name: '알바 진행률' }).getAttribute('value')).toBe('50')
})
it('changes into the completed reward state exactly at the end', () => {
  const { props } = show(now + 3600_000, 'bakery')
  expect(screen.queryByRole('timer')).toBeNull()
  expect(screen.getByText('다녀왔어요!')).toBeTruthy()
  expect(screen.getByRole('progressbar', { name: '알바 진행률' }).getAttribute('value')).toBe('100')
  fireEvent.click(screen.getByRole('button', { name: '보상 받기' }))
  expect(props.onClaim).toHaveBeenCalledWith(props.active.id)
})
it('labels next-day return times in Korea and never shows negative time', () => {
  show(now, 'lighthouse')
  expect(screen.getByRole('timer').textContent).toBe('10:00:00')
  expect(screen.getByText(/내일.*복귀 예정/).textContent).toContain('오전 9:30')
  expect(petJobCountdown(now, now + 1)).toBe('00:00:00')
  expect(petJobCountdown(now + 1001, now)).toBe('00:00:02')
})
it('shows locked tiers without allowing departure and links to enhancement',()=>{
  const {container,props}=show()
  fireEvent.click(screen.getByRole('button',{name:'+2',exact:true}))
  expect(container.querySelectorAll('.pet-job-thumb')).toHaveLength(3)
  expect(screen.getByText('45분')).toBeTruthy()
  const locked=screen.getAllByRole('button',{name:/강화 필요$/})
  expect(locked).toHaveLength(3)
  for(const b of locked)expect((b as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(locked[0]);expect(props.onStart).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'+4',exact:true}))
  expect(screen.getByText('30분')).toBeTruthy()
})
