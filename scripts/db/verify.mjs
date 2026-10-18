import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { createLocalDatabase, readCatalog, canonical, migrationFiles, readSql } from './local.mjs'
import { catalogSql } from './catalog.mjs'
import { parseExport, differences } from './compare.mjs'

const manifest = JSON.parse(readFileSync('supabase/legacy-manifest.json', 'utf8'))
// Only 01–38 belong to the frozen baseline manifest. Later legacy folders remain
// available as historical references and must not be mistaken for baseline files.
const discovered = readdirSync('supabase/sql').filter(f => /^(?:0[1-9]|[12]\d|3[0-8])-/.test(f)).flatMap(dir => readdirSync(`supabase/sql/${dir}`).filter(f => f.endsWith('.sql')).map(file => `${dir}/${file}`)).sort()
assert.deepEqual(discovered, manifest.files.map(f => f.path).sort(), 'Legacy SQL is frozen. Create a migration instead.')
for (const file of manifest.files) assert.equal(createHash('sha256').update(readSql(`supabase/sql/${file.path}`)).digest('hex'), file.sha256, `Frozen SQL changed: ${file.path}`)
assert.equal(createHash('sha256').update(readSql(`supabase/migrations/${manifest.baseline}`)).digest('hex'), manifest.baselineSha256, 'Baseline is immutable')
const db = await createLocalDatabase()
const legacy = await createLocalDatabase()
try {
  await db.exec(readSql(`supabase/migrations/${manifest.baseline}`))
  for (const file of manifest.files) await legacy.exec(readSql(`supabase/sql/${file.path}`))
  const inspection = readFileSync('supabase/inspection/schema.sql', 'utf8')
  const current = (await db.query(inspection)).rows[0].snapshot.structure
  const old = (await legacy.query(inspection)).rows[0].snapshot.structure
  assert.equal(canonical(current), canonical(old), 'Baseline must reproduce all legacy definitions')
  assert.equal(migrationFiles()[0], manifest.baseline, 'New migrations must follow the frozen baseline')
  for (const file of migrationFiles().slice(1)) await db.exec(readSql(`supabase/migrations/${file}`))
  const latest = (await db.query(inspection)).rows[0].snapshot.structure
  const evidence = { capturedAt: '2026-10-16T00:00:00Z', database: 'test-fixture-only', structure: latest }
  for (const shape of [evidence, { snapshot: evidence }, [{ snapshot: evidence }], [{ snapshot: JSON.stringify(evidence) }]]) assert.deepEqual(parseExport(shape), evidence)
  assert.throws(() => parseExport([]), /exactly one/)
  assert.throws(() => parseExport({ structure: latest }), /Expected JSON/)
  assert.deepEqual(differences(latest, structuredClone(latest)), [])
  const drift = structuredClone(latest)
  drift.tables[0].rls = false
  drift.functions[0].definition += '\n-- unexpected drift'
  delete drift.functionGrants
  assert.deepEqual(differences(latest, drift).sort(), ['functionGrants', 'functions', 'tables'])
  assert.ok(latest.tables.every(t => t.rls), 'Every application table must enable RLS')
  assert.ok(latest.functions.filter(f => f.schema === 'public').every(f => !f.securityDefiner), 'Public RPC wrappers must use invoker security')
  const catalog = JSON.parse(readFileSync('supabase/catalog/catalog.json', 'utf8'))
  assert.equal(canonical(await readCatalog(db)), canonical(catalog), 'Catalog must match migrations')
  const uid = '00000000-0000-0000-0000-000000000777'
  await db.query('insert into auth.users(id) values($1)', [uid])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,321,'{\"bait\":7}')", [uid])
  await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'pinkchin-blenny',.4,.6)", [uid])
  const before = (await db.query('select * from public.player_collectibles where user_id=$1', [uid])).rows
  const sql = catalogSql(catalog)
  await db.exec(sql); await db.exec(sql)
  assert.equal(canonical(await readCatalog(db)), canonical(catalog), 'Repeated catalog application must be stable')
  assert.deepEqual((await db.query('select * from public.player_collectibles where user_id=$1', [uid])).rows, before)
  assert.deepEqual((await db.query('select gold,inventory from public.player_wallets where user_id=$1', [uid])).rows, [{ gold: 321, inventory: { bait: 7 } }])
  await assert.rejects(db.exec(readSql(`supabase/migrations/${manifest.baseline}`)), /BASELINE_REQUIRES_EMPTY_APP_SCHEMA/)
  await db.exec('rollback')
  console.log('PASS: frozen history, baseline replay, RLS, RPC security, catalog consistency, repeated catalog deployment preserves ownership/wallet, baseline rejects existing DB.')
} finally { await db.close(); await legacy.close() }
