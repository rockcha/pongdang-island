export const crimsonEmissionColor = 0xff1838
export const hasCrimsonEmission = (id:string) => id === 'halloween-crimson-megalodon'

// A six-second breathing light, independent of the swimming/bite frame rate.
// Only the additive light fades; the original artwork stays fully opaque.
export function crimsonEmission(time:number,seed=0,reduced=false):number {
  if(reduced||!Number.isFinite(time))return 0
  const phase=((time+seed/1000000)%6+6)%6
  const smooth=(t:number)=>t*t*(3-2*t)
  if(phase<.6||phase>=5.4)return 0
  if(phase<2.6)return .32*smooth((phase-.6)/2)
  if(phase<3.2)return .32
  return .32*(1-smooth((phase-3.2)/2.2))
}

// Keep a single small, alpha-masked pose rather than another full-size atlas.
export function createCrimsonCanvasLight(image:HTMLImageElement,columns:number){
  const mask=document.createElement('canvas')
  mask.width=mask.height=256
  const paint=mask.getContext('2d')!
  let previous=-1
  return (context:CanvasRenderingContext2D,index:number,x:number,y:number,size:number,alpha:number)=>{
    if(alpha<=0)return
    if(previous!==index){
      previous=index
      paint.clearRect(0,0,256,256)
      paint.globalCompositeOperation='source-over'
      const w=image.naturalWidth/columns,h=image.naturalHeight/2
      paint.drawImage(image,index%columns*w,Math.floor(index/columns)*h,w,h,0,0,256,256)
      paint.globalCompositeOperation='source-in'
      paint.fillStyle='#ff1838';paint.fillRect(0,0,256,256)
    }
    context.save()
    context.globalCompositeOperation='lighter'
    context.globalAlpha=alpha
    context.shadowColor='#ff1838';context.shadowBlur=size*.035
    context.drawImage(mask,x,y,size,size)
    context.restore()
  }
}
