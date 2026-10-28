import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useIslandDraft } from '@/features/my-island/use-island-draft'
import { defaultState } from '@/features/my-island/island-model'
import { islandFixture } from './island-fixture'
import type { IslandDocument, IslandSaveResult } from '@/features/my-island/api'
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
it('keeps server ownership when undoing geometry and flushes edits made during a save', async () => {
  const snapshot = islandFixture()
  let finish!: (value: IslandSaveResult) => void
  const save = vi
    .fn()
    .mockImplementationOnce(() => new Promise((r) => (finish = r)))
    .mockImplementation(async (document, revision, id) => ({
      island: { ...snapshot, document, revision: revision + 1 },
      receipt: { operationId: id, revision: revision + 1, applied: true },
    }))
  const { result } = renderHook(() =>
    useIslandDraft({ snapshot, save, reload: vi.fn() }, defaultState),
  )
  await act(async () => {
    await result.current.flush()
  }) // A no-op must not retain a resolved in-flight lock.
  const before = result.current.local
  act(() => result.current.setLocal({ ...before, coins: 9999999, owned: ['forged'], paving: [] }))
  expect(result.current.local.owned).toEqual(snapshot.items.map((i) => i.id))
  expect(result.current.local.coins).toBe(0)
  let waiting!: Promise<void>
  act(() => {
    waiting = result.current.flush()
  })
  act(() => result.current.setLocal({ ...result.current.local, layout: [] }))
  await act(async () => {
    finish({
      island: { ...snapshot, document: { ...snapshot.document, paving: [] }, revision: 1 },
      receipt: { operationId: 'first', revision: 1, applied: true },
    })
    await waiting
  })
  expect(save).toHaveBeenCalledTimes(2)
  expect(save.mock.calls[1][1]).toBe(1)
  expect(save.mock.calls[1][0].layout).toEqual([])
  expect(result.current.dirty).toBe(false)
})
it('does not automatically retry an uncertain write and reuses its original operation ID', async () => {
  vi.useFakeTimers()
  const snapshot = islandFixture(),
    save = vi
      .fn()
      .mockRejectedValueOnce({ code: '', message: 'TypeError: Failed to fetch' })
      .mockImplementation(async (document, revision, id) => ({
        island: { ...snapshot, document, revision: revision + 1 },
        receipt: { operationId: id, revision: revision + 1, applied: false },
      }))
  const { result } = renderHook(() =>
    useIslandDraft({ snapshot, save, reload: vi.fn() }, defaultState),
  )
  act(() => result.current.setLocal({ ...result.current.local, paving: [] }))
  await act(async () => {
    await result.current.flush().catch(() => {})
  })
  expect(result.current.error).toBeTruthy()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10000)
  })
  expect(save).toHaveBeenCalledOnce()
  await act(async () => {
    await result.current.flush()
  })
  expect(save.mock.calls[0][2]).toBe(save.mock.calls[1][2])
  expect(result.current.error).toBe('')
})
it('keeps a newer draft after an idempotent retry discovers another device revision', async () => {
  const snapshot = islandFixture(),
    save = vi.fn(async (document: IslandDocument) => ({
      island: { ...snapshot, document, revision: 3 },
      receipt: { operationId: 'old', revision: 1, applied: false },
    }))
  const reload = vi.fn(async () => ({ ...snapshot, revision: 3 }))
  const { result } = renderHook(() => useIslandDraft({ snapshot, save, reload }, defaultState))
  act(() => result.current.setLocal({ ...result.current.local, paving: [] }))
  await act(async () => {
    await result.current.flush().catch(() => {})
  })
  expect(result.current.dirty).toBe(true)
  expect(result.current.error).toContain('다른 화면')
  await act(async () => {
    await result.current.reload()
  })
  expect(result.current.dirty).toBe(false)
  expect(result.current.local.paving).toEqual(snapshot.document.paving)
})
it('never starts another queued save after the account editor unmounts', async () => {
  const snapshot = islandFixture()
  let finish!: (value: IslandSaveResult) => void
  const save = vi.fn(() => new Promise<IslandSaveResult>((r) => (finish = r)))
  const { result, unmount } = renderHook(() =>
    useIslandDraft({ snapshot, save, reload: vi.fn() }, defaultState),
  )
  act(() => result.current.setLocal({ ...result.current.local, paving: [] }))
  let pending!: Promise<void>
  act(() => {
    pending = result.current.flush()
  })
  act(() => result.current.setLocal({ ...result.current.local, layout: [] }))
  unmount()
  finish({
    island: { ...snapshot, revision: 1 },
    receipt: { operationId: 'id', revision: 1, applied: true },
  })
  await pending
  expect(save).toHaveBeenCalledOnce()
})
