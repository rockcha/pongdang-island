// Keep simulation units in CSS pixels; only the drawing buffer grows.
export function tankResolution(width:number,height:number,dpr:number){
 const w=Math.max(1,Math.round(width)||1),h=Math.max(1,Math.round(height)||1)
 const requested=Number.isFinite(dpr)?Math.max(1,dpr):1
 // Limit mobile fill rate and GPU memory: at most 2x and four million pixels,
 // while never reducing an existing 1x canvas below its logical dimensions.
 const ratio=Math.max(1,Math.min(requested,2,Math.sqrt(4000000/(w*h))))
 return {width:w,height:h,pixelWidth:Math.round(w*ratio),pixelHeight:Math.round(h*ratio),ratio}
}
