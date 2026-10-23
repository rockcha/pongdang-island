import {createContext,useContext,useState,type ReactNode} from 'react'
import {fishingToolButton} from '@/components/fishing-dock-style'
export {fishingToolButton} from '@/components/fishing-dock-style'
import {ChevronLeft,ChevronRight} from 'lucide-react'
import {FishingDestinationMenu} from '@/features/regions/fishing-destination-menu'
import type {RegionMap} from '@/features/regions/api'

const key='pongdang:fishing-tools-collapsed'
const Context=createContext<{collapsed:boolean;soundTarget:HTMLElement|null;baitTarget:HTMLElement|null;rodTarget:HTMLElement|null;equipmentTarget:HTMLElement|null;rumorTarget:HTMLElement|null;setEmpty:(empty:boolean)=>void}|null>(null)
export const useFishingTools=()=>useContext(Context)
export function FishingTools({map,children}:{map:RegionMap;children:ReactNode}){
 const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem(key)==='true'}catch{return false}})
 const [soundTarget,setSoundTarget]=useState<HTMLDivElement|null>(null),[baitTarget,setBaitTarget]=useState<HTMLDivElement|null>(null),[equipmentTarget,setEquipmentTarget]=useState<HTMLDivElement|null>(null),[rumorTarget,setRumorTarget]=useState<HTMLDivElement|null>(null),[empty,setEmpty]=useState(false)
 const [rodTarget,setRodTarget]=useState<HTMLDivElement|null>(null)
 function toggle(){const next=!collapsed;setCollapsed(next);try{localStorage.setItem(key,String(next))}catch{/* Keep this session usable when storage is unavailable. */}}
 return <Context.Provider value={{collapsed,soundTarget,baitTarget,rodTarget,equipmentTarget,rumorTarget,setEmpty}}>{children}<div data-fishing-tools className="absolute left-3 top-3 z-30 flex flex-col items-center gap-2">
  <button type="button" aria-label={collapsed?'낚시 도구 펼치기':'낚시 도구 접기'} aria-expanded={!collapsed} onClick={toggle} className={fishingToolButton} title={collapsed?'낚시 도구 펼치기':'낚시 도구 접기'}>{collapsed?<ChevronRight className="size-4"/>:<ChevronLeft className="size-4"/>}{collapsed&&empty&&<span aria-label="선택한 미끼 없음" className="absolute right-0 top-0 size-2 rounded-full bg-amber-500 ring-2 ring-[#fff8eb]"/>}</button>
  <div hidden={collapsed} style={{display:collapsed?'none':undefined}} className="flex flex-col items-center gap-2">
   <div ref={setSoundTarget}/><FishingDestinationMenu map={map}/><div ref={setEquipmentTarget} role="group" aria-label="낚시 준비 도구" className="flex flex-col items-center gap-2"/><div ref={setRumorTarget}/>
  </div>
 </div>
 <div role="group" aria-label="장착한 낚싯대와 미끼" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-30 h-24 w-28">
  <div ref={setRodTarget} className="absolute left-0 top-0"/>
  <div ref={setBaitTarget} className="absolute left-[46px] top-[42px] z-10"/>
 </div></Context.Provider>
}
