/** Camera coordinates stay in the original tank world, regardless of screen ratio. */
export function wideTankFrame(width:number,height:number,fill=true){
 const ratio=Math.max(1,height)/Math.max(1,width)
 const zoom=fill?Math.min(1,Math.max(1/3,ratio/1.6)):1/3
 return {zoom,position:Math.max(0,(3-1/zoom)/2),y:Math.max(0,(1.6-ratio/zoom)/2)}
}
