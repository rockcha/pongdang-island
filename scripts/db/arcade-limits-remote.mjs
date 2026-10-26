import { loadEnvFile } from 'node:process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
loadEnvFile('.env.storage.local')
const project = 'ewafafphiovbpjwogwzn',
  file = '20261025181320_arcade_shadow_catalog_limit_and_odd_even_30.sql'
const dir = 'supabase/inspection/remote/arcade-limits',
  norm = (s) => s.replaceAll('\r\n', '\n'),
  quote = (s) => "'" + s.replaceAll("'", "''") + "'"
const names = [
  'shadow_game',
  'shadow_new_round',
  'shadow_run_response',
  'odd_even_game',
  'odd_even_response',
]
const source = norm(readFileSync('supabase/migrations/' + file, 'utf8'))
if (new URL(process.env.SUPABASE_URL).hostname !== project + '.supabase.co')
  throw Error('Project mismatch')
async function api(path, options = {}) {
  const response = await fetch('https://api.supabase.com/v1/projects/' + project + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + process.env.SUPABASE_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok)
    throw Error('Management API ' + response.status + ': ' + (await response.text()).slice(0, 250))
  return response.json()
}
const query = (sql, readOnly = true) =>
  api('/database/query', {
    method: 'POST',
    body: JSON.stringify({ query: sql, read_only: readOnly }),
  })
const identity = await api('')
if (identity.id !== project || identity.name !== 'pongdang-island')
  throw Error('Project identity mismatch')
mkdirSync(dir, { recursive: true })
const metadata = `select p.proname as name,pg_get_functiondef(p.oid) as definition,p.prosecdef as definer,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated,has_function_privilege('anon',p.oid,'EXECUTE') as anon
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in (${[...names, 'shadow_question_pool'].map(quote).join(',')})`
const warnings = (data) =>
  (data.lints ?? [])
    .filter((l) => ['WARN', 'ERROR'].includes(l.level))
    .map((l) => l.cache_key ?? l.name)
    .sort()
const before = await api('/advisors/security')
const history = await query(
  `select statements from supabase_migrations.schema_migrations where version=${quote(file.slice(0, 14))}`,
)
if (history.length) {
  if (norm(history[0].statements[0]) !== source) throw Error('Recorded migration differs')
} else {
  const old = JSON.parse(
    execFileSync(
      'git',
      [
        '-c',
        'safe.directory=C:/Users/user/Desktop/pongdang-island',
        'show',
        'HEAD:docs/db/local-schema.json',
      ],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    ),
  ).structure.functions
  const remote = await query(metadata)
  for (const name of names) {
    const expected = old.find((f) => f.schema === 'app_private' && f.name === name),
      actual = remote.find((f) => f.name === name)
    if (!expected || !actual || norm(expected.definition) !== norm(actual.definition))
      throw Error('Remote dependency drift: ' + name)
  }
  if (remote.some((f) => f.name === 'shadow_question_pool'))
    throw Error('Unexpected existing question helper')
  const columns = await query(
    "select table_name,column_name,column_default from information_schema.columns where table_schema='public' and ((table_name='shadow_game_runs' and column_name='question_pool') or(table_name='odd_even_runs' and column_name in('stake','initial_stake')))",
  )
  if (columns.length !== 1 || columns[0].column_default !== '10')
    throw Error('Unexpected starting column state')
  const constraint = (
    await query(
      "select pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.odd_even_runs'::regclass and conname='odd_even_runs_stake_check'",
    )
  )[0].definition
  if (constraint !== 'CHECK (((stake >= 0) AND (stake <= 10485760)))')
    throw Error('Stake bound drift')
  writeFileSync(
    dir + '/before.json',
    JSON.stringify(
      { project, capturedAt: new Date().toISOString(), functions: remote, columns, constraint },
      null,
      2,
    ),
  )
  await query(
    `begin;set local lock_timeout='3s';set local statement_timeout='30s';
 ${source}
 insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0, 14))},'arcade_shadow_catalog_limit_and_odd_even_30',array[${quote(source)}]);commit;`,
    false,
  )
}
const verified = await query(metadata)
const local = JSON.parse(readFileSync('docs/db/local-schema.json', 'utf8')).structure.functions
for (const name of [...names, 'shadow_question_pool']) {
  const expected = local.find((f) => f.schema === 'app_private' && f.name === name),
    actual = verified.find((f) => f.name === name)
  if (!actual || norm(actual.definition) !== norm(expected.definition))
    throw Error('Deployed definition differs: ' + name)
  if (actual.anon || actual.authenticated !== ['shadow_game', 'odd_even_game'].includes(name))
    throw Error('Unexpected helper privileges: ' + name)
}
await query(
  "begin;set local statement_timeout='30s';\n" +
    readFileSync('tests/fixtures/arcade-limits-smoke.sql', 'utf8') +
    '\nrollback;',
  false,
)
const after = await api('/advisors/security'),
  newWarnings = warnings(after).filter((key) => !warnings(before).includes(key))
const columns = await query(
  "select table_name,column_name,column_default from information_schema.columns where table_schema='public' and ((table_name='shadow_game_runs' and column_name='question_pool') or(table_name='odd_even_runs' and column_name in('stake','initial_stake')))",
)
if (
  columns.filter((c) => c.table_name === 'odd_even_runs' && c.column_default === '30').length !== 2
)
  throw Error('Starting defaults not applied')
writeFileSync(
  dir + '/verification.json',
  JSON.stringify(
    {
      project,
      capturedAt: new Date().toISOString(),
      scope: [
        'affected definitions and privileges',
        'starting defaults',
        'synthetic unique-target 105-point run and weekly ranking',
        '30-gold idempotent start and maximum cashout',
        'legacy game continuation',
        'security advisor delta',
      ],
      fullSchemaParity: false,
      verified,
      columns,
      newWarnings,
    },
    null,
    2,
  ),
)
if (newWarnings.length) throw Error('New security warnings: ' + newWarnings.join(', '))
console.log(
  'PASS: arcade limits deployed and re-read; synthetic 105-point weekly score, unique catalog exhaustion, 30-gold start, 20-win payout and legacy continuation verified with rollback. No new security warnings.',
)
