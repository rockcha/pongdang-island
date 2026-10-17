import {toast} from 'sonner'
import {Fish,FishingRod,Map} from 'lucide-react'
import {useSearchParams} from 'react-router'
import {Button} from '@/components/ui/button'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {FishingRodShop} from '@/features/fishing/fishing-rod-ui'
import {BaitShop} from '@/features/fishing/bait-shop'
import {MapShop} from '@/features/regions/map-shop'
import {GoldIcon,useGold} from './gold-provider'
export function ShopPage(){
 const {wallet,transact,loading,busy,error,testClaimed,testEnabled,refresh}=useGold()
 const [params,setParams]=useSearchParams(),tab=params.get('tab')??'rods'
 return <section className="space-y-6 py-6">
  <div className="rounded-2xl border bg-amber-50/50 p-4"><p className="text-xs text-muted-foreground">보유 골드</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums"><GoldIcon className="size-9"/>{wallet.gold.toLocaleString('ko-KR')}<span className="text-sm font-normal">골드</span></p></div>
  {loading&&<p role="status">골드를 불러오는 중…</p>}
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>}
  <Tabs value={['rods','bait','maps'].includes(tab)?tab:'rods'} onValueChange={value=>setParams({tab:String(value)},{replace:true})}>
   <TabsList aria-label="상점 종류"><TabsTrigger value="rods" className="px-2"><FishingRod className="size-4"/>낚싯대</TabsTrigger><TabsTrigger value="bait" className="px-2"><Fish className="size-4"/>미끼</TabsTrigger><TabsTrigger value="maps" className="px-2"><Map className="size-4"/>지도</TabsTrigger></TabsList>
   <TabsContent value="rods"><FishingRodShop/></TabsContent><TabsContent value="bait"><BaitShop/></TabsContent><TabsContent value="maps"><MapShop/></TabsContent>
  </Tabs>
  {testEnabled&&<div className="space-y-3 rounded-xl bg-muted/50 p-4"><p className="text-sm font-semibold">골드 충전 테스트</p><Button disabled={loading||busy||!!error||testClaimed} variant="outline" className="min-h-11 w-full" onClick={()=>void transact({type:'charge'}).catch(cause=>toast.error(cause instanceof Error?cause.message:'충전하지 못했어요.'))}><GoldIcon className="size-5"/>{testClaimed?'이미 받았어요':'1,000 골드 받기'}</Button></div>}
 </section>
}
