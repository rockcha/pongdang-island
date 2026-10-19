import {FuelShop} from './fuel-shop'
import {appArt} from '@/components/app-art'
import {useState} from 'react'

import {Navigate,useSearchParams} from 'react-router'
import {Button} from '@/components/ui/button'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {FishingRodShop} from '@/features/fishing/fishing-rod-ui'
import {BaitShop} from '@/features/fishing/bait-shop'
import {MapShop} from '@/features/regions/map-shop'
import {useGold} from './gold-provider'

const {bait:Fish,rod:FishingRod,map:Map}=appArt

export function ShopPage({items=false}:{items?:boolean}){
 const {loading,error,refresh}=useGold()
 const [params,setParams]=useSearchParams(),tab=params.get('tab')??(items?'fuel':'bait')
 const activeTab=(items?['maps','fuel']:['bait','rods']).includes(tab)?tab:(items?'fuel':'bait')
 const [visited,setVisited]=useState<Set<string>>(()=>new Set([activeTab]))
 if(!items&&['maps','fuel'].includes(tab))return <Navigate to={`/item-shop?${params.toString()}`} replace/>
 return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
  {loading&&<p role="status">골드를 불러오는 중…</p>}
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>}
  <Tabs className="flex min-h-0 min-w-0 w-full flex-1 flex-col" value={activeTab} onValueChange={value=>{setVisited(old=>new Set([...old,String(value)]));setParams({tab:String(value)},{replace:true})}}>
   <TabsList aria-label="상점 종류" className="grid shrink-0 grid-cols-2 gap-0 rounded-none border-b border-border bg-background p-0">{(items?[['fuel','기름',appArt.fuel],['maps','지도',Map]] as const:[['bait','미끼',Fish],['rods','낚싯대',FishingRod]] as const).map(([value,label,Icon])=><TabsTrigger key={value} value={value} className="min-h-12 min-w-0 rounded-none border-border px-2 first:border-r data-active:bg-secondary data-active:text-primary data-active:shadow-none"><Icon className={activeTab===value?'size-7':'size-7 grayscale opacity-55'}/>{label}</TabsTrigger>)}</TabsList>
   <TabsContent keepMounted className="mt-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain data-[hidden]:hidden" value="rods">{(visited.has('rods')||activeTab==='rods')&&<FishingRodShop/>}</TabsContent><TabsContent keepMounted className="mt-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain data-[hidden]:hidden" value="bait">{(visited.has('bait')||activeTab==='bait')&&<BaitShop/>}</TabsContent><TabsContent keepMounted className="mt-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain data-[hidden]:hidden" value="maps">{(visited.has('maps')||activeTab==='maps')&&<MapShop/>}</TabsContent>
   <TabsContent className="mt-0 min-h-0 flex-1 overflow-y-auto" value="fuel"><FuelShop/></TabsContent>
  </Tabs>
 </section>
}
