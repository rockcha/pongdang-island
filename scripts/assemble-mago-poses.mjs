import fs from 'node:fs'
import sharp from 'sharp'
import {batch} from './prepare-hangang-refinement.mjs'
const sources=[],audit=[]
for(let frame=0;frame<8;frame++){
 const path=`${batch}/sources/hangang-mago-pose-${frame}.source`
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 if(info.width!==info.height)throw Error('Pose must have square source canvas')
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 const margin=Math.min(left,top,info.width-right-1,info.height-bottom-1)
 if(margin<info.width*.08)throw Error('Original individual pose needs more margin: '+frame+' '+margin)
 sources.push({path,data,info});audit.push({frame,path,width:info.width,height:info.height,margin,bounds:[left,top,right-left+1,bottom-top+1]})
}
const sourceCell=Math.max(...sources.map(s=>s.info.width)),cell=512,width=cell*4,height=cell*2,out=Buffer.alloc(width*height*4),scale=cell/sourceCell
for(let frame=0;frame<8;frame++){
 const {data,info}=sources[frame],square=Buffer.alloc(sourceCell*sourceCell*4),offset=Math.floor((sourceCell-info.width)/2)
 for(let y=0;y<info.height;y++)data.copy(square,((y+offset)*sourceCell+offset)*4,y*info.width*4,(y+1)*info.width*4)
 const resized=await sharp(square,{raw:{width:sourceCell,height:sourceCell,channels:4}}).resize(cell,cell).ensureAlpha().raw().toBuffer()
 for(let y=0;y<cell;y++)resized.copy(out,((Math.floor(frame/4)*cell+y)*width+frame%4*cell)*4,y*cell*4,(y+1)*cell*4)
}
const file=batch+'/sources/hangang-mago-creator-sprite.source'
fs.copyFileSync(file,batch+'/sources/hangang-mago-creator-sprite-rejected-composite.source')
await sharp(out,{raw:{width,height,channels:4}}).png().toFile(file)
const records=sources.map((_,frame)=>JSON.parse(fs.readFileSync(`${batch}/sources/hangang-mago-pose-${frame}.json`,'utf8').replace(/^\uFEFF/,'')))
fs.writeFileSync(batch+'/sources/hangang-mago-creator-sprite.json',JSON.stringify({id:'hangang-mago-creator',tool:'built-in image_gen',prompt:records.map(r=>r.prompt).join('\n\n'),poses:records,assembly:{method:'Separate generated physical poses, one common source canvas and uniform export scale; no silhouette crop or per-frame zoom',sourceCell,cell,scale}},null,2)+'\n')
fs.writeFileSync(batch+'/individual-pose-audit.json',JSON.stringify(audit,null,2)+'\n')
console.log(JSON.stringify({assembled:8,allIndividualOriginalMarginsVerified:true,uniformScale:scale}))
