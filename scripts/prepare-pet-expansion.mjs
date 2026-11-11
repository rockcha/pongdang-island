import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve,dirname,isAbsolute} from 'node:path'
import sharp from 'sharp'

// Mechanical sprite extraction only: preserve generated RGBA, apply one fixed
// scale to all cells and add clear margins. Never remove backgrounds or redraw.
const input=process.argv[2]
if(!input)throw Error('Usage: node scripts/prepare-pet-expansion.mjs <generation-inputs.json>')
const document=JSON.parse(await readFile(input,'utf8'))
const entries=Array.isArray(document) ? document : document.items
const root='assets/storage-upload/new/20261111-160000'
await mkdir(`${root}/sources`,{recursive:true});await mkdir(`${root}/pets`,{recursive:true})
const sha=b=>createHash('sha256').update(b).digest('hex')
const items=[],review=[]
for(const entry of entries){
 const source=isAbsolute(entry.source) ? entry.source : resolve(dirname(input),entry.source)
 const bytes=await readFile(source),meta=await sharp(bytes).metadata()
 if(!meta.hasAlpha||!meta.width||meta.width!==meta.height)throw Error(`Invalid atlas ${entry.id}`)
 if(resolve(source)!==resolve(`${root}/sources/${entry.id}.png`))await copyFile(source,`${root}/sources/${entry.id}.png`)
 const resized=await sharp(bytes).resize(1280,1280).png().toBuffer()
 const cells=[]
 for(let i=0;i<16;i++){
  const image=await sharp(resized).extract({left:(i%4)*320,top:Math.floor(i/4)*320,width:320,height:320}).resize(256,256).extend({top:32,bottom:32,left:32,right:32,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
  cells.push(image)
 }
 const atlas=await sharp({create:{width:1280,height:1280,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells.map((input,i)=>({input,left:(i%4)*320,top:Math.floor(i/4)*320}))).png({compressionLevel:9}).toBuffer()
 const atlasPath=`pets/${entry.id}_atlas16_v1_sprite.png`,thumbPath=`pets/${entry.id}_v1_thumbnail.png`
 await writeFile(`${root}/${atlasPath}`,atlas);await writeFile(`public/${atlasPath}`,atlas)
 await writeFile(`${root}/${thumbPath}`,cells[0]);await writeFile(`public/${thumbPath}`,cells[0])
 items.push({...entry,source:`sources/${entry.id}.png`,source_sha256:sha(bytes),sprite_sheet_path:atlasPath,sprite_sha256:sha(atlas),thumbnail_path:thumbPath,thumbnail_sha256:sha(cells[0]),cell:320,grid:[4,4],padding:32})
 for(let j=0;j<4;j++)review.push({input:await sharp(cells[[0,4,8,12][j]]).resize(160,160).flatten({background:j%2?'#283a3c':'#fff8ef'}).png().toBuffer(),left:j*160,top:items.length*160-160})
}
await sharp({create:{width:640,height:entries.length*160,channels:4,background:'#fff8ef'}}).composite(review).png().toFile(`${root}/review.png`)
await writeFile(`${root}/manifest.json`,JSON.stringify({generator:'built-in image_gen',styleReference:'public/pets/wave-cat_v1_thumbnail.png',scope:'Operator sandbox pet characters, not aquarium collectibles',motion:'Fixed seated stage, no travel; four resting/blink poses each for neutral, hungry and lonely, two happy poses and two eating poses',processing:'Fixed whole-sheet resize, equal cell extraction and identical transparent padding. No alpha threshold or background removal.',items},null,2)+'\n')
console.log(`Prepared ${items.length} pet atlases and thumbnails. Review: ${root}/review.png`)
