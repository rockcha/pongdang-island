import { loadEnvFile } from 'node:process'
import { readdir, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Node-only credentials. Never import this script into the application.
async function main() {
  try { loadEnvFile('.env.storage.local') } catch (error) { if (error.code !== 'ENOENT') throw error }
  const args = process.argv.slice(2)
  const folders = args.filter(arg => !arg.startsWith('--'))
  if (folders.length !== 1 || args.some(arg => arg.startsWith('--') && !['--dry-run', '--overwrite'].includes(arg))) {
    throw new Error('Usage: npm run storage:upload -- <batch-folder> [--dry-run] [--overwrite]')
  }
  const root = await realpath(folders[0])
  const files = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Symbolic links are not supported.')
      const local = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(local)
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
        const key = path.relative(root, local).split(path.sep).join('/')
        if (!/^(fish|trash|decorations|map)\/(normal|rare|epic|mythic)\/[^/]+\.png$/i.test(key) && !/^equipment\/rods\/[a-z0-9-]+\/(thumbnail|reel-frame|reel-rotor|float)\.png$/.test(key) && !/^vessels\/[a-z0-9-]+\.png$/.test(key)) {
          throw new Error(`Unexpected image path: ${key}. Select the batch folder containing fish/, decorations/, etc.`)
        }
        files.push({ local, key })
      }
    }
  }
  await walk(root)
  files.sort((a, b) => a.key.localeCompare(b.key))
  if (!files.length) throw new Error('No PNG files found.')
  for (const file of files) console.log(`collectibles/${file.key}`)
  if (args.includes('--dry-run')) { console.log(`Dry run: ${files.length} PNGs. Nothing uploaded.`); return }
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.storage.local (legacy SUPABASE_SERVICE_ROLE_KEY also supported).')
  const endpoint = new URL(url)
  if (endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
    throw new Error('SUPABASE_URL must be the project base URL (https://PROJECT.supabase.co), without /rest/v1 or /storage/v1.')
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  let uploaded = 0, skipped = 0
  for (const file of files) {
    const { error } = await client.storage.from('collectibles').upload(file.key, await readFile(file.local), {
      contentType: 'image/png', upsert: args.includes('--overwrite'),
    })
    if (error) {
      if (!args.includes('--overwrite') && (String(error.statusCode) === '409' || error.message === 'The resource already exists')) {
        skipped++; console.log(`Already exists: ${file.key}`); continue
      }
      throw new Error(`Upload failed: ${file.key} (status ${error.statusCode ?? 'unknown'}). Check project credentials and Storage permissions; completed uploads remain in place.`)
    }
    uploaded++; console.log(`Uploaded: ${file.key}`)
  }
  console.log(`Finished: ${uploaded} uploaded, ${skipped} existing files skipped.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
