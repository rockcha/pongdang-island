import {appArt} from '@/components/app-art'
import { useRef, useState } from 'react'
import {Check} from 'lucide-react'
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from '@/components/ui/dialog'
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog'
import { GoldIcon } from '@/features/gold/gold-provider'
import { backgroundUrl } from './api'
import type { AquariumState } from './api'
import { AquariumToolButton } from './aquarium-tool-button'
import {themeTiers,type ThemeTier} from './theme-tiers'

const {background:Image,shop:ShoppingBag}=appArt


function Preview({path,name}:{path:string;name:string}){
 const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading')
 const [attempt,setAttempt]=useState(0)
 return <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary/40" aria-busy={status==='loading'}>
  {status==='loading'&&<div aria-hidden="true" className="absolute inset-0 bg-secondary/50 motion-safe:animate-pulse"/>}
  {status==='failed'?<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 text-center text-muted-foreground"><Image aria-hidden="true" className="size-6"/><p className="text-xs">이미지를 불러오지 못했어요.</p><Button variant="outline" size="sm" onClick={()=>{setStatus('loading');setAttempt(value=>value+1)}}>다시 시도</Button></div>:<img key={attempt} src={backgroundUrl(path)} alt={name} ref={image=>{if(image?.complete&&image.naturalWidth>0)setStatus('ready')}} className={'absolute inset-0 size-full object-cover transition-opacity duration-150 motion-reduce:transition-none '+(status==='ready'?'opacity-100':'opacity-0')} onLoad={()=>setStatus('ready')} onError={()=>setStatus('failed')}/>}
 </div>
}
export function AquariumBackgroundDialog({state,selectedId,gold,busy,loading,error,onAct}:{state:AquariumState;selectedId:string;gold:number;busy:boolean;loading:boolean;error:boolean;onAct:(id:string,owned:boolean)=>Promise<void>}){
 const [open,setOpen]=useState(false)
 const [tier,setTier]=useState<ThemeTier|'all'>('all')
 const [tab,setTab]=useState('owned')
 const [pending,setPending]=useState<string|null>(null)
 const [actionError,setActionError]=useState('')
 const [purchaseId,setPurchaseId]=useState<string|null>(null)
 const purchase=state.catalog.find(item=>item.id===purchaseId)
 const canPurchase=!!purchase&&!state.owned.includes(purchase.id)&&!loading&&!error&&gold>=purchase.price
 const locked=useRef(false)
 async function act(id:string,owned:boolean){
  if(locked.current||busy||(!owned&&(!canPurchase||id!==purchaseId)))return
  locked.current=true;setPending(id);setActionError('')
  try{await onAct(id,owned);setPurchaseId(null);if(owned)setOpen(false)}catch{setActionError('배경을 변경하지 못했어요. 다시 시도해주세요.')}finally{locked.current=false;setPending(null)}
 }
 const ownedItems=state.catalog.filter(item=>item.id==='default'||state.owned.includes(item.id))
 const shopItems=state.catalog.filter(item=>item.id!=='default'&&!state.owned.includes(item.id))
 const currentItems=tab==='owned'?ownedItems:shopItems
 function cards(items:AquariumState['catalog'],owned:boolean){
  if(!state.catalog.length&&!error)return <div role="status" aria-label="배경 목록을 불러오는 중"><span className="sr-only">배경 목록을 불러오는 중…</span><div aria-hidden="true" className="grid grid-cols-2 gap-3 overflow-hidden">{Array.from({length:4},(_,i)=><div key={i} className="overflow-hidden rounded-xl border border-border/60 motion-safe:animate-pulse"><div className="aspect-[4/5] bg-secondary/60"/><div className="space-y-2.5 p-3"><div className="h-5 w-2/3 rounded bg-secondary/60"/><div className="h-9 rounded-lg bg-secondary/60"/></div></div>)}</div></div>
  items=items.filter(item=>tier==='all'||(item.tier??'simple')===tier)
  if(!items.length)return <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"><Image className="mb-1 size-7 opacity-40"/><p className="text-sm">{tier!=='all'?'이 등급에 해당하는 배경이 없어요.':owned?'보유한 배경이 없어요.':'모든 배경을 보유하고 있어요.'}</p></div>
  return <ul className="grid grid-cols-2 gap-3 pb-1">{items.map(item=>{
   const equipped=selectedId===item.id
   return <li key={item.id} className={`overflow-hidden rounded-xl border transition-colors ${equipped?'border-primary/40 bg-primary/5':'border-border/60'}`}>
    <div className="relative"><Preview key={item.image_path} path={item.image_path} name={item.name}/>{equipped&&<span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur"><Check className="size-3"/>현재 배경</span>}</div>
    <div className="space-y-2.5 p-3"><p className="truncate text-sm font-medium">{item.name}</p><Button className="min-h-9 w-full" variant={owned?'outline':'default'} disabled={busy||pending!==null||equipped||(!owned&&(loading||error||gold<item.price))} onClick={()=>{if(owned)void act(item.id,true);else {setActionError('');setPurchaseId(item.id)}}}>{pending===item.id?<span role="status">{owned?'적용 중…':'구매 중…'}</span>:equipped?<><Check className="size-3.5"/>적용 중</>:owned?'적용하기':<><GoldIcon className="size-4"/>{item.price.toLocaleString('ko-KR')} 구매</>}</Button></div>
   </li>
  })}</ul>
 }
 return <Dialog open={open} onOpenChange={value=>{if(!busy&&!locked.current){setOpen(value);if(value)setTier('all');else setPurchaseId(null)}}}>
  <AquariumToolButton label="배경 바꾸기" icon={<Image className="size-7 text-primary"/>}/>
  <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[92dvh] max-h-[92dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-4 overflow-hidden rounded-t-2xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   <DialogHeader><DialogTitle className="flex items-center gap-2"><Image aria-hidden="true" className="size-8 text-primary"/>배경 꾸미기</DialogTitle><DialogDescription>배경을 골라 지금 어항에 적용해보세요.</DialogDescription></DialogHeader>
   {actionError&&<p role="alert" className="text-sm text-destructive">{actionError}</p>}
   <Tabs value={tab} onValueChange={value=>setTab(String(value))} className="flex min-h-0 flex-1 flex-col">
    <TabsList aria-label="배경 목록"><TabsTrigger value="owned" className="min-h-14 gap-2"><Image className="size-8"/>내 배경 <span className="text-xs opacity-60">{ownedItems.length}</span></TabsTrigger><TabsTrigger value="shop" className="min-h-14 gap-2"><ShoppingBag className="size-8"/>구매</TabsTrigger></TabsList>
    <div className="shrink-0 space-y-2 pt-3">
     <div role="group" aria-label="테마 등급" className="grid grid-cols-4 gap-1.5">{(['all','simple','mood','special'] as const).map(value=><button key={value} type="button" aria-pressed={tier===value} onClick={()=>setTier(value)} className={`min-h-11 rounded-lg px-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring ${tier===value?'bg-secondary font-semibold text-primary':'bg-muted/40 text-muted-foreground'}`}>{value==='all'?'전체':themeTiers[value].label} <span className="tabular-nums opacity-70">{currentItems.filter(item=>value==='all'||(item.tier??'simple')===value).length}</span></button>)}</div>
    </div>
    <TabsContent value="owned" className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">{cards(ownedItems,true)}</TabsContent>
    <TabsContent value="shop" className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="mb-3 flex items-center justify-between text-xs"><span className="text-muted-foreground">새로운 분위기를 만나보세요.</span><span className="flex items-center gap-1 tabular-nums"><GoldIcon className="size-4"/>{loading?'…':error?'—':gold.toLocaleString('ko-KR')}</span></div>{cards(shopItems,false)}</TabsContent>
   </Tabs>
   <AlertDialog open={!!purchase} onOpenChange={value=>{if(!value&&!locked.current)setPurchaseId(null)}}>
    <AlertDialogContent size="sm">
     <AlertDialogHeader><AlertDialogTitle>구매하시겠습니까?</AlertDialogTitle><AlertDialogDescription>{purchase?.name} 배경을 {purchase?.price.toLocaleString('ko-KR')}골드에 구매합니다.</AlertDialogDescription></AlertDialogHeader>
     {actionError&&<p role="alert" className="text-sm text-destructive">{actionError}</p>}
     <AlertDialogFooter><AlertDialogCancel disabled={pending!==null}>취소</AlertDialogCancel><AlertDialogAction disabled={busy||pending!==null||!canPurchase} onClick={()=>{if(purchase)void act(purchase.id,false)}}>{pending!==null?'구매 중…':'구매하기'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </DialogContent>
 </Dialog>
}
