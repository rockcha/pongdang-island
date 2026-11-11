import {useRef,useState} from 'react'
import {PetPurchaseQuantity} from './pet-purchase-quantity'
import {useGold,GoldIcon} from '@/features/gold/gold-provider'
import {useAccountResource} from '@/lib/account-query'
import {readFishing} from '@/features/fishing/api'
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {BaitOddsBars,isPetFishingBait} from '@/features/fishing/bait-info'
import {PetShopCategories,type PetShopCategory} from './pet-shop-categories'

export function PetSnackShop({foodOnly=false}:{foodOnly?:boolean}){
 const [category,setCategory]=useState<PetShopCategory>('food')
 const gold=useGold(),fishing=useAccountResource('fishing-state',readFishing,{enabled:!foodOnly})
 const products=[{id:'pet:food',stock:'pet_food',name:'든든 사료',price:50,image:'/pets/items/food_v1.webp',description:'포만도 +50',petBp:0},...foodOnly?[]:(fishing.data?.baits??[]).filter(isPetFishingBait).filter(b=>b.price!==null).sort((a,b)=>a.price!-b.price!).map(b=>({id:'fishing:'+b.id,stock:b.id,name:b.name,price:b.price!,image:b.image_path,description:'직접 낚시용 펫 미끼',petBp:b.pet_bp}))]
 const [selected,setSelected]=useState<string|null>(null),[count,setCount]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const lock=useRef(false),quote=useRef<{id:string;quantity:number;price:number}|null>(null)
 const item=products.find(x=>x.id===selected),max=item?Math.max(0,Math.min(99,Math.floor(gold.wallet.gold/item.price))):0
 const bait=fishing.data?.baits.find(b=>'fishing:'+b.id===selected)
 async function buy(){
  if(!item||lock.current||gold.busy||gold.loading||gold.error||(!quote.current&&(count<1||count>max)))return
  lock.current=true;setBusy(true);setError('');quote.current??={id:item.id,quantity:count,price:item.price}
  const q=quote.current
  try{await gold.transact({type:'buy',id:q.id,name:item.name,quantity:q.quantity,expectedPrice:q.price});quote.current=null;setSelected(null)}catch(e){setError(e instanceof Error?e.message:'구매하지 못했어요.');if(e&&typeof e==='object'&&'code' in e&&/^[0-9A-Z]{5}$/.test(String(e.code))){quote.current=null;void fishing.refetch()}}finally{lock.current=false;setBusy(false)}
 }
 return <section className="pet-snack-shop min-h-0 overflow-y-auto" aria-label={foodOnly?'사료 상점':'펫 상점'}>
  {!foodOnly&&<PetShopCategories value={category} onChange={setCategory}/>}
  <div className="px-4">
  {products.filter(p=>foodOnly||(category==='food'?p.petBp===0:p.petBp>0)).map(p=><article key={p.id} className="flex items-center gap-3 border-b border-border/60 py-4 first:pt-1">
   <img src={p.image} alt="" className="size-16 shrink-0 object-contain"/>
   <div className="min-w-0 flex-1"><h3 className="text-sm font-medium">{p.name}</h3><p className="mt-1 text-[11px] text-muted-foreground">{p.description}</p><p className="mt-1 text-[10px] text-muted-foreground">보유 {(gold.wallet.inventory[p.stock]??0).toLocaleString()}개</p></div>
   <button className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-secondary px-3 text-xs" disabled={gold.loading||gold.busy||!!gold.error||busy||(!foodOnly&&!fishing.data&&p.petBp>0)} onClick={()=>{if(quote.current&&quote.current.id!==p.id){setError('이전 구매 결과를 먼저 확인해주세요.');return}setSelected(p.id);setCount(quote.current?.quantity??1);setError('')}}><GoldIcon className="size-4"/>{p.price} 구매</button>
  </article>)}
  {!foodOnly&&category==='bait'&&fishing.isPending&&<p role="status" className="py-3 text-xs text-muted-foreground">미끼를 불러오는 중…</p>}
  {!foodOnly&&category==='bait'&&fishing.error&&<div role="alert" className="py-3 text-xs text-destructive">미끼를 불러오지 못했어요. <button onClick={()=>void fishing.refetch()}>다시 불러오기</button></div>}
  {(error||gold.error)&&!selected&&<p role="alert" className="py-2 text-xs text-destructive">{error||gold.error}</p>}
  </div>
  <Dialog open={!!item} onOpenChange={open=>{if(!open&&!busy)setSelected(null)}}><DialogContent className="max-h-[85dvh] max-w-sm gap-5 overflow-y-auto rounded-2xl p-5">
   <DialogTitle>{item?.name}</DialogTitle><DialogDescription>{bait?'어느 해역에서나 사용하는 펫 전용 미끼예요. 낚시 조작에 성공해야 획득해요.':'한 번 먹이면 포만도가 50 올라요. 구매 수량을 선택해주세요.'}</DialogDescription>
   {item&&<><img src={item.image} alt="" className="mx-auto size-28 object-contain"/><p className="text-center text-xs text-muted-foreground">보유 {gold.wallet.inventory[item.stock]??0}개 · 개당 {item.price} 골드</p>
   {bait&&<BaitOddsBars bait={bait}/>}
   <PetPurchaseQuantity value={count} max={max} disabled={busy||!!quote.current} onChange={setCount}/>
   <button className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-primary text-primary-foreground" disabled={busy||gold.busy||gold.loading||!!gold.error||(!quote.current&&count>max)} onClick={()=>void buy()}>{busy?'구매 중…':quote.current?'이전 구매 결과 다시 확인':<><GoldIcon className="size-5"/>{(item.price*count).toLocaleString()} · {count}개 구매</>}</button>
   {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</>}
  </DialogContent></Dialog>
 </section>
}
