import {LandscapeImage} from '@/components/landscape-image'
import {regionImageUrl,type Region} from './api'

// Fill the entire scene on both portrait and landscape viewports.
export function RegionLandscape({region,alt=region.name,className='',position='center',locked=false}:{region:Pick<Region,'id'|'name'|'image_path'>;alt?:string;className?:string;position?:'center'|'bottom';locked?:boolean}){
 const src=regionImageUrl(region.image_path)
 // Keep the Han River's illuminated tower in frame when portrait cropping is needed.
 const focal=region.id==='hangang'?(position==='bottom'?'object-[85%_bottom]':'object-[85%_center]'):(position==='bottom'?'object-bottom':'object-center')
 const framing=`object-cover ${focal}`
 const treatment=locked?'grayscale brightness-[0.35]':''
 return <LandscapeImage src={src} alt={alt} className={`absolute inset-0 size-full ${framing} ${treatment} ${className}`}/>
}
