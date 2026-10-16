import { readFileSync } from 'node:fs'

// Historical feature fixtures intentionally omit optional catalog batches.
// Full current-state coverage lives in npm run db:verify and uses migrations.
export function legacyCoreFiles(through: number): string[] {
  const manifest = JSON.parse(readFileSync('supabase/legacy-manifest.json', 'utf8')) as { files: { path: string }[] }
  return manifest.files.map(f => f.path).filter(path => {
    const version = Number(path.slice(0, 2))
    return version <= through && ![18, 19, 20, 21, 24].includes(version)
  })
}
