import { loadEnvFile } from 'node:process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
loadEnvFile('.env.storage.local')
const project = 'ewafafphiovbpjwogwzn'
const menu = process.argv[2] === 'menu'
const functionName = menu ? 'menu_status' : 'notification_inbox'
const file = menu
  ? '20261025180608_lightweight_menu_status.sql'
  : '20261025175439_shared_notification_inbox.sql'
const dir = 'supabase/inspection/remote/' + (menu ? 'menu-status' : 'notification-inbox')
const source = readFileSync('supabase/migrations/' + file, 'utf8').replaceAll('\r\n', '\n')
const quote = (s) => "'" + s.replaceAll("'", "''") + "'"
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
const before = await api('/advisors/security')
if (menu) {
  const local = JSON.parse(
    readFileSync('docs/db/local-schema.json', 'utf8'),
  ).structure.functions.find((f) => f.schema === 'app_private' && f.name === 'savings_payload')
  const remote = await query(
    "select pg_get_functiondef('app_private.savings_payload(public.shell_savings,timestamptz)'::regprocedure) definition",
  )
  if (local.definition.replaceAll('\r\n', '\n') !== remote[0].definition.replaceAll('\r\n', '\n'))
    throw Error('Savings payload dependency drift')
}
const history = await query(
  `select statements from supabase_migrations.schema_migrations where version=${quote(file.slice(0, 14))}`,
)
if (history.length) {
  if (history[0].statements[0].replaceAll('\r\n', '\n') !== source)
    throw Error('Migration history differs')
} else {
  const existing = await query(`select to_regprocedure('public.${functionName}()') as existing`)
  if (existing[0].existing) throw Error('Unrecorded function exists; review before changing it')
  await query(
    `begin; set local lock_timeout='3s'; set local statement_timeout='30s';
    ${source}
    insert into supabase_migrations.schema_migrations(version,name,statements)
    values(${quote(file.slice(0, 14))},${quote(menu ? 'lightweight_menu_status' : 'shared_notification_inbox')},array[${quote(source)}]); commit;`,
    false,
  )
}
const verified =
  await query(`select p.prosecdef as definer, p.provolatile as volatility, p.proconfig as config,
  pg_get_functiondef(p.oid) as definition,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated
  from pg_proc p where p.oid='public.${functionName}()'::regprocedure`)
const expected = JSON.parse(
  readFileSync('docs/db/local-schema.json', 'utf8'),
).structure.functions.find((f) => f.schema === 'public' && f.name === functionName)
if (
  verified[0].definition.replaceAll('\r\n', '\n') !== expected.definition.replaceAll('\r\n', '\n')
)
  throw Error('Function definition differs')
if (verified[0].definer || verified[0].anon || !verified[0].authenticated)
  throw Error('Unexpected execution privileges')
if (menu) {
  const helper = (
    await query(
      "select pg_get_functiondef('app_private.menu_status()'::regprocedure) definition,has_function_privilege('anon','app_private.menu_status()','EXECUTE') anon",
    )
  )[0]
  const expectedHelper = JSON.parse(
    readFileSync('docs/db/local-schema.json', 'utf8'),
  ).structure.functions.find((f) => f.schema === 'app_private' && f.name === functionName)
  if (
    helper.anon ||
    helper.definition.replaceAll('\r\n', '\n') !==
      expectedHelper.definition.replaceAll('\r\n', '\n')
  )
    throw Error('Private helper differs')
}
const isolationCheck = menu
  ? "result->'production'->>'total'<>'0' or result->'baitProduction'->>'total'<>'0' or result->'harbor'->'returnsAt'<>'[]'::jsonb or result->'expedition'->'returnsAt'<>'null'::jsonb or result->'savings'->'account'<>'null'::jsonb"
  : 'result->\'notifications\'<>\'[]\'::jsonb or result->\'unread\'<>\'{"friend":0,"general":0,"gift":0,"notice":0}\'::jsonb'
await query(
  `begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
  do $$ declare result jsonb; begin
    result:=public.${functionName}();
    if ${isolationCheck}
      then raise exception 'Synthetic account isolation failed'; end if;
  end $$;
  select set_config('request.jwt.claim.sub','',true);
  do $$ begin
    begin perform public.${functionName}(); raise exception 'Auth guard missing';
    exception when insufficient_privilege then null; end;
  end $$;
  rollback;`,
  false,
)
const after = await api('/advisors/security')
const warnings = (data) =>
  (data.lints ?? [])
    .filter((l) => ['WARN', 'ERROR'].includes(l.level))
    .map((l) => l.cache_key ?? l.name)
    .sort()
const newWarnings = warnings(after).filter((key) => !warnings(before).includes(key))
writeFileSync(
  dir + '/verification.json',
  JSON.stringify(
    {
      project,
      capturedAt: new Date().toISOString(),
      scope: [
        functionName + ' definition and grants',
        'synthetic caller isolation and auth guard',
        'security advisor delta',
      ],
      fullSchemaParity: false,
      verified,
      newWarnings,
    },
    null,
    2,
  ),
)
if (newWarnings.length) throw Error('New security advisor warnings: ' + newWarnings.join(', '))
console.log(
  'PASS: ' +
    functionName +
    ' deployed, definition/grants/auth/isolation verified; no new security warnings. Full schema parity not checked.',
)
