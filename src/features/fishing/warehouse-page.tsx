import {Fish,FishingRod,PackageOpen} from 'lucide-react'
import {Link} from 'react-router'
import {useGold} from '@/features/gold/gold-provider'
import {Button} from '@/components/ui/button'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {useRods} from './rod-provider'
import {FishingRodInventory,RodInventoryStatus} from './fishing-rod-ui'

export function WarehousePage(){
 const {wallet,loading,error,refresh}=useGold()
 const {owned,baits,loading:rodsLoading,error:rodsError}=useRods()
 return <section className="space-y-5 py-6">
  <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4"><PackageOpen className="size-5 text-muted-foreground"/><p className="flex-1 text-xs leading-5 text-muted-foreground">항해에 필요한 장비와 미끼를 한곳에 보관해요.</p><Link to="/shop" className="shrink-0 text-xs text-primary underline-offset-4 hover:underline">상점으로</Link></div>
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>골드·미끼 다시 불러오기</Button></div>}
  <Tabs defaultValue="rods"><TabsList className="w-full" aria-label="창고 종류"><TabsTrigger value="rods" className="flex-1"><FishingRod className="size-4"/>낚싯대 창고{!rodsLoading&&!rodsError&&<span className="text-[10px] opacity-60">{owned.length}</span>}</TabsTrigger><TabsTrigger value="baits" className="flex-1"><Fish className="size-4"/>미끼 창고</TabsTrigger></TabsList>
   <TabsContent value="rods"><FishingRodInventory/></TabsContent>
   <TabsContent value="baits"><RodInventoryStatus/>{loading?<p role="status" className="py-5 text-sm text-muted-foreground">미끼를 불러오는 중…</p>:!error&&!rodsLoading&&!rodsError&&<ul className="divide-y">{baits.map(bait=><li key={bait.id} className="flex items-center gap-3 py-4"><div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted/50"><img src={bait.image_path} alt="" className="size-12 object-contain"/></div><div className="min-w-0 flex-1"><h2 className="text-sm font-medium">{bait.name}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{bait.description}</p></div><span className="shrink-0 text-sm font-medium tabular-nums">{wallet.inventory[bait.id]??0}<span className="ml-1 text-xs font-normal text-muted-foreground">개</span></span></li>)}</ul>}</TabsContent>
  </Tabs>
 </section>
}
