import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GoldIcon, useGold } from './gold-provider'
import { products } from './wallet'
import type { Trade } from './wallet'
import {Fish,FishingRod} from 'lucide-react'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {FishingRodShop} from '@/features/fishing/fishing-rod-ui'

export function ShopPage() {
  const { wallet, transact, loading, busy, error, testClaimed, testEnabled, refresh } = useGold()
  async function act(action: Trade) {
    try { await transact(action) } catch (error) { toast.error(error instanceof Error ? error.message : '거래를 처리하지 못했어요.') }
  }
  return <section className="space-y-6 py-6">
    <div className="flex items-center justify-between rounded-2xl border bg-amber-50/50 p-4"><div><p className="text-xs text-muted-foreground">보유 골드</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums"><GoldIcon className="size-9"/>{wallet.gold.toLocaleString('ko-KR')}<span className="text-sm font-normal">골드</span></p></div></div>
    {loading && <p role="status">골드를 불러오는 중…</p>}
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>다시 불러오기</Button></div>}
    <Tabs defaultValue="bait">
     <TabsList aria-label="상점 종류"><TabsTrigger value="bait"><Fish className="size-4"/>미끼 상점</TabsTrigger><TabsTrigger value="rods"><FishingRod className="size-4"/>낚싯대 상점</TabsTrigger></TabsList>
     <TabsContent value="bait"><ul className="divide-y">{products.map(item => <li key={item.id} className="space-y-4 py-5"><div className="flex gap-3"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-xl bg-muted text-3xl">{item.id==='bait'?<img src="/items/baits/pongdang-worm.png" alt="" className="size-12 object-contain"/>:item.icon}</span><div><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-xs text-muted-foreground">{item.description} · 보유 {wallet.inventory[item.id] ?? 0}개</p></div></div><div className="flex gap-2"><Button className="min-h-11 flex-1" disabled={loading || busy || !!error || wallet.gold < item.buy} onClick={() => act({ type: 'buy', id: item.id })} aria-label={`${item.name} 구매 ${item.buy} 골드`}><GoldIcon className="size-5"/>{item.buy} 구매</Button><Button variant="outline" className="min-h-11 flex-1" disabled={loading || busy || !!error || !wallet.inventory[item.id]} onClick={() => act({ type: 'sell', id: item.id })} aria-label={`${item.name} 판매 ${item.sell} 골드`}><GoldIcon className="size-5"/>{item.sell} 판매</Button></div></li>)}</ul></TabsContent>
     <TabsContent value="rods"><FishingRodShop/></TabsContent>
    </Tabs>
    <div className="space-y-3 rounded-xl bg-muted/50 p-4"><p className="text-sm font-semibold">골드 충전 테스트</p><p className="text-xs leading-5 text-muted-foreground">실제 결제 없이 1,000골드를 받아요. 계정당 한 번만 받을 수 있고 DB에 저장돼요.</p><Button disabled={loading || busy || !!error || testClaimed || !testEnabled} variant="outline" className="min-h-11 w-full" onClick={() => act({ type: 'charge' })}><GoldIcon className="size-5"/>{testClaimed ? '이미 받았어요' : !testEnabled && !loading ? '테스트 충전 종료' : '1,000 골드 받기'}</Button></div>
  </section>
}
