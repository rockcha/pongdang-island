import { loadEnvFile } from 'node:process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
loadEnvFile('.env.storage.local')
const host = new URL(process.env.SUPABASE_URL).hostname
if (host !== 'ewafafphiovbpjwogwzn.supabase.co') throw Error('Wrong target project')
const manifest = JSON.parse(readFileSync('assets/siren/myth-fish-expansion.json', 'utf8'))
const catalog = JSON.parse(readFileSync('supabase/catalog/catalog.json', 'utf8'))
const ids = manifest.entries.map(e => e.id)
const rows = catalog.collectible_species.filter(s => ids.includes(s.id))
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
function check(result) { if (result.error) throw Error(result.error.message); return result.data }
const region = check(await client.from('regions').select('id').eq('id', 'siren'))
if (region.length !== 1 || rows.length !== 3) throw Error('Missing region or catalog entries')
const existing = check(await client.from('collectible_species').select('*').in('id', ids))
for (const row of existing) {
  const expected = rows.find(s => s.id === row.id)
  if (row.name !== expected.name || row.rarity !== expected.rarity || row.native_region_id && row.native_region_id !== 'siren') throw Error('Existing identity conflict')
}
const files = []
for (const row of rows) for (const key of [row.thumbnail_path, row.sprite_sheet_path]) {
  const bytes = readFileSync(`${manifest.batch}/${key}`)
  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/collectibles/${key}`)
  if (!response.ok) throw Error('Public image unavailable: ' + key)
  const hash = b => createHash('sha256').update(b).digest('hex')
  if (hash(bytes) !== hash(Buffer.from(await response.arrayBuffer()))) throw Error('Image hash mismatch: ' + key)
  files.push({ key, sha256: hash(bytes) })
}
// Existing triggers require habitats before native designation. New IDs only;
// each phase is retryable, and no unrelated species or player data is touched.
const missing = rows.filter(s => !existing.some(e => e.id === s.id))
if (missing.length) check(await client.from('collectible_species').insert(missing.map(s => ({ ...s, native_region_id: null, facing_direction: 'right' }))))
check(await client.from('collectible_habitats').upsert(ids.map(species_id => ({ species_id, region_id: 'siren' })), { onConflict: 'species_id,region_id', ignoreDuplicates: true }))
check(await client.from('collectible_species').update({ native_region_id: 'siren' }).in('id', ids))
const verified = check(await client.from('collectible_species').select('*').in('id', ids))
const habitats = check(await client.from('collectible_habitats').select('species_id,region_id').in('species_id', ids))
for (const expected of rows) {
  const actual = verified.find(s => s.id === expected.id)
  for (const key of Object.keys(expected)) if (String(actual?.[key]) !== String(expected[key])) throw Error(`Catalog mismatch: ${expected.id}.${key}`)
  if (habitats.filter(h => h.species_id === expected.id).map(h => h.region_id).join() !== 'siren') throw Error('Habitat mismatch')
}
const proof = { projectHost: host, verifiedAt: new Date().toISOString(), species: verified.map(({ id, name, rarity, sell_price, native_region_id }) => ({ id, name, rarity, sell_price, native_region_id })), habitats, files, scope: 'Three new catalog species and six public Storage images only; migration history and whole schema parity not verified or changed.' }
writeFileSync(`${manifest.batch}/remote-verification.json`, JSON.stringify(proof, null, 2) + '\n')
console.log(JSON.stringify(proof, null, 2))
