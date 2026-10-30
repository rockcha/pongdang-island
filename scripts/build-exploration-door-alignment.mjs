import fs from 'node:fs/promises'
import sharp from 'sharp'

// Analyze alpha only. Source artwork is preserved; rendering uses these crop rectangles.
function runs(counts,threshold,minLength){
 const result=[];let start=null
 for(let i=0;i<=counts.length;i++){
  if(counts[i]>threshold){if(start===null)start=i}
  else if(start!==null){if(i-start>=minLength)result.push([start,i]);start=null}
 }
 return result
}
const sheets=[]
for(const name of ['a','b','c']){
 const {data,info}=await sharp(`src/features/exploration/assets/doors-${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const rows=Array(info.height).fill(0)
 const solid=(x,y)=>data[(y*info.width+x)*4+3]>220
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(solid(x,y))rows[y]++
 const bands=runs(rows,info.width*.12,40)
 if(bands.length!==4)throw Error(`${name}: expected four door rows`)
 const frames=bands.map(([top,bottom],row)=>{
  const columns=Array(info.width).fill(0)
  for(let x=0;x<info.width;x++)for(let y=top;y<bottom;y++)if(solid(x,y))columns[x]++
  const doors=runs(columns,(bottom-top)*.12,40)
  if(doors.length!==4)throw Error(`${name}: expected four opening frames`)
  const y0=row===0?0:Math.floor((bands[row-1][1]+top)/2)
  const y1=row===3?info.height:Math.floor((bottom+bands[row+1][0])/2)
  return doors.map(([left,right],column)=>{
   const x0=column===0?0:Math.floor((doors[column-1][1]+left)/2)
   const x1=column===3?info.width:Math.floor((right+doors[column+1][0])/2)
   const xs=Array(x1-x0).fill(0),ys=Array(y1-y0).fill(0)
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(solid(x,y)){xs[x-x0]++;ys[y-y0]++}
   const occupiedX=xs.map((n,i)=>n>5?i:-1).filter(i=>i>=0),occupiedY=ys.map((n,i)=>n>5?i:-1).filter(i=>i>=0)
   const x=Math.max(x0,x0+occupiedX[0]-2),y=Math.max(y0,y0+occupiedY[0]-2)
   const endX=Math.min(x1,x0+occupiedX.at(-1)+3),endY=Math.min(y1,y0+occupiedY.at(-1)+3)
   return {x,y,width:endX-x,height:endY-y}
  })
 })
 sheets.push({width:info.width,height:info.height,frames})
}
await fs.writeFile('src/features/exploration/assets/door-alignment.json',JSON.stringify(sheets,null,2)+'\n')
console.log('Measured 48 door frames; saved rendering crop rectangles.')
