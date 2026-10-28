import fs from 'node:fs'
import assert from 'node:assert/strict'
const file = process.argv[2]
assert.ok(
  file && /^supabase\/migrations\/\d{14}_.+\.sql$/.test(file),
  'Use a CLI-created rank migration template',
)
let sql = fs.readFileSync(file, 'utf8')
assert.equal(sql.split('-- RANK_CALIBRATION_SEED').length, 2, 'Seed marker missing or repeated')
assert.equal(sql.split('-- LEGACY_PLACE_DEFINITION').length, 2, 'Legacy marker missing or repeated')
const calibrations = JSON.parse(
  fs.readFileSync('supabase/voyage-bets/generated/rank-calibrations.json', 'utf8'),
)
const quote = (s) => "'" + s.replaceAll("'", "''") + "'"
const values = calibrations.map(
  (c) => `(${quote(c.modelId)},${quote(c.id)},${quote(JSON.stringify(c.data))}::jsonb)`,
)
sql = sql.replace(
  '-- RANK_CALIBRATION_SEED',
  '-- Generated from the reviewed rank calibration source.\ninsert into app_private.voyage_rank_calibrations(model_id,id,data) values\n' +
    values.join(',\n') +
    ';',
)
let legacy = JSON.parse(
  fs.readFileSync('docs/db/local-schema.json', 'utf8'),
).structure.functions.find(
  (f) => f.schema === 'app_private' && f.name === 'voyage_bets_place',
).definition
assert.ok(legacy.includes('if clock_timestamp()<r.opens_at'))
legacy = legacy.replace(
  'if clock_timestamp()<r.opens_at',
  "if r.rules<>'legacy' then raise exception 'VOYAGE_RULES_CHANGED';end if;\n if clock_timestamp()<r.opens_at",
)
sql = sql.replace('-- LEGACY_PLACE_DEFINITION', legacy.trimEnd() + ';\n')
fs.writeFileSync(file, sql)
console.log(
  JSON.stringify({ file, calibrations: calibrations.length, bytes: Buffer.byteLength(sql) }),
)
