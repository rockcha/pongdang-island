import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createLocalDatabase, replayMigrations, migrationFiles, readCatalog, canonical, readSql } from './local.mjs'
import { parseExport, differences } from './compare.mjs'

export function bundleHash() {
  const hash = createHash('sha256')
  for (const file of migrationFiles()) hash.update(file).update('\0').update(readSql(`supabase/migrations/${file}`)).update('\0')
  return hash.digest('hex')
}
export async function snapshot(db) {
  return (await db.query(readFileSync('supabase/inspection/schema.sql', 'utf8'))).rows[0].snapshot
}
export function summarize(structure, hash) {
  return `# 로컬 DB 컨텍스트 (자동 생성)\n\n원격 DB의 현재 상태가 아닙니다. migrations 전체를 PGlite에 재생한 기대 상태입니다.\n\n- migration SHA-256: \`${hash}\`\n- migrations: ${migrationFiles().join(', ')}\n- 전체 정의·컬럼·권한·정책: [local-schema.json](local-schema.json)\n- 원격 상태와 전환 절차: [DB 관리](../systems/database-management.md)\n\n## 테이블\n\n| 테이블 | RLS | 컬럼 |\n| --- | --- | --- |\n${structure.tables.map(t => `| ${t.schema}.${t.name} | ${t.rls} | ${structure.columns.filter(c => c.schema === t.schema && c.table === t.name).map(c => `${c.name}: ${c.type}${c.nullable ? '?' : ''}`).join(', ')} |`).join('\n')}\n\n## 함수 (최종 정의)\n\n아래 시그니처로 local-schema.json의 functions에서 본문을 찾습니다. 과거 SQL을 역순으로 추측하지 않습니다.\n\n| 함수 | 인자 | SECURITY DEFINER |\n| --- | --- | --- |\n${structure.functions.map(f => `| ${f.schema}.${f.name} | ${f.arguments.replaceAll('|','\\|')} | ${f.securityDefiner} |`).join('\n')}\n`
}

const mode = process.argv[2] ?? 'check'
if (mode === 'remote') {
  const input = process.argv[3]
  if (!input) throw new Error('Usage: npm run db:remote -- path/to/export.json')
  const remote = parseExport(JSON.parse(readFileSync(input, 'utf8').replace(/^\uFEFF/, '')))
  const db = await createLocalDatabase()
  try {
    await replayMigrations(db)
    const local = await snapshot(db)
    const changed = differences(local.structure, remote.structure)
    const report = { inspectedAt: new Date().toISOString(), sourceFile: input, capturedAt: remote.capturedAt, database: remote.database, serverVersion: remote.serverVersion, migrationHash: bundleHash(), status: changed.length ? 'differences-require-review' : 'structure-matches', changedSections: changed, limitations: ['Project identity must be verified in the Dashboard; database name is not project identity.', 'Postgres version/default privileges may create differences; review, never auto-repair.', 'Does not verify player data, catalog rows, runtime flags, Auth settings, Storage objects or Realtime delivery.', 'Structural equality does not prove migration execution history. Do not auto-mark the baseline applied.'] }
    mkdirSync('supabase/inspection/remote', { recursive: true })
    writeFileSync('supabase/inspection/remote/comparison.json', JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(report, null, 2))
    if (changed.length) process.exitCode = 1
  } finally { await db.close() }
} else if (mode === 'write' || mode === 'check') {
  const db = await createLocalDatabase()
  try {
    await replayMigrations(db)
    const local = await snapshot(db)
    const hash = bundleHash()
    const schema = { provenance: 'local-migration-replay; not remote evidence', migrationHash: hash, structure: local.structure }
    const outputs = {
      'docs/db/local-schema.json': JSON.stringify(schema, null, 2) + '\n',
      'docs/db/CONTEXT.md': summarize(local.structure, hash),
    }
    if (canonical(await readCatalog(db)) !== canonical(JSON.parse(readFileSync('supabase/catalog/catalog.json', 'utf8')))) throw new Error('Catalog source differs from migration result. Generate/review a catalog migration before updating context.')
    for (const [path, contents] of Object.entries(outputs)) {
      if (mode === 'write') { mkdirSync('docs/db', { recursive: true }); writeFileSync(path, contents) }
      else if (readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== contents) throw new Error(`Stale context: ${path}; run npm run db:context`)
    }
    console.log(`PASS: ${local.structure.tables.length} tables, ${local.structure.functions.length} functions; context ${mode === 'write' ? 'generated' : 'current'}. Remote state remains unverified.`)
  } finally { await db.close() }
} else throw new Error(`Unknown mode: ${mode}`)
