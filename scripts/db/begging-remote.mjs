import { loadEnvFile } from 'node:process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
loadEnvFile('.env.storage.local')
const project = 'ewafafphiovbpjwogwzn',
  dir = 'supabase/inspection/remote/begging',
  mode = process.argv[2]
const files = [
  '20261025172450_begging_gold_requests.sql',
  '20261025172625_validate_begging_experience_source.sql',
]
if (new URL(process.env.SUPABASE_URL).hostname !== project + '.supabase.co')
  throw Error('Project mismatch')
const norm = (s) => s.replaceAll('\r\n', '\n'),
  quote = (s) => "'" + s.replaceAll("'", "''") + "'"
async function api(path, options = {}) {
  const r = await fetch('https://api.supabase.com/v1/projects/' + project + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + process.env.SUPABASE_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  })
  if (!r.ok) throw Error('HTTP ' + r.status + ': ' + (await r.text()).slice(0, 350))
  return r.json()
}
const query = (sql, readOnly = true) =>
  api('/database/query', {
    method: 'POST',
    body: JSON.stringify({ query: sql, read_only: readOnly }),
  })
const identity = await api('')
if (identity.id !== project || identity.name !== 'pongdang-island') throw Error('Identity mismatch')
const local = JSON.parse(readFileSync('docs/db/local-schema.json', 'utf8')).structure
const dependencies = local.functions.filter(
  (f) =>
    f.schema === 'app_private' &&
    ['award_experience', 'get_gold_wallet', 'sync_player_profile'].includes(f.name),
)
const functionSql =
  "select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname in('public','app_private') and p.proname like 'begging_%') or(n.nspname='app_private' and p.proname in('award_experience','get_gold_wallet','sync_player_profile'))"
const warnings = (data) =>
  (data.lints ?? [])
    .filter((x) => ['WARN', 'ERROR'].includes(x.level))
    .map((x) => x.cache_key ?? x.name)
    .sort()
mkdirSync(dir, { recursive: true })
if (mode === 'deploy') {
  const current = await query(functionSql)
  for (const f of dependencies)
    if (
      !current.some(
        (c) =>
          c.schema === f.schema && c.name === f.name && norm(c.definition) === norm(f.definition),
      )
    )
      throw Error('Dependency drift: ' + f.name)
  if (!existsSync(dir + '/advisors-before.json'))
    writeFileSync(
      dir + '/advisors-before.json',
      JSON.stringify(await api('/advisors/security'), null, 2),
    )
  for (const file of files) {
    const source = norm(readFileSync('supabase/migrations/' + file, 'utf8')),
      version = file.slice(0, 14)
    const history = await query(
      `select statements from supabase_migrations.schema_migrations where version=${quote(version)}`,
    )
    if (history.length) {
      if (norm(history[0].statements[0]) !== source) throw Error('Recorded migration differs')
      console.log('Already recorded ' + version)
      continue
    }
    const sql = ['begin;', "set local lock_timeout='3s';", "set local statement_timeout='30s';"]
    if (file === files[0]) {
      const oldCheck = (
        await query(
          "select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='app_private.experience_events'::regclass and conname='experience_events_source_check'",
        )
      )[0].definition
      const expected =
        "CHECK ((source = ANY (ARRAY['manual'::text, 'trap'::text, 'harbor'::text, 'friend_lure'::text, 'friend_feeding'::text, 'friend_cleaning'::text])))"
      if (oldCheck !== expected) throw Error('XP source constraint drift')
      writeFileSync(
        dir + '/preflight.json',
        JSON.stringify(
          {
            project,
            capturedAt: new Date().toISOString(),
            dependencies: current,
            xpSourceCheck: oldCheck,
          },
          null,
          2,
        ),
      )
      for (const f of dependencies) {
        const hash = createHash('md5').update(norm(f.definition)).digest('hex')
        sql.push(
          `do $$begin if md5(replace(pg_get_functiondef(${quote('app_private.' + f.name + '(' + { award_experience: 'uuid,text,uuid,integer', get_gold_wallet: '', sync_player_profile: '' }[f.name] + ')')}::regprocedure),chr(13)||chr(10),chr(10)))<>${quote(hash)} then raise exception 'BEGGING_DEPENDENCY_DRIFT';end if;end$$;`,
        )
      }
      sql.push(
        `do $$begin if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='app_private.experience_events'::regclass and conname='experience_events_source_check') is distinct from ${quote(expected)} then raise exception 'XP_SOURCE_DRIFT';end if;end$$;`,
      )
    }
    sql.push(
      source,
      `insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(version)},${quote(file.slice(15, -4))},array[${quote(source)}]);`,
      'commit;',
    )
    await query(sql.join('\n'), false)
    console.log('Applied ' + version)
  }
}
if (mode === 'deploy' || mode === 'verify') {
  const functions = await query(functionSql)
  if (functions.filter((f) => f.name.startsWith('begging_')).length !== 13)
    throw Error('Missing feature functions')
  for (const f of functions)
    if (
      !local.functions.some(
        (l) =>
          l.schema === f.schema &&
          l.name === f.name &&
          l.arguments === f.arguments &&
          norm(l.definition) === norm(f.definition),
      )
    )
      throw Error('Function mismatch: ' + f.name)
  const privileges = await query(
    "select n.nspname as schema,p.proname as name,p.prosecdef as definer,has_function_privilege('anon',p.oid,'EXECUTE') as anon,has_function_privilege('authenticated',p.oid,'EXECUTE') as player from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','app_private') and p.proname like 'begging_%'",
  )
  if (
    privileges.some(
      (p) =>
        p.anon ||
        (p.name === 'begging_payload' ? p.player : !p.player) ||
        (p.schema === 'public' && p.definer),
    )
  )
    throw Error('RPC permissions mismatch')
  const tables = await query(
    "select c.relname as name,c.relrowsecurity as rls,has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') as player_access,has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') as anon_access from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app_private' and c.relname in('begging_requests','begging_transfers')",
  )
  if (tables.length !== 2 || tables.some((t) => !t.rls || t.player_access || t.anon_access))
    throw Error('Private tables exposed')
  const xpCheck = (
    await query(
      "select convalidated as validated,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='app_private.experience_events'::regclass and conname='experience_events_source_check'",
    )
  )[0]
  if (!xpCheck.validated || !xpCheck.definition.includes("'begging'"))
    throw Error('XP source not validated')
  const smoke = await query(
    'begin;\n' +
      readFileSync('tests/fixtures/begging-smoke.sql', 'utf8') +
      '\nrollback;select true as rolled_back;',
    false,
  )
  if (!smoke.some((x) => x.rolled_back)) throw Error('Smoke rollback missing')
  const advisors = await api('/advisors/security')
  writeFileSync(dir + '/advisors-after.json', JSON.stringify(advisors, null, 2))
  if (
    JSON.stringify(warnings(advisors)) !==
    JSON.stringify(warnings(JSON.parse(readFileSync(dir + '/advisors-before.json', 'utf8'))))
  )
    throw Error('Security warnings changed')
  writeFileSync(
    dir + '/verification.json',
    JSON.stringify(
      {
        project,
        verifiedAt: new Date().toISOString(),
        migrations: files,
        scope:
          'Feature/dependency definitions, private table/RPC permissions, validated XP source, synthetic gold conservation/minimum/self/closed/cap/history and exact XP/retry smoke rolled back. No full schema parity, independent-session concurrency/load test or frontend deployment.',
        tables,
        privileges,
        xpCheck,
        authenticatedRollbackSmoke: true,
        securityWarningsUnchanged: true,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    'Verified exact gold/XP/retry/history rollback smoke, private access and XP validation; security warnings unchanged.',
  )
}
if (!['deploy', 'verify'].includes(mode)) throw Error('Usage: begging-remote.mjs deploy|verify')
