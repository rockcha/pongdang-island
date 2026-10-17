import {useEffect,useState} from 'react'
import {toast} from 'sonner'
import {Button} from '@/components/ui/button'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {loadFishing,type FishingBait} from './api'
export function BaitShop(){
 const {wallet,transact,loading,busy,error:goldError}=useGold()
 const [items,setItems]=useState<FishingBait[]|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true;setError('');loadFishing().then(data=>{if(active)setItems(data.baits)}).catch(()=>{if(active)setError('미끼를 불러오지 못했어요.')});return()=>{active=false}},[attempt])
 async function buy(item:FishingBait){try{await transact({type:'buy',id:'fishing:'+item.id,name:item.name})}catch(cause){toast.error(cause instanceof Error?cause.message:'구매하지 못했어요.')}}
 if(error)return <div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(a=>a+1)}>다시 불러오기</Button></div>
 if(!items)return <p role="status" className="py-8 text-center text-sm text-muted-foreground">미끼를 준비하는 중…</p>
 return <ul className="space-y-3">{items.map(item=><li key={item.id} className="rounded-2xl border bg-card p-4"><div className="flex gap-3"><img src={item.image_path} alt="" className="size-14 shrink-0 object-contain"/><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h2 className="text-sm font-medium">{item.name}</h2><span className="shrink-0 text-xs text-muted-foreground">보유 {wallet.inventory[item.id]??0}개</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p><p className="mt-1 text-xs leading-5 text-primary">{item.effect_description}</p></div></div>{item.price===null?<p className="mt-3 text-center text-xs text-muted-foreground">획득 전용</p>:<Button variant="outline" className="mt-3 min-h-11 w-full" disabled={loading||busy||!!goldError||wallet.gold<item.price} aria-label={`${item.name} 1개 구매`} onClick={()=>void buy(item)}><GoldIcon className="size-4"/>{item.price.toLocaleString('ko-KR')} · 1개 구매</Button>}</li>)}</ul>
}
