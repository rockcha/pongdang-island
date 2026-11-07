import fs from 'node:fs'
import path from 'node:path'
import {batch} from './prepare-hologram-assets.mjs'
// Lossless file copies only. The approved portrait and chart retain their source bytes.
for(const [from,to] of [
 ['assets/storage-upload/new/20261107-151834/regions/neon-abyss-city/map-v2.png',`${batch}/regions/hologram/map-v1.png`],
 ['assets/storage-upload/new/20261107-151834/fishing/scenery/neon-abyss-city-v2.png',`${batch}/fishing/scenery/hologram-v1.png`],
]){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to)}
for(const file of ['regions/hologram/map-v1.png','regions/hologram/overview-v1.png','fishing/scenery/hologram-v1.png','fishing/close-water/hologram-v1.png','fishing/platforms/hologram-v1.png']){
 const target=`public/${file}`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(`${batch}/${file}`,target)
}
console.log('Copied approved hologram scene files into local public assets; no upload or deploy.')
