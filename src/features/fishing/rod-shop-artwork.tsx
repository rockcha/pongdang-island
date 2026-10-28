import {LandscapeImage} from '@/components/landscape-image'
import type {FishingRod} from './fishing-rods'
import {rodThumbnailUrl} from './rod-image-assets'
import assets from './rod-shop-assets.json'

const artwork=assets as Record<string,{thumbnail:string;reel:string}>

export function RodShopArtwork({rod,className='aspect-square w-full'}:{rod:FishingRod;className?:string}){
 const art=Object.hasOwn(artwork,rod.id)?artwork[rod.id]:undefined
 return <span role="img" aria-label={rod.name+' 세트'} className={'relative block '+className}>
  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[88%]">
   <LandscapeImage src={art?.thumbnail??rodThumbnailUrl(rod.id)} alt="" loading="lazy" decoding="async" retryable={false} className="absolute inset-0 size-full object-contain"/>
  </span>
  {art&&<span aria-hidden="true" data-rod-reel-preview className="absolute right-0 bottom-0 aspect-square w-[40%] rounded-full bg-background/95 p-0.5 ring-1 ring-border/60">
   <span className="relative block size-full"><LandscapeImage src={art.reel} alt="" loading="lazy" decoding="async" retryable={false} className="absolute inset-0 size-full object-contain"/></span>
  </span>}
 </span>
}
