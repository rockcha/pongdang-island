import {LandscapeImage} from '@/components/landscape-image'
import {ProductSkeleton} from '@/components/product-skeleton'
import {useState} from 'react'
import {Fish,FishingRod} from 'lucide-react'
import {useGold} from '@/features/gold/gold-provider'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {useRods} from './rod-provider'
import {FishingRodInventory,RodInventoryStatus} from './fishing-rod-ui'
export function WarehousePage(){
 const {wallet,loading,error,refresh}=useGold()
 const {baits,loading:rodsLoading,error:rodsError}=useRods()
 const [detailId,setDetailId]=useState<string|null>(null)
 const detail=baits.find(item=>item.id===detailId)
 const visible=[...baits].sort((a,b)=>(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER))
 return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
  {error&&<div role="alert" className="text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>}
  <Tabs defaultValue="baits" className="flex min-h-0 flex-1 flex-col overflow-hidden"><TabsList className="grid w-full shrink-0 grid-cols-2 gap-0 rounded-none border-b border-border bg-background p-0" aria-label="창고 종류"><TabsTrigger value="baits" className="min-h-12 min-w-0 rounded-none border-r border-border data-active:bg-secondary data-active:text-primary data-active:shadow-none"><Fish className="size-4"/>미끼</TabsTrigger><TabsTrigger value="rods" className="min-h-12 min-w-0 rounded-none border-r border-border data-active:bg-secondary data-active:text-primary data-active:shadow-none"><FishingRod className="size-4"/>낚싯대</TabsTrigger></TabsList>
   <TabsContent keepMounted value="rods" className="mt-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain data-[hidden]:hidden"><FishingRodInventory /></TabsContent>
   <TabsContent keepMounted value="baits" className="mt-0 min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain data-[hidden]:hidden">{rodsLoading?<ProductSkeleton/>:<RodInventoryStatus/>}{loading?<ProductSkeleton/>:!error&&!rodsLoading&&!rodsError&&(visible.length?<ul className="grid grid-cols-3 border-t border-border/60 sm:grid-cols-4">{visible.map(bait=><li key={bait.id}><button onClick={()=>setDetailId(bait.id)} aria-label={bait.name+' 상세 보기'} className="flex h-full w-full flex-col items-center gap-2 border-r border-b border-border/60 bg-card p-2 pb-3 text-center transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="relative aspect-square w-full"><LandscapeImage src={bait.image_path} alt="" className="absolute inset-0 size-full object-contain"/></div><span className="w-full truncate text-xs leading-5" title={bait.name}>{bait.name}</span><span className="text-xs tabular-nums text-primary">×{(wallet.inventory[bait.id]??0).toLocaleString('ko-KR')}</span></button></li>)}</ul>:<p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 미끼가 없어요.</p>)}</TabsContent>
  </Tabs>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetailId(null)}}><DialogContent className="bottom-0 top-auto left-0 max-h-[85dvh] max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"><DialogHeader><DialogTitle className="flex items-center gap-2 pr-6"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-6 shrink-0 object-contain"/>{detail?.name}</DialogTitle><DialogDescription>{detail?.description}</DialogDescription></DialogHeader>{detail&&<><div className="relative mx-auto size-36"><LandscapeImage src={detail.image_path} alt={detail.name} className="absolute inset-0 size-full object-contain"/></div><p className="text-center text-sm text-primary">보유 {(wallet.inventory[detail.id]??0).toLocaleString('ko-KR')}개</p></>}</DialogContent></Dialog>
 </section>
}
