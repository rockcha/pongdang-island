// @vitest-environment node
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest'
import {
  beginDefense,
  createDefense,
  startWave,
  stepDefense,
} from '@/features/arcade/tower-defense-engine'
import { emptyTowerReplay } from '@/features/arcade/tower-defense-replay'
let handler: (request: Request) => Promise<Response>,
  stored: any,
  wallet: number,
  loseResponse: boolean
const fetcher = vi.fn(),
  uid = '00000000-0000-4000-8000-000000007291',
  id = '00000000-0000-4000-8000-000000007292'
const initialReplay = emptyTowerReplay()
const s = createDefense(42)
beginDefense(s)
startWave(s)
while (s.phase === 'combat') stepDefense(s, 0.05)
const stageReplay = { version: 1, ticks: s.tick, commands: [{ type: 'wave', tick: 0 }] }
const account = () => ({
  enabled: true,
  run: { ...stored, checkpoint: undefined },
  wallet: { gold: wallet },
})
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
  await import('../supabase/functions/tower-defense-game/index.ts')
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => {
  stored = {
    id,
    seed: 42,
    engine_version: 1,
    started_at: new Date(Date.now() - 3600000).toISOString(),
    finished_at: null,
    replay: structuredClone(initialReplay),
    checkpoint: null,
    cleared_stage: 0,
    reward: 0,
  }
  wallet = 970
  loseResponse = false
  fetcher.mockReset()
  fetcher.mockImplementation(async (url: string, options: any) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: uid })
    expect(options.headers.Authorization).toBe('Bearer private-service-key')
    const args = JSON.parse(options.body)
    expect(args.p_user_id).toBe(uid)
    if (url.endsWith('/tower_defense_record')) {
      expect(args.p_run_id).toBe(id)
      return Response.json({ run: stored, account: account() })
    }
    if (url.endsWith('/tower_defense_settle')) {
      const reward = args.p_cleared_stage * 10
      wallet += reward - stored.reward
      stored = {
        ...stored,
        replay: {
          ...args.p_replay,
          commands: args.p_replay.commands.map((command: Record<string, unknown>) =>
            Object.fromEntries(
              Object.entries(command).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
            ),
          ),
        },
        checkpoint: args.p_checkpoint,
        reward,
        cleared_stage: args.p_cleared_stage,
        finished_at: args.p_final ? 'done' : null,
        abandoned: args.p_abandoned,
      }
      if (loseResponse) {
        loseResponse = false
        throw Error('lost after commit')
      }
      return Response.json(account())
    }
    throw Error('unexpected fetch')
  })
})
const request = (body: unknown, authorization = 'Bearer player-token') =>
  new Request('https://example.invalid/tower-defense-game', {
    method: 'POST',
    headers: { Authorization: authorization },
    body: JSON.stringify(body),
  })
it('derives stage reward from the authenticated run and ignores client identity, score and checkpoint overrides', async () => {
  const response = await handler(
    request({
      runId: id,
      replay: stageReplay,
      final: false,
      user_id: 'someone-else',
      score: 50,
      reward: 99999,
      checkpoint: { state: { gold: 99999 } },
    }),
  )
  expect(response.status).toBe(200)
  expect((await response.json()).wallet.gold).toBe(980)
  expect(stored.cleared_stage).toBe(1)
  expect(stored.checkpoint.state.gold).toBeLessThan(1000)
})
it('requires Auth before reading runs, rejects malformed bodies and illegal replay actions', async () => {
  expect((await handler(request({ runId: id, replay: stageReplay, final: true }, ''))).status).toBe(
    401,
  )
  expect(fetcher).not.toHaveBeenCalled()
  expect((await handler(request(null))).status).toBe(400)
  expect(
    (
      await handler(
        request({
          runId: id,
          replay: {
            version: 1,
            ticks: 0,
            commands: [{ tick: 0, type: 'build', kind: 'cruise', cell: 25 }],
          },
          final: true,
        }),
      )
    ).status,
  ).toBe(400)
  expect(
    fetcher.mock.calls.filter(([url]) => String(url).endsWith('/tower_defense_settle')),
  ).toHaveLength(0)
})
it('uses saved server checkpoints for a lost response retry and never credits the same stage twice', async () => {
  loseResponse = true
  const body = { runId: id, replay: stageReplay, final: false }
  expect((await handler(request(body))).status).toBe(503)
  expect((await handler(request(body))).status).toBe(200)
  expect(wallet).toBe(980)
  expect((await handler(request({ ...body, final: true }))).status).toBe(200)
  expect(stored.abandoned).toBe(true)
  const calls = fetcher.mock.calls.length
  expect((await handler(request({ ...body, final: true }))).status).toBe(200)
  expect(wallet).toBe(980)
  expect(fetcher.mock.calls.length - calls).toBe(2)
})
it('finalizes actual loss even when the client does not request finalization', async () => {
  const state = createDefense(42)
  beginDefense(state)
  startWave(state)
  while (state.phase !== 'lost') stepDefense(state, 0.05)
  const response = await handler(
    request({ runId: id, replay: { ...stageReplay, ticks: state.tick }, final: false }),
  )
  expect(response.status).toBe(200)
  expect(stored.finished_at).toBe('done')
  expect(stored.abandoned).toBe(false)
  expect(stored.cleared_stage).toBe(state.wave - 1)
})
