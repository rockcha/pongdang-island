import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PetPreviewBoard } from '@/features/pets/pet-preview-page'
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ session: null }) }))
vi.mock('@/features/pets/pet-sprite', () => ({
  usePetReactionReady: () => true,
  PetSprite: ({ label }: { label: string }) => <canvas role="img" aria-label={label} />,
}))
beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-09T10:00:00Z'))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
function show(owner = 'admin-a') {
  return render(
    <MemoryRouter>
      <PetPreviewBoard key={owner} owner={owner} />
    </MemoryRouter>,
  )
}
function tool(name: string) {
  if (!screen.queryByRole('button', { name, exact: true })) {
    fireEvent.click(screen.getByRole('button', { name: '테스트 도구', exact: true }))
    fireEvent.click(screen.getByRole('button', { name, exact: true }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    return
  }
  fireEvent.click(screen.getByRole('button', { name, exact: true }))
}
it('paginates stored pets and keeps test tools in a separate dialog', () => {
  show()
  expect(screen.queryByRole('dialog')).toBeNull()
  tool('모래뭉 추가')
  tool('펫 목록 5')
  expect(document.querySelectorAll('.pet-row')).toHaveLength(4)
  tool('다음')
  expect(document.querySelectorAll('.pet-row')).toHaveLength(1)
  tool('이전')
  expect(document.querySelectorAll('.pet-row')).toHaveLength(4)
})
it('shows one big pet, completes care after three seconds and locks all gestures', () => {
  show()
  tool('배고픔 20 / 20')
  const canvas = screen.getByRole('img')
  tool('쓰다듬기')
  expect(screen.getByRole('img')).toBe(canvas)
  expect((screen.getByRole('button', { name: '목욕하기' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
  expect(screen.getByRole('progressbar', { name: '애정' }).getAttribute('value')).toBe('20')
  act(() => vi.advanceTimersByTime(2999))
  expect(screen.getByRole('progressbar', { name: '애정' }).getAttribute('value')).toBe('20')
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByRole('progressbar', { name: '애정' }).getAttribute('value')).toBe('21')
  expect((screen.getByRole('button', { name: '목욕하기' }) as HTMLButtonElement).disabled).toBe(
    false,
  )
})
it('hides the displayed pet at work and returns it after the elapsed test time', () => {
  show()
  tool('아르바이트')
  fireEvent.click(screen.getAllByRole('button', { name: /보내기$/ })[0])
  tool('하우스')
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('모래뭉의 알바 시간')).toBeTruthy()
  tool('1시간 경과')
  expect(screen.getByRole('img', { name: /모래뭉.*대기/ })).toBeTruthy()
  tool('아르바이트')
  tool('보상 받기')
  expect(screen.queryByRole('button', { name: '보상 받기' })).toBeNull()
})
it('keeps sandbox saves separate for each account and cancels unfinished care on reload', () => {
  const a = show()
  tool('배고픔 20 / 20')
  tool('목욕하기')
  a.unmount()
  const b = show('admin-b')
  expect(screen.getByRole('progressbar', { name: '애정' }).getAttribute('value')).toBe('100')
  b.unmount()
  show()
  expect(screen.getByRole('progressbar', { name: '애정' }).getAttribute('value')).toBe('20')
  expect((screen.getByRole('button', { name: '쓰다듬기' }) as HTMLButtonElement).disabled).toBe(
    false,
  )
})
it.each([
  ['쓰다듬기', 'stroke'],
  ['목욕하기', 'bath'],
  ['사진 찍어주기', 'sleep'],
  ['놀아주기', 'play'],
])('plays the matching effect for %s and shows affection only on completion', (label, action) => {
  const { container } = show()
  tool('배고픔 20 / 20')
  tool(label)
  expect(screen.getByRole('img', { name: /모래뭉 만족/ })).toBeTruthy()
  expect(
    container.querySelector('[data-pet-care-effect]')?.getAttribute('data-pet-care-effect'),
  ).toBe(action)
  expect(container.querySelector('[data-pet-affection-pop]')).toBeNull()
  act(() => vi.advanceTimersByTime(2999))
  expect(container.querySelector('[data-pet-care-effect]')).toBeTruthy()
  act(() => vi.advanceTimersByTime(1))
  expect(container.querySelector('[data-pet-care-effect]')).toBeNull()
  expect(container.querySelector('[data-pet-affection-pop]')?.textContent).toContain('+1')
  act(() => vi.advanceTimersByTime(1000))
  expect(container.querySelector('[data-pet-affection-pop]')).toBeNull()
})
it('does not show a false +1 when affection is capped', () => {
  const { container } = show()
  tool('쓰다듬기')
  act(() => vi.advanceTimersByTime(3000))
  expect(container.querySelector('[data-pet-affection-pop]')).toBeNull()
  expect(screen.getByRole('progressbar', { name: '애정' }).getAttribute('value')).toBe('100')
})
it('plays eating with a bowl, blocks repeat actions, then spends one ration and adds fullness only', () => {
  const { container } = show()
  tool('배고픔 20 / 20')
  const canvas = screen.getByRole('img')
  fireEvent.click(screen.getByRole('button', { name: /사료 주기/ }))
  expect(screen.getByRole('img', { name: /모래뭉 먹기/ })).toBe(canvas)
  expect(container.querySelector('[data-pet-care-effect="feed"]')).toBeTruthy()
  expect((screen.getByRole('button', { name: '쓰다듬기' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
  expect(screen.getByRole('progressbar', { name: '포만도' }).getAttribute('value')).toBe('20')
  expect(screen.getByRole('button', { name: /먹는 중/ }).textContent).toContain('10개 남음')
  act(() => vi.advanceTimersByTime(2999))
  expect(container.querySelector('[data-pet-fullness-pop]')).toBeNull()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByRole('progressbar', { name: '포만도' }).getAttribute('value')).toBe('30')
  expect(screen.getByRole('progressbar', { name: '애정' }).getAttribute('value')).toBe('20')
  expect(screen.getByRole('button', { name: /사료 주기/ }).textContent).toContain('9개 남음')
  expect(container.querySelector('[data-pet-fullness-pop]')?.textContent).toContain('+10')
  expect(container.querySelector('[data-pet-affection-pop]')).toBeNull()
})
it('cancels unfinished feeding on reload without consuming food', () => {
  const first = show()
  tool('배고픔 20 / 20')
  fireEvent.click(screen.getByRole('button', { name: /사료 주기/ }))
  first.unmount()
  show()
  expect(screen.getByRole('button', { name: /사료 주기/ }).textContent).toContain('10개 남음')
  expect(screen.getByRole('progressbar', { name: '포만도' }).getAttribute('value')).toBe('20')
})
