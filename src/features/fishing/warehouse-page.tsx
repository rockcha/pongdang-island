import {useState} from 'react'
import {Fish,FishingRod} from 'lucide-react'
import {Link} from 'react-router'
import {useGold} from '@/features/gold/gold-provider'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {useRods} from './rod-provider'
import {FishingRodInventory,RodInventoryStatus} from './fishing-rod-ui'
export function WarehousePage(){
 const {wallet,loading,error,refresh}=useGold()
 const {owned,baits,loading:rodsLoading,error:rodsError}=useRods()
 const [query,setQuery]=useState(''),[ownedOnly,setOwnedOnly]=useState(false),[detailId,setDetailId]=useState<string|null>(null)
 const detail=baits.find(item=>item.id===detailId)
 const visible=baits.filter(item=>item.name.includes(query.trim())&&(!ownedOnly||(wallet.inventory[item.id]??0)>0))
 return <section className="mx-auto w-full max-w-3xl space-y-4 py-4">
  <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">장비와 미끼 보관함</p><Link to="/shop" className="text-xs text-primary hover:underline">상점으로</Link></div>
  <Input aria-label="창고 검색" placeholder="이름으로 찾기" className="min-h-11 rounded-xl bg-card" value={query} maxLength={60} onChange={event=>setQuery(event.target.value)}/>
  {error&&<div role="alert" className="text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>}
  <Tabs defaultValue="rods"><TabsList className="mb-3 w-full" aria-label="창고 종류"><TabsTrigger value="rods" className="min-h-11 flex-1"><FishingRod className="size-4"/>낚싯대{!rodsLoading&&!rodsError&&<span className="text-[10px] opacity-60">{owned.length}</span>}</TabsTrigger><TabsTrigger value="baits" className="min-h-11 flex-1"><Fish className="size-4"/>미끼</TabsTrigger></TabsList>
   <TabsContent value="rods"><FishingRodInventory query={query}/></TabsContent>
   <TabsContent value="baits" className="space-y-3"><RodInventoryStatus/><label className="flex min-h-10 w-fit items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={ownedOnly} onChange={event=>setOwnedOnly(event.target.checked)}/>보유한 미끼만</label>{loading?<p role="status" className="py-5 text-sm text-muted-foreground">미끼를 불러오는 중…</p>:!error&&!rodsLoading&&!rodsError&&(visible.length?<ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">{visible.map(bait=><li key={bait.id}><button onClick={()=>setDetailId(bait.id)} aria-label={bait.name+' 상세 보기'} className="flex h-full w-full flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-2 pb-3 text-center transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={bait.image_path} alt="" loading="lazy" className="aspect-square w-full object-contain p-2"/><span className="text-xs leading-5">{bait.name}</span><span className="text-xs tabular-nums text-primary">×{(wallet.inventory[bait.id]??0).toLocaleString('ko-KR')}</span></button></li>)}</ul>:<p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 미끼가 없어요.</p>)}</TabsContent>
  </Tabs>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetailId(null)}}><DialogContent className="bottom-0 top-auto left-0 max-h-[85dvh] max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"><DialogHeader><DialogTitle>{detail?.name}</DialogTitle><DialogDescription>{detail?.description}</DialogDescription></DialogHeader>{detail&&<><img src={detail.image_path} alt="" className="mx-auto size-36 object-contain"/><p className="text-center text-sm text-primary">보유 {(wallet.inventory[detail.id]??0).toLocaleString('ko-KR')}개</p></>}</DialogContent></Dialog>
 </section>
}
