// Keep simulation units in CSS pixels; only the drawing buffer grows.
export function tankResolution(width:number,height:number,dpr:number){
 const w=Math.max(1,Math.round(width)||1),h=Math.max(1,Math.round(height)||1)
 const requested=Number.isFinite(dpr)?Math.max(1,dpr):1
 // Limit fill rate and GPU memory: at most 1.5x and two million pixels,
 // while never reducing an existing 1x canvas below its logical dimensions.
 const ratio=Math.max(1,Math.min(requested,1.5,Math.sqrt(2000000/(w*h))))
 return {width:w,height:h,pixelWidth:Math.round(w*ratio),pixelHeight:Math.round(h*ratio),ratio}
}
