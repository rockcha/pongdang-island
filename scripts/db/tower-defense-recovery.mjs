import { createHash } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { pathToFileURL } from 'node:url'

export const recoveryPlayer = 'eca47071-4fd9-41d7-9d08-4cefb62b1686'
const project = 'ewafafphiovbpjwogwzn'
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'"
const uuid = (value) => {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value))
    throw Error('Invalid UUID')
  return quote(value) + '::uuid'
}

// Data repair, not a schema migration. Lock in the same wallet -> run order as settlement.
export function recoverySql(run) {
  if (run.user_id !== recoveryPlayer || run.finished_at || !run.replay)
    throw Error('Not the inspected active player run')
  const user = uuid(run.user_id),
    id = uuid(run.id)
  const operation = createHash('sha256')
    .update('tower-defense-entry-recovery:' + run.id)
    .digest('hex')
    .slice(0, 32)
  return `begin;
set local lock_timeout='3s';
set local statement_timeout='10s';
do $recovery$
declare r app_private.tower_defense_runs; balance integer; receipt public.gold_transactions;
begin
  select gold into strict balance from public.player_wallets where user_id=${user} for update;
  select * into strict r from app_private.tower_defense_runs where user_id=${user} and id=${id} for update;
  select * into receipt from public.gold_transactions where user_id=${user} and operation_id='${operation}'::uuid;
  if found then
    if receipt.action<>'sell' or receipt.item_id<>'arcade:tower-defense:entry-recovery:'||r.id::text
      or receipt.delta<>30 or r.finished_at is null or not r.abandoned then raise exception 'RECOVERY_RECEIPT_MISMATCH'; end if;
    return;
  end if;
  if r.finished_at is not null or r.replay is distinct from ${quote(JSON.stringify(run.replay))}::jsonb
    or r.reward<>${Number(run.reward)} or r.cleared_stage<>${Number(run.cleared_stage)} then raise exception 'RUN_CHANGED_SINCE_INSPECTION'; end if;
  if not exists(select 1 from public.gold_transactions where user_id=${user} and operation_id=r.operation_id
    and action='buy' and item_id='arcade:tower-defense:entry' and delta=-30) then raise exception 'ENTRY_PAYMENT_NOT_FOUND'; end if;
  if balance>999999970 then raise exception 'GOLD_LIMIT'; end if;
  update app_private.tower_defense_runs set finished_at=clock_timestamp(),abandoned=true where id=r.id;
  insert into public.gold_transactions(user_id,operation_id,action,item_id,delta)
    values(${user},'${operation}'::uuid,'sell','arcade:tower-defense:entry-recovery:'||r.id::text,30);
  update public.player_wallets set gold=gold+30,updated_at=clock_timestamp() where user_id=${user};
end $recovery$;
commit;`
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args[0] === '--apply'
  if (args.length && (!apply || args.length !== 2))
    throw Error('Usage: node scripts/db/tower-defense-recovery.mjs [--apply <inspected-run-id>]')
  loadEnvFile('.env.storage.local')
  if (new URL(process.env.SUPABASE_URL).hostname !== project + '.supabase.co')
    throw Error('Project mismatch')
  async function api(path, body) {
    const response = await fetch('https://api.supabase.com/v1/projects/' + project + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + process.env.SUPABASE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw Error('Management API status ' + response.status)
    return response.json()
  }
  const identity = await api('')
  if (identity.id !== project || identity.name !== 'pongdang-island')
    throw Error('Project identity mismatch')
  const query = (sql, readOnly = true) =>
    api('/database/query', { query: sql, read_only: readOnly })
  const rows = await query(`select r.* from app_private.tower_defense_runs r
    join public.player_profiles p on p.id=r.user_id where r.user_id=${uuid(recoveryPlayer)}
    and p.nickname=${quote('\uac1c\uc591\ud30c')} and r.finished_at is null order by r.started_at desc limit 2`)
  if (rows.length !== 1) throw Error('Expected exactly one active player run; no changes made')
  const run = rows[0]
  console.log(
    JSON.stringify(
      {
        project,
        inspectedAt: new Date().toISOString(),
        runId: run.id,
        engineVersion: run.engine_version,
        savedTicks: run.replay.ticks,
        commands: run.replay.commands.length,
        clearedStage: run.cleared_stage,
        reward: run.reward,
        mode: apply ? 'apply' : 'inspect',
      },
      null,
      2,
    ),
  )
  if (!apply) return
  if (run.id !== args[1]) throw Error('Active run differs from the inspected run; no changes made')
  await query(recoverySql(run), false)
  const result = await query(`select r.id,r.finished_at,r.abandoned,r.cleared_stage,r.reward,w.gold,
    (select count(*) from public.gold_transactions t where t.user_id=r.user_id
    and t.item_id='arcade:tower-defense:entry-recovery:'||r.id::text and t.delta=30) as refund_receipts
    from app_private.tower_defense_runs r join public.player_wallets w on w.user_id=r.user_id
    where r.user_id=${uuid(recoveryPlayer)} and r.id=${uuid(run.id)}`)
  if (!result[0]?.finished_at || !result[0].abandoned || Number(result[0].refund_receipts) !== 1)
    throw Error('Recovery verification failed')
  console.log(JSON.stringify(result, null, 2))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
