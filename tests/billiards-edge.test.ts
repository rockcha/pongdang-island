// @vitest-environment node
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest'
let handler: (request: Request) => Promise<Response>
const fetcher = vi.fn(),
  uid = '00000000-0000-4000-8000-000000007191',
  id = '00000000-0000-4000-8000-000000007192'
const replay = { version: 1, shots: [{ dx: 0, dy: -60 }] }
let finished = false,
  loseResponse = false
beforeAll(async () => {
  vi.stubGlobal('Deno', {
    env: {
      get: (name: string) =>
        name === 'SUPABASE_URL' ? 'https://example.invalid' : 'private-service-key',
    },
    serve: (fn: typeof handler) => {
      handler = fn
    },
  })
  vi.stubGlobal('fetch', fetcher)
  await import('../supabase/functions/billiards-game/index.ts')
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => {
  finished = false
  loseResponse = false
  fetcher.mockReset()
  fetcher.mockImplementation(async (url: string, options: any) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: uid })
    if (url.endsWith('/billiards_record')) {
      expect(JSON.parse(options.body)).toEqual({ p_user_id: uid, p_run_id: id })
      return Response.json({
        run: {
          id,
          engine_version: 1,
          started_at: new Date(Date.now() - 60000).toISOString(),
          finished_at: finished ? 'done' : null,
          score: finished ? 10 : 0,
        },
        wallet: { gold: finished ? 1000 : 990 },
      })
    }
    if (url.endsWith('/billiards_settle')) {
      const args = JSON.parse(options.body)
      expect(args.p_score).toBe(10)
      expect(args.p_user_id).toBe(uid)
      expect(args.p_replay).toEqual(replay)
      finished = true
      if (loseResponse) throw new Error('lost after commit')
      return Response.json({
        run: { id, score: 10, reward: 10, finished_at: 'done' },
        wallet: { gold: 1000 },
      })
    }
    throw new Error('unexpected fetch')
  })
})
const request = (body: unknown, authorization = 'Bearer player-token') =>
  new Request('https://example.invalid/billiards-game', {
    method: 'POST',
    headers: { Authorization: authorization },
    body: JSON.stringify(body),
  })
it('ignores forged identity, score, reward and elapsed time and derives points from the shot replay', async () => {
  const response = await handler(
    request({
      runId: id,
      replay,
      final: true,
      user_id: 'someone-else',
      score: 999999,
      reward: 999999,
      elapsed: 999999,
    }),
  )
  expect(response.status).toBe(200)
  expect((await response.json()).run.reward).toBe(10)
})
it('never settles without authentication or with an invalid replay', async () => {
  expect((await handler(request({ runId: id, replay, final: true }, ''))).status).toBe(401)
  expect(
    (
      await handler(
        request({ runId: id, replay: { version: 1, shots: [{ dx: 0, dy: 0 }] }, final: true }),
      )
    ).status,
  ).toBe(400)
  expect(
    fetcher.mock.calls.filter(([url]) => String(url).endsWith('/billiards_settle')),
  ).toHaveLength(0)
})
it('resolves a lost post-commit response without calling settlement again', async () => {
  loseResponse = true
  const body = { runId: id, replay, final: true }
  expect((await handler(request(body))).status).toBe(503)
  expect((await handler(request(body))).status).toBe(200)
  expect(
    fetcher.mock.calls.filter(([url]) => String(url).endsWith('/billiards_settle')),
  ).toHaveLength(1)
})
