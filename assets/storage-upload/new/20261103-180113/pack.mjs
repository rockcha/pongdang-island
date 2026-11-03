import sharp from 'sharp'

export async function packBuilding(source){
 const {data,info}=await sharp(source).resize(512,512,{fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let minAll=info.height,maxAll=-1,minVisible=info.height,maxVisible=-1
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3]
  if(alpha>0){minAll=Math.min(minAll,y);maxAll=Math.max(maxAll,y)}
  if(alpha>=32){minVisible=Math.min(minVisible,y);maxVisible=Math.max(maxVisible,y)}
 }
 if(maxVisible<0)throw Error('Empty building')
 const baseline=Math.floor(info.height*.9),dy=Math.max(-minAll,Math.min(info.height-1-maxAll,baseline-maxVisible))
 const packed=Buffer.alloc(data.length),stride=info.width*4
 for(let y=minAll;y<=maxAll;y++)data.copy(packed,(y+dy)*stride,y*stride,(y+1)*stride)
 const bytes=await sharp(packed,{raw:{width:info.width,height:info.height,channels:4}}).png({compressionLevel:9}).toBuffer()
 return {bytes,layout:{width:info.width,height:info.height,offsetY:dy,visibleTop:minVisible+dy,visibleBottom:maxVisible+dy,targetBaseline:baseline,noVisiblePixelsCropped:true}}
}
