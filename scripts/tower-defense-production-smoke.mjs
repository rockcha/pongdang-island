// Run with node --experimental-strip-types scripts/tower-defense-production-smoke.mjs <project-ref>.
// Creates only an ephemeral synthetic player; finally removes its sessions and account.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifyTowerReplay } from '../supabase/functions/_shared/tower-defense-replay.js'
import {
  beginDefense,
  createDefense,
  startWave,
  stepDefense,
} from '../src/features/arcade/tower-defense-engine.ts'
function env(file) {
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^\w+=/.test(l))
      .map((l) => {
        const i = l.indexOf('=')
        return [
          l.slice(0, i),
          l
            .slice(i + 1)
            .trim()
            .replace(/^(['"])(.*)\1$/, '$2'),
        ]
      }),
  )
}
const publicEnv = env('.env'),
  privateEnv = env('.env.storage.local')
const url = privateEnv.SUPABASE_URL,
  ref = process.argv[2]
assert(
  ref && url === `https://${ref}.supabase.co` && publicEnv.VITE_SUPABASE_URL === url,
  'Explicit target project must match both environment files',
)
const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}
const admin = createClient(url, privateEnv.SUPABASE_SECRET_KEY, options)
const player = createClient(url, publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY, options)
const checks = {},
  startedAt = new Date().toISOString()
let uid
async function rpc(name, args = {}) {
  const { data, error } = await player.rpc(name, args)
  if (error)
    throw Error(
      `${name}: ${/^[A-Z_]+$/.test(error.message) ? error.message : (error.code ?? 'RPC_ERROR')}`,
    )
  return data
}
async function submit(run, replay, final = false) {
  const record = await admin.rpc('tower_defense_record', { p_user_id: uid, p_run_id: run.id })
  if (record.error) throw Error('Synthetic run record unavailable')
  verifyTowerReplay(replay, record.data.run.seed, {
    previous: { replay: record.data.run.replay, checkpoint: record.data.run.checkpoint },
    availableSeconds: 1e9,
    maxDeltaTicks: 12000,
  })
  // Respect the exact verifier's fastest supported wall-clock pace.
  const remaining = (replay.ticks * 0.05) / 4 + 1 - (Date.now() - Date.parse(run.started_at)) / 1000
  if (remaining > 0) {
    assert(remaining < 60, 'Unexpected smoke-test duration')
    await new Promise((done) => setTimeout(done, remaining * 1000))
  }
  const { data, error } = await player.functions.invoke('tower-defense-game', {
    body: { runId: run.id, replay, final },
  })
  if (error || !data || data.error) {
    const failure =
      error?.context instanceof Response ? await error.context.json().catch(() => ({})) : {}
    throw Error(
      `tower-defense-game: ${failure.error ?? data?.error ?? error?.name ?? 'INVALID_RESPONSE'} (${error?.context?.status ?? 'unknown'})`,
    )
  }
  return data
}
try {
  const nonce = crypto.randomUUID().replaceAll('-', ''),
    email = `tower-smoke-${nonce}@example.invalid`,
    password = crypto.randomBytes(24).toString('base64url')
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { game_nickname: `검증${nonce.slice(0, 6)}` },
  })
  if (created.error || !created.data.user) throw Error('Synthetic account creation failed')
  uid = created.data.user.id
  const login = await player.auth.signInWithPassword({ email, password })
  if (login.error) throw Error('Synthetic sign-in failed')
  await rpc('tower_defense_state')
  // Only this freshly created synthetic user's wallet is funded. Real players are untouched.
  const funding = await admin
    .from('player_wallets')
    .update({ gold: 1000 })
    .eq('user_id', uid)
    .select('gold')
    .single()
  assert(!funding.error && funding.data?.gold === 1000, 'Synthetic test funding failed')
  const before = await rpc('tower_defense_state'),
    operation = crypto.randomUUID()
  const first = await rpc('tower_defense_start', { p_operation_id: operation, p_engine_version: 1 })
  assert.equal(first.wallet.gold, before.wallet.gold - 30)
  const retry = await rpc('tower_defense_start', { p_operation_id: operation, p_engine_version: 1 })
  assert.equal(retry.run.id, first.run.id)
  assert.equal(retry.wallet.gold, first.wallet.gold)
  checks.entryFee = 30
  checks.entryRetry = true
  const s = createDefense(first.run.seed)
  beginDefense(s)
  startWave(s)
  while (s.phase === 'combat') stepDefense(s, 0.05)
  assert.equal(s.wave, 1)
  assert.equal(s.phase, 'build')
  const replay = { version: 1, ticks: s.tick, commands: [{ type: 'wave', tick: 0 }] }
  const checkpoint = await submit(first.run, replay)
  assert.equal(checkpoint.run.cleared_stage, 1)
  assert.equal(checkpoint.run.reward, 10)
  assert.equal(checkpoint.wallet.gold, before.wallet.gold - 20)
  const repeated = await submit(first.run, replay)
  assert.equal(repeated.wallet.gold, checkpoint.wallet.gold)
  checks.immediateReward = 10
  checks.rewardRetry = true
  while (s.phase !== 'lost' && s.tick < 12000) stepDefense(s, 0.05)
  assert.equal(s.phase, 'lost')
  const final = await submit(first.run, { ...replay, ticks: s.tick })
  assert(final.run.finished_at)
  assert.equal(final.run.abandoned, false)
  assert.equal(final.run.cleared_stage, s.wave - 1)
  assert.equal(final.wallet.gold, before.wallet.gold - 30 + (s.wave - 1) * 10)
  const board = await rpc('tower_defense_leaderboard', { p_offset: 0 })
  const mine = board.rows.find((row) => row.userId === uid)
  assert(mine)
  assert.equal(mine.score, s.wave - 1)
  assert.equal(mine.finishedAt, final.run.achieved_at)
  checks.terminalFinalization = true
  checks.rankedStage = mine.score
  checks.achievementTimestamp = true
  const denied = await player.rpc('tower_defense_record', {
    p_user_id: uid,
    p_run_id: first.run.id,
  })
  assert(denied.error)
  checks.browserCannotReadPrivateCheckpoint = true
  const anonymous = await fetch(url + '/functions/v1/tower-defense-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  assert.equal(anonymous.status, 401)
  checks.anonymousDenied = true
} finally {
  if (uid) {
    await player.auth.signOut({ scope: 'global' })
    const deleted = await admin.auth.admin.deleteUser(uid)
    if (deleted.error) throw Error('Synthetic account cleanup failed')
    const gone = await admin.auth.admin.getUserById(uid)
    assert(gone.error && !gone.data.user, 'Synthetic account still exists')
    checks.syntheticAccountDeleted = true
  }
  fs.mkdirSync('artifacts/tower-defense', { recursive: true })
  const result = { project: ref, startedAt, finishedAt: new Date().toISOString(), checks }
  fs.writeFileSync(
    'artifacts/tower-defense/deployment-smoke.json',
    JSON.stringify(result, null, 2) + '\n',
  )
  console.log(JSON.stringify(result))
}
