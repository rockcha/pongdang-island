import { loadEnvFile } from 'node:process'
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { optimizePng } from './optimize-png-lossless.mjs'

loadEnvFile('.env.storage.local')
const project = 'https://ewafafphiovbpjwogwzn.supabase.co'
if (process.env.SUPABASE_URL !== project) throw Error('Unexpected Storage project')
const manifestPath = 'assets/storage-upload/new/20261025-014955/manifest.json'
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const root = resolve(dirname(manifestPath))
const client = createClient(project, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
async function saveManifest() {
  for (let attempt = 0; ; attempt++) {
    try {
      writeFileSync(manifestPath + '.tmp', JSON.stringify(manifest, null, 2) + '\n')
      renameSync(manifestPath + '.tmp', manifestPath)
      return
    } catch (error) {
      if (attempt >= 9 || !['EPERM', 'EBUSY', 'UNKNOWN'].includes(error.code)) throw error
      await delay(200 * (attempt + 1))
    }
  }
}
let verified = 0
for (const file of manifest.files) {
  if (file.status !== 'generated' || !/^[a-z0-9-]+-panorama-v2\.png$/.test(file.storage_path)) throw Error('Unexpected panorama entry')
  const local = resolve(root, file.local_path)
  if (relative(root, local).startsWith('..')) throw Error('Path outside batch')
  const original = readFileSync(local)
  if (hash(original) !== file.sha256) throw Error('Local image hash mismatch: ' + file.theme_id)
  if (file.uploaded && file.uploaded_project === 'ewafafphiovbpjwogwzn') { verified++; continue }
  const optimized = optimizePng(original)
  const bytes = optimized.length < original.length ? optimized : original
  if (!bytes.equals(original)) {
    writeFileSync(local, bytes)
    file.generated_sha256 ??= file.sha256
    file.sha256 = hash(bytes)
    await saveManifest()
  }
  const { error } = await client.storage.from('aquarium-backgrounds').upload(file.storage_path, bytes, { contentType: 'image/png', cacheControl: '31536000', upsert: false })
  if (error && String(error.statusCode) !== '409' && error.message !== 'The resource already exists') throw Error('Upload failed: ' + file.theme_id + ' (' + (error.statusCode ?? 'unknown') + ')')
  const response = await fetch(project + '/storage/v1/object/public/aquarium-backgrounds/' + file.storage_path)
  if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== file.sha256) throw Error('Public image mismatch: ' + file.theme_id)
  Object.assign(file, { uploaded: true, uploaded_project: 'ewafafphiovbpjwogwzn', verified_at: new Date().toISOString() })
  await saveManifest()
  verified++
  if (verified % 10 === 0 || verified === manifest.files.length) console.log(`Verified public panoramas: ${verified}/${manifest.files.length}`)
}
