import {execFileSync} from 'node:child_process'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {batch,items} from './prepare-firefly-assets.mjs'
const git=(args,options={})=>execFileSync('git',args,{encoding:'utf8',maxBuffer:5*1024*1024,...options}).trim()
if(git(['branch','--show-current'])!=='해역추가')throw Error('Unexpected working branch')
if(git(['diff','--cached','--name-only']))throw Error('Index is not empty; inspect existing staged work before staging release')
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''))
const storage=read(batch+'/storage-verification.json'),registration=read(batch+'/registration.json')
if(storage.project!=='ewafafphiovbpjwogwzn'||storage.count!==104||registration.length!==37)throw Error('Complete image verification before staging')
const shadow=resolve('.cache/firefly-release')
const scoped=['supabase/catalog/catalog.json','docs/db/CONTEXT.md','docs/db/local-schema.json','src/features/regions/species-releases.json']
for(const file of scoped)if(!existsSync(shadow+'/'+file))throw Error('Refresh isolated release validation first: '+file)
const paths=[
 'src/features/regions/firefly-art.ts','src/features/regions/region-icons.ts','src/features/regions/fishing-banner.ts','src/features/regions/map-piece-progress.tsx',
 'src/features/fishing/extra-rod-skin-art.tsx','src/features/fishing/fishing-environment.tsx','src/features/fishing/fishing-rods.ts','src/features/fishing/fishing-water.tsx','src/features/fishing/rod-artwork.json','src/features/fishing/rod-gauge-charm.tsx','src/features/fishing/rod-gauge.tsx','src/features/fishing/rod-shop-assets.json',
 'src/features/aquarium/firefly-frame-layouts.json','src/features/aquarium/firefly-mythic-action-layouts.json','src/features/aquarium/swim-frame-layout.ts','src/features/aquarium/mythic-swim.ts',
 'src/features/collection/thumbnail-assets.json','assets/optimized-thumbnails/manifest.json','assets/optimized-rod-shop/manifest.json','assets/references/mythic-sprites/sources.json','assets/references/mythic-sprites/index.md',
 batch,'artifacts/previews/firefly','public/regions/firefly','public/region-icons/firefly-v1.png','public/fishing/close-water/firefly-v1.png','public/fishing/platforms/firefly-v1.png',
 ...readdirSync('scripts').filter(n=>n.includes('firefly')).map(n=>'scripts/'+n),
 ...readdirSync('tests').filter(n=>n.startsWith('firefly-')).map(n=>'tests/'+n),
 ...readdirSync('supabase/migrations').filter(n=>/^\d{14}_firefly_/.test(n)).map(n=>'supabase/migrations/'+n),
 ...items.filter(i=>i.rarity==='mythic').map(i=>`public/aquarium/swim/${i.id}_swim8_v1_sprite.png`),
]
const thumbs=read('src/features/collection/thumbnail-assets.json'),rods=read('src/features/fishing/rod-shop-assets.json')
for(const item of items)for(const path of Object.values(thumbs[item.thumbnail_path]))paths.push('public'+path)
for(const path of Object.values(rods.firefly))paths.push('public'+path)
for(const path of paths)if(!existsSync(path))throw Error('Missing release file: '+path)
git(['add','--',...new Set(paths)])
// Stage HEAD + fairy versions of shared data and generated documents, while
// keeping the user's pre-existing versions in the working tree untouched.
for(const file of scoped){
 const hash=git(['hash-object','-w','--stdin'],{input:readFileSync(shadow+'/'+file)})
 git(['update-index','--add','--cacheinfo',`100644,${hash},${file}`])
}
console.log(git(['diff','--cached','--stat']))
console.log('Staged fairy release only. Pre-existing user edits remain unstaged.')
