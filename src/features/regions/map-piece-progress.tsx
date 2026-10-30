import type {Region} from './api'
import {LockKeyhole} from 'lucide-react'
import {rarities} from '@/lib/game/rarity'

export function MapPieceProgress({region}:{region:Region}){
 if(!region.mapPieceCount)return null
 const grades=region.mapPieceRarities
 return <div className="py-2"><MapPieceArtwork region={region}/>{grades&&new Set(grades).size>1&&<div className="mt-2 flex justify-center gap-3 text-[10px] text-muted-foreground">{([...new Set(grades)]).map(grade=><span key={grade} className="flex items-center gap-1"><span aria-hidden="true" className="size-1.5 rounded-full" style={{backgroundColor:rarities[grade].effectColor}}/>{rarities[grade].label} {grades.filter(g=>g===grade).length}조각</span>)}</div>}</div>
}

export function MapPieceArtwork({region,compact=false}:{region:Region;compact?:boolean}){
 if(!region.mapPieceCount||!region.map_image_path)return null
 const columns=region.mapPieceCount===8?4:Math.ceil(Math.sqrt(region.mapPieceCount)),rows=Math.ceil(region.mapPieceCount/columns)
 return <div role="img" aria-label={`${region.name} 지도 ${region.mapPieces?.length??0}/${region.mapPieceCount}조각 수집`} className={`relative mx-auto aspect-square overflow-hidden border border-amber-200/40 bg-[#e6cfaa] shadow-lg ${compact?'size-16 rounded-lg':'w-[min(52vw,25dvh,14rem)] rounded-xl'}`}>
   <img src={region.map_image_path} alt="" className="absolute inset-0 size-full object-cover opacity-20 grayscale sepia"/>
   {Array.from({length:region.mapPieceCount},(_,i)=>{
    const found=region.unlocked||region.mapPieces?.includes(i+1),x=i%columns,y=Math.floor(i/columns)
    return <div key={i} data-map-piece={i+1} data-found={!!found} style={{clipPath:`inset(${y/rows*100}% ${100-(x+1)/columns*100}% ${100-(y+1)/rows*100}% ${x/columns*100}%)`}} className={`pointer-events-none absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${found?'opacity-100':'opacity-0'}`}><img src={region.map_image_path!} alt="" className="size-full object-cover"/></div>
   })}
   {!region.unlocked&&!compact&&<><span className="absolute right-2 top-2 rounded-full bg-amber-950/75 p-1.5 text-amber-50"><LockKeyhole aria-label="잠긴 지도" className="size-4"/></span><span className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-950/75 px-2 py-1 text-[10px] text-amber-50">지도 조각 {region.mapPieces?.length??0}/{region.mapPieceCount}</span></>}
  </div>
}
