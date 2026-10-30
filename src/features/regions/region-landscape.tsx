import {LandscapeImage} from '@/components/landscape-image'
import {regionImageUrl,type Region} from './api'

// The kingdom overview must remain fully visible; fishing has its own scenery.
export function RegionLandscape({region,alt=region.name,className='',position='center',locked=false}:{region:Pick<Region,'id'|'name'|'image_path'>;alt?:string;className?:string;position?:'center'|'bottom';locked?:boolean}){
 const overview=region.id==='pharaoh',src=regionImageUrl(region.image_path)
 const framing=overview?'object-contain':`object-cover ${position==='bottom'?'object-bottom':'object-center'}`
 const treatment=locked?'grayscale brightness-[0.35]':''
 return <>
  {overview&&<div aria-hidden="true" className={`pointer-events-none absolute inset-0 scale-110 bg-[#9a713f] bg-cover bg-center opacity-70 blur-2xl ${treatment} ${className}`} style={{backgroundImage:`url(${JSON.stringify(src)})`}}/>}
  <LandscapeImage src={src} alt={alt} className={`absolute inset-0 size-full ${framing} ${treatment} ${className}`}/>
 </>
}
