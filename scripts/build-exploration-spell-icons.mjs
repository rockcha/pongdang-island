import {build} from 'vite'
import fs from 'node:fs/promises'
import sharp from 'sharp'

// Vector source shared with combat effects; no raster images are embedded in the icons.
const built=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:false,target:'es2022',lib:{entry:'src/features/exploration/spell-visuals.ts',formats:['es']}}})
const output=Array.isArray(built)?built[0]:built
const code=output.output.find(item=>item.type==='chunk').code
const {spellVisuals}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const extra=JSON.parse(await fs.readFile('src/features/exploration/spell-glyphs.json','utf8'))
const shapes={
 fire:['M44 6c4 18-14 18-8 34-9-3-10-10-10-10C9 50 21 72 40 72c21 0 32-21 15-42 0 10-6 13-6 13 6-18-5-37-5-37Z','M41 37c2 12-10 12-8 22 2 12 20 12 18-1-1-9-10-11-10-21Z'],
 drop:['M40 6C32 25 15 34 15 49a25 25 0 0 0 50 0C65 34 48 25 40 6Z','M25 47c0 12 6 17 15 18M40 15v19'],
 stone:['m24 15 27-3 17 23-8 26-26 10-22-21Z','m24 15 10 27 34-7M34 42l-1 29M12 50l22-8 26 19M51 12 34 42','m8 21 12 4M4 39l9 1M12 65l10-5'],
 thorns:['m15 66 9-50 10 35L45 6l8 43 12-24 4 41Z','m24 16-1 41M45 6l-2 52M9 70h62'],
 rune:['m40 7 23 13v29L40 72 17 49V20Z','M27 34q13-16 26 0-13 16-26 0ZM40 34v25m-7-6h14M29 17l11 7 11-7'],
 lance:['m40 3 11 27-8 10v32h-6V40L29 30Z','M40 9v50M21 43h38M28 50h24','m18 15 7 8m30 0 7-8M11 31h10m38 0h10'],
 snow:['M40 5v70M10 22l60 36M10 58l60-36','M30 10l10 10 10-10M30 70l10-10 10 10M10 34l15-4-4-15M59 65l-4-15 15-4M10 46l15 4-4 15M59 15l-4 15 15 4','m40 30 9 10-9 10-9-10Z'],
 shards:['m39 5 12 25-13 40-9-36Z','m14 24 10 8-5 29-7-18ZM63 17l5 20-10 24-3-20Z','m39 5-1 65M9 13l5 3m50 48 6 4'],
 chain:['M28 9c-17 0-21 14-12 28s26 10 25-5S34 9 28 9Z','M45 29c-18-2-23 13-14 26s25 13 24-2S51 31 45 29Z','M57 47c-17-1-21 14-12 25s25 8 23-5S63 48 57 47Z'],
 crown:['m13 58-6-31 18 12L40 8l15 31 18-12-6 31Z','M14 67h52M40 8v48M25 39l15 17 15-17','m35 39 5-9 5 9-5 9Z'],
 storm:['M11 33c8-30 57-30 60-2M10 48c7 30 57 27 61-1','M22 23c20-17 46 7 31 24-12 13-33 1-25-13 4-7 15-5 15 2','M16 61l22 10M7 14l12 5m43 47 9-7M40 32l5 6-5 6-5-6Z'],
 sun:['M40 21a19 19 0 1 1 0 38 19 19 0 0 1 0-38Z','M40 4v10m0 52v10M4 40h10m52 0h10M14 14l8 8m36 36 8 8M14 66l8-8m36-36 8-8','m40 30 8 10-8 10-8-10Z'],
 shield:['m40 6 27 12v22c0 19-27 34-27 34S13 59 13 40V18Z','m40 17 8 20 15 4-15 7-8 17-8-17-15-7 15-4Z'],
 leaf:['M15 65C6 15 40 6 68 12c0 26-12 62-53 53Z','m15 65 40-40M21 44l20 2-1-20M32 59l-2-17'],
 ...extra,
}
const overrides={
 'solar-brand':['M40 22a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z','M40 4v10M14 14l8 8M66 14l-8 8M4 40h10m52 0h10M14 66l8-8m36 0 8 8M40 66v10','m40 29 8 11-8 11-8-11Z'],
 'golden-shell-break':['m35 6-23 13v22c0 15 15 28 23 32l-1-21 10-9-10-8 10-14Z','m48 7 20 12v22c0 13-10 23-19 29l4-21-8-7 10-12-9-9Z','M3 43l11 2M67 56l10 6M68 9l7-6'],
 'soul-knot':['M40 24C14-5 1 40 27 46c25 6 30-13 18-18-18-8-27 37-3 43 25 6 37-31 10-31','M25 22q-8 9 3 14m22 18q10 8 10-5','m40 2 4 6-4 6-4-6Z'],
 'silent-seal':['m40 5 24 13v29L40 73 16 47V18Z','M26 28h28M26 37h28M26 46h28M30 57h20','M7 12l66 56M27 14l13 7 13-7'],
 'lapis-veil':['m40 5 27 13v23c0 17-27 32-27 32S13 58 13 41V18Z','m40 18 13 22-13 22-13-22Z','M22 22 40 12l18 10M40 20v41M27 40h26'],
 'sandstone-skin':['m24 12 28 2 16 25-9 25-26 8-21-23Z','m24 12 10 29 34-2M34 41l-1 31M12 49l22-8 25 23M52 14 34 41','M20 32l9-4M43 57l11-4M37 20l6 7'],
 light:['M28 20q12-20 24 0l8 7v35H20V27Z','M24 28h32M28 62v7h24v-7M40 10V5','m40 31 6 10 9 4-9 5-6 11-6-11-9-5 9-4Z'],
 tide:['M40 7 65 19v23c0 18-25 31-25 31S15 60 15 42V19Z','M40 24c-7 12-13 16-13 24a13 13 0 0 0 26 0c0-8-6-12-13-24Z','M23 20l17-7 17 7M33 48q0 8 8 10'],
 'compressed-water-bolt':['M61 15C43 13 23 22 19 39 11 63 38 73 55 58 67 48 69 30 61 15Z','M61 15 34 47M8 10l18 13M5 28l13 5M30 8l8 10','M30 44q-2 12 11 12'],
 'sun-god-glare':['M7 40q33-35 66 0-33 35-66 0Z','M40 23a17 17 0 1 1 0 34 17 17 0 0 1 0-34Z','M40 31v18M15 13l8 9M40 4v12M65 13l-8 9M15 67l8-9M65 67l-8-9'],
 'judgment-of-ra':['M40 24a17 17 0 1 1 0 34 17 17 0 0 1 0-34Z','M23 35 5 23l4 19 15 9M57 35l18-12-4 19-15 9','M40 4v12M17 8l8 13M63 8l-8 13M40 60v15m-10-8h20','m40 30 8 11-8 10-8-10Z'],
 'black-sandstorm':['M13 22C27 7 63 9 69 25 55 42 27 44 21 56c5 9 15 13 25 14','M10 35c18 17 49 2 57-9M19 48c15 4 36-3 46-13M26 61l29-12M46 70l9-9','m6 52 3-5 4 4-3 5ZM64 52l5-4 4 5-6 4ZM37 18l4-4 5 4-4 5Z'],
}
const shade=(hex,factor)=>'#'+hex.slice(1).match(/../g).map(value=>Math.round(parseInt(value,16)*factor).toString(16).padStart(2,'0')).join('')
await fs.mkdir('public/exploration/magic',{recursive:true})
await fs.mkdir('public/exploration/magic/svg-v2',{recursive:true})
const entries=Object.entries(spellVisuals)
for(const [id,visual]of entries){
 const paths=overrides[id]??shapes[visual.shape]
 if(!paths)throw Error('Missing vector glyph: '+id)
 const rings=[25,40,55].map((x,i)=>`<ellipse cx="${x}" cy="${23+i*17}" rx="10" ry="16" transform="rotate(-35 ${x} ${23+i*17})"/>`).join('')
 const marks=id==='binding-chain'?`<g fill="none" stroke="${shade(visual.color,.4)}" stroke-width="10">${rings}</g><g fill="none" stroke="url(#body)" stroke-width="6">${rings}</g>`:paths.map((d,i)=>`<path d="${d}" fill="${/[zZ]\s*$/.test(d)?i%2?'url(#highlight)':'url(#body)':'none'}" stroke="${i?visual.accent:shade(visual.color,.42)}" stroke-width="${i?2.2:3.2}"/>`).join('')
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="body" x1=".2" x2=".8" y2="1"><stop stop-color="${visual.accent}"/><stop offset=".42" stop-color="${visual.color}"/><stop offset="1" stop-color="${shade(visual.color,.58)}"/></linearGradient><linearGradient id="highlight" x2=".6" y2="1"><stop stop-color="#fff7da"/><stop offset="1" stop-color="${visual.color}"/></linearGradient><radialGradient id="halo"><stop stop-color="${visual.color}" stop-opacity=".16"/><stop offset="1" stop-color="${visual.color}" stop-opacity="0"/></radialGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#111415" flood-opacity=".32"/></filter></defs><circle cx="48" cy="48" r="44" fill="url(#halo)"/><g transform="translate(8 8)" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)">${marks}</g><path d="m80 17 1.7 4.3L86 23l-4.3 1.7L80 29l-1.7-4.3L74 23l4.3-1.7Z" fill="${visual.accent}" opacity=".8"/></svg>\n`
 await fs.writeFile(`public/exploration/magic/${id}.svg`,svg)
 await fs.writeFile(`public/exploration/magic/svg-v2/${id}.svg`,svg)
}
if(process.argv.includes('--preview')){
 await fs.mkdir('artifacts',{recursive:true})
 const width=7*144,height=Math.ceil(entries.length/7)*144
 for(const [theme,color]of [['light','#fff6e6'],['dark','#111b1b']]){
  const layers=[]
  for(const [i,[id]]of entries.entries()){
   const svg=await fs.readFile(`public/exploration/magic/svg-v2/${id}.svg`)
   layers.push({input:await sharp(svg).resize(88,88).png().toBuffer(),left:(i%7)*144+28,top:Math.floor(i/7)*144+6})
   const label=Buffer.from(`<svg width="144" height="35"><text x="72" y="15" text-anchor="middle" font-family="sans-serif" font-size="9" fill="${theme==='dark'?'#e7d7b6':'#66533e'}">${id}</text></svg>`)
   layers.push({input:label,left:(i%7)*144,top:Math.floor(i/7)*144+104})
  }
  await sharp({create:{width,height,channels:4,background:color}}).composite(layers).png().toFile(`artifacts/exploration-spell-icons-${theme}.png`)
 }
}
console.log(`Prepared ${entries.length} transparent SVG spell icons.`)
