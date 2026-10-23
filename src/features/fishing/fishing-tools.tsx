import {createContext,useContext,useState,type ReactNode} from 'react'
import {fishingToolButton} from '@/components/fishing-dock-style'
export {fishingToolButton} from '@/components/fishing-dock-style'
import {ChevronLeft,ChevronRight} from 'lucide-react'
import {FishingDestinationMenu} from '@/features/regions/fishing-destination-menu'
import type {RegionMap} from '@/features/regions/api'

const key='pongdang:fishing-tools-collapsed'
const Context=createContext<{collapsed:boolean;soundTarget:HTMLElement|null;baitTarget:HTMLElement|null;rodTarget:HTMLElement|null;equipmentTarget:HTMLElement|null;rumorTarget:HTMLElement|null}|null>(null)
export const useFishingTools=()=>useContext(Context)
export function FishingTools({map,children,toolsTop=112}:{map:RegionMap;children:ReactNode;toolsTop?:number}){
 const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem(key)==='true'}catch{return false}})
 const [soundTarget,setSoundTarget]=useState<HTMLDivElement|null>(null),[baitTarget,setBaitTarget]=useState<HTMLDivElement|null>(null),[equipmentTarget,setEquipmentTarget]=useState<HTMLDivElement|null>(null),[rumorTarget,setRumorTarget]=useState<HTMLDivElement|null>(null)
 const [rodTarget,setRodTarget]=useState<HTMLDivElement|null>(null)
 function toggle(){const next=!collapsed;setCollapsed(next);try{localStorage.setItem(key,String(next))}catch{/* Keep this session usable when storage is unavailable. */}}
 return <Context.Provider value={{collapsed,soundTarget,baitTarget,rodTarget,equipmentTarget,rumorTarget}}>{children}<div data-fishing-tools style={{top:toolsTop}} className="absolute left-3 z-30 flex flex-col items-center gap-1 rounded-full border border-white/70 bg-[#fff8eb]/85 p-1.5 text-[#725039] shadow-sm backdrop-blur-md [&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none [&_button]:backdrop-blur-none [&_button:hover]:bg-primary/10">
  <button type="button" aria-label={collapsed?'낚시 도구 펼치기':'낚시 도구 접기'} aria-expanded={!collapsed} onClick={toggle} className={fishingToolButton+' h-7'} title={collapsed?'낚시 도구 펼치기':'낚시 도구 접기'}>{collapsed?<ChevronRight className="size-4"/>:<ChevronLeft className="size-4"/>}</button>
  <div hidden={collapsed} style={{display:collapsed?'none':undefined}} className="flex flex-col items-center gap-2">
   <FishingDestinationMenu map={map}/><div ref={setEquipmentTarget} role="group" aria-label="낚시 준비 도구" className="flex flex-col items-center gap-2"/><div ref={setRumorTarget}/>
  </div>
 </div>
 <div ref={setSoundTarget} data-fishing-sound className="absolute right-3 top-3 z-30"/>
 <div role="group" aria-label="장착한 낚싯대와 미끼" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-30 h-24 w-28">
  <div ref={setRodTarget} className="absolute left-0 top-0"/>
  <div ref={setBaitTarget} className="absolute left-[46px] top-[42px] z-10"/>
 </div></Context.Provider>
}
