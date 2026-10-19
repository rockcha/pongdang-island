import {appArt} from '@/components/app-art'
import {useState} from 'react'

import {useSearchParams} from 'react-router'
import {Button} from '@/components/ui/button'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {FishingRodShop} from '@/features/fishing/fishing-rod-ui'
import {BaitShop} from '@/features/fishing/bait-shop'
import {MapShop} from '@/features/regions/map-shop'
import {useGold} from './gold-provider'

const {bait:Fish,rod:FishingRod,map:Map}=appArt

export function ShopPage(){
 const {loading,error,refresh}=useGold()
 const [params,setParams]=useSearchParams(),tab=params.get('tab')??'bait'
 const activeTab=['rods','bait','maps'].includes(tab)?tab:'bait'
 const [visited,setVisited]=useState<Set<string>>(()=>new Set([activeTab]))
 return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
  {loading&&<p role="status">골드를 불러오는 중…</p>}
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>}
  <Tabs className="flex min-h-0 min-w-0 w-full flex-1 flex-col" value={activeTab} onValueChange={value=>{setVisited(old=>new Set([...old,String(value)]));setParams({tab:String(value)},{replace:true})}}>
   <TabsList aria-label="상점 종류" className="grid shrink-0 grid-cols-3 gap-0 rounded-none border-b border-border bg-background p-0"><TabsTrigger value="bait" className="min-h-12 min-w-0 rounded-none border-r border-border px-2 data-active:bg-secondary data-active:text-primary data-active:shadow-none"><Fish className={activeTab==='bait'?'size-7':'size-7 grayscale opacity-55'}/>미끼</TabsTrigger><TabsTrigger value="rods" className="min-h-12 min-w-0 rounded-none border-r border-border px-2 data-active:bg-secondary data-active:text-primary data-active:shadow-none"><FishingRod className={activeTab==='rods'?'size-7':'size-7 grayscale opacity-55'}/>낚싯대</TabsTrigger><TabsTrigger value="maps" className="min-h-12 min-w-0 rounded-none px-2 data-active:bg-secondary data-active:text-primary data-active:shadow-none"><Map className={activeTab==='maps'?'size-7':'size-7 grayscale opacity-55'}/>지도</TabsTrigger></TabsList>
   <TabsContent keepMounted className="mt-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain data-[hidden]:hidden" value="rods">{(visited.has('rods')||activeTab==='rods')&&<FishingRodShop/>}</TabsContent><TabsContent keepMounted className="mt-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain data-[hidden]:hidden" value="bait">{(visited.has('bait')||activeTab==='bait')&&<BaitShop/>}</TabsContent><TabsContent keepMounted className="mt-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain data-[hidden]:hidden" value="maps">{(visited.has('maps')||activeTab==='maps')&&<MapShop/>}</TabsContent>
  </Tabs>
 </section>
}
