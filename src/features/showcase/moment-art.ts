import type {Species} from '@/features/collection/api'
import {collectibleUrl} from '@/features/collection/api'
import {rarities,catchBadgeColors} from '@/lib/game/rarity'
import {regionIcons} from '@/features/regions/region-icons'
import {limitedCollectionEvent} from '@/features/collection/limited-events'

export type CatchMomentArt={species:Species;firstDiscovery?:boolean;practice?:boolean;preview?:boolean;regionName?:string;caughtAt?:string;renderVersion?:1}
export const catchImageSize=1080
const font='"Gowun Dodum", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
const images=new Map<string,Promise<HTMLImageElement>>()
function loadImage(url:string){
 const cached=images.get(url);if(cached)return cached
 const pending=new Promise<HTMLImageElement>((resolve,reject)=>{
  const image=new Image(),timer=setTimeout(()=>{image.src='';reject(new Error('MOMENT_IMAGE_TIMEOUT'))},10000)
  image.crossOrigin='anonymous'
  image.onload=()=>{clearTimeout(timer);image.naturalWidth?resolve(image):reject(new Error('MOMENT_IMAGE_EMPTY'))}
  image.onerror=()=>{clearTimeout(timer);reject(new Error('MOMENT_IMAGE_FAILED'))}
  image.src=url
 })
 images.set(url,pending);pending.catch(()=>{if(images.get(url)===pending)images.delete(url)})
 return pending
}
export function wrapMomentText(text:string,measure:(text:string)=>number,maxWidth:number,maxLines:number){
 const lines:string[]=[];let current=''
 for(const char of Array.from(text.trim().replace(/\s+/g,' '))){
  if(current&&measure(current+char)>maxWidth){lines.push(current.trim());current=char.trimStart()}else current+=char
 }
 if(current)lines.push(current.trim())
 if(lines.length<=maxLines)return lines
 const result=lines.slice(0,maxLines);let last=result[maxLines-1]
 while(last&&measure(last+'…')>maxWidth)last=last.slice(0,-1)
 result[maxLines-1]=last+'…';return result
}
function fitImage(ctx:CanvasRenderingContext2D,image:HTMLImageElement,x:number,y:number,width:number,height:number){
 const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale
 ctx.drawImage(image,x+(width-w)/2,y+(height-h)/2,w,h)
}
function badge(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,color:string,size=30,textColor='#ffffff'){
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,width,44,7);ctx.fill()
 ctx.font=`700 ${size}px ${font}`;ctx.fillStyle=textColor;ctx.fillText(text,x+width/2,y+31)
}

// Reveal, editor and feed share this painter, independent of viewport and animation timing.
export async function paintCatchMoment(canvas:HTMLCanvasElement,input:CatchMomentArt,size=catchImageSize){
 const {species,firstDiscovery,practice,preview,regionName,caughtAt}=input
 const native=species.is_native&&species.native_region_id?regionIcons[species.native_region_id]:undefined
 const titleIcon=limitedCollectionEvent(species.id)?.iconPath??native?.src
 const region=Object.values(regionIcons).find(item=>item.name===regionName)
 const [creature,titleImage,regionImage]=await Promise.all([
  loadImage(collectibleUrl(species.thumbnail_path)),
  titleIcon?loadImage(titleIcon).catch(()=>null):Promise.resolve(null),
  region?loadImage(region.src).catch(()=>null):Promise.resolve(null),
  document.fonts.load('400 33px "Gowun Dodum"',`${species.name} ${species.description} ${regionName??''} ${rarities[species.rarity].label} 미리보기 실제 포획 기록이 아니에요 NEW 0123456789`),
 ])
 canvas.width=canvas.height=size
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('MOMENT_CANVAS_UNAVAILABLE')
 ctx.setTransform(size/catchImageSize,0,0,size/catchImageSize,0,0)
 const color=rarities[species.rarity].effectColor,cx=540,cy=430
 ctx.fillStyle='#101b2a';ctx.fillRect(0,0,1080,1080)
 const glow=ctx.createRadialGradient(cx,cy,20,cx,cy,650)
 glow.addColorStop(0,color+'65');glow.addColorStop(.5,color+'20');glow.addColorStop(1,'#101b2a00')
 ctx.fillStyle=glow;ctx.fillRect(0,0,1080,1080)
 ctx.save()
 ctx.fillStyle=color+'10'
 for(let i=0;i<15;i++){
  const angle=i*Math.PI*2/15
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,440,angle,angle+.09);ctx.closePath();ctx.fill()
 }
 const count=species.rarity==='mythic'?22:species.rarity==='epic'?16:8
 for(let i=0;i<count;i++){
  const angle=i*2.4,radius=240+(i%5)*35,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius*.8
  ctx.fillStyle=color+(i%3===0?'b0':'60');ctx.beginPath();ctx.arc(x,y,i%3===0?4:2,0,Math.PI*2);ctx.fill()
 }
 ctx.restore()
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font=`500 28px ${font}`;ctx.fillStyle='#ffffffa6'
 ctx.save();ctx.shadowColor=color+'99';ctx.shadowBlur=55;fitImage(ctx,creature,230,145,620,510);ctx.restore()
 const isNew=firstDiscovery&&!practice,gradeWidth=104,newWidth=90,gap=16,total=gradeWidth+(isNew?newWidth+gap:0)
 const gradeBadge=catchBadgeColors(species.rarity)
 badge(ctx,rarities[species.rarity].label,540-total/2,690,gradeWidth,gradeBadge.background,30,gradeBadge.text)
 if(isNew)badge(ctx,'NEW',540-total/2+gradeWidth+gap,690,newWidth,'#dc2626',25)
 ctx.font=`700 58px ${font}`;ctx.fillStyle='#ffffff'
 const nameLines=wrapMomentText(species.name,t=>ctx.measureText(t).width,titleImage?800:920,2)
 nameLines.forEach((line,index)=>{
  const y=802+index*70
  if(titleImage&&index===0){const width=ctx.measureText(line).width;fitImage(ctx,titleImage,540-(width+68)/2,y-45,50,50);ctx.fillText(line,574,y)}else ctx.fillText(line,540,y)
 })
 const descriptionY=802+(nameLines.length-1)*70+57
 ctx.font=`400 33px ${font}`;ctx.fillStyle='#ffffffbf'
 wrapMomentText(species.description,t=>ctx.measureText(t).width,900,2).forEach((line,index)=>ctx.fillText(line,540,descriptionY+index*43))
 const date=caughtAt&&!Number.isNaN(Date.parse(caughtAt))?new Date(caughtAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}):''
 const metadata=[regionImage?undefined:regionName,date].filter(Boolean).join(' · ')
 ctx.font=`400 26px ${font}`;ctx.fillStyle='#ffffff80'
 const metadataText=wrapMomentText(metadata,t=>ctx.measureText(t).width,850,1)[0]??''
 if(regionImage){
  const total=44+(metadataText?16+ctx.measureText(metadataText).width:0),left=540-total/2
  fitImage(ctx,regionImage,left,986,44,44)
  if(metadataText){ctx.textAlign='left';ctx.fillText(metadataText,left+60,1020);ctx.textAlign='center'}
 }else if(metadataText)ctx.fillText(metadataText,540,1020)
 if(preview){ctx.font=`400 20px ${font}`;ctx.fillStyle='#ffffff99';ctx.fillText('미리보기 · 실제 포획 기록이 아니에요',540,1060)}
}
