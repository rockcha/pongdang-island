import fs from 'node:fs'
const catalog = JSON.parse(fs.readFileSync('supabase/catalog/catalog.json', 'utf8'))
const companies = JSON.parse(fs.readFileSync('supabase/voyage-bets/companies.json', 'utf8'))
const ids = [...new Set(companies.flatMap((c) => c.baitIds))].sort()
const artwork = Object.fromEntries(
  ids.map((id) => {
    const bait = catalog.fishing_baits.find((b) => b.id === id)
    if (!bait?.image_path) throw Error('Missing voyage bait artwork: ' + id)
    return [id, bait.image_path]
  }),
)
const file = 'src/features/voyage-bets/bait-artwork.json',
  text = JSON.stringify(artwork, null, 2) + '\n'
if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text)
console.log('Voyage bait artwork: ' + ids.length + ' catalog images')
