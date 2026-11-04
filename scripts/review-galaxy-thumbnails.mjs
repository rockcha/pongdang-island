import sharp from 'sharp'
import {batch} from './prepare-galaxy-assets.mjs'
for(let start=0;start<112;start+=12){
 const layers=[]
 for(const [n,bg] of ['light','dark'].entries())for(let j=0;j<2&&start+j*6<112;j++)layers.push({input:await sharp(`${batch}/review/thumbs-${start+j*6}-${bg}.png`).toBuffer(),left:n*900,top:j*640})
 await sharp({create:{width:1800,height:1280,channels:4,background:'#fff7e6'}}).composite(layers).png().toFile(`artifacts/galaxy-thumb-review-${start}.png`)
}
