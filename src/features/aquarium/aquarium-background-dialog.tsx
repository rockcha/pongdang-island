import { useState } from 'react'
import { Image,Check,ShoppingBag } from 'lucide-react'
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from '@/components/ui/dialog'
import { GoldIcon } from '@/features/gold/gold-provider'
import { backgroundUrl } from './api'
import type { AquariumState } from './api'
import { AquariumToolButton } from './aquarium-tool-button'

function Preview({path,name}:{path:string;name:string}){
 const [failed,setFailed]=useState(false)
 return failed?<div className="flex aspect-[4/5] items-center justify-center bg-muted text-xs text-muted-foreground">이미지 준비 중</div>:<img src={backgroundUrl(path)} alt={name} className="aspect-[4/5] w-full object-cover" onError={()=>setFailed(true)}/>
}
export function AquariumBackgroundDialog({state,selectedId,gold,busy,loading,error,onAct}:{state:AquariumState;selectedId:string;gold:number;busy:boolean;loading:boolean;error:boolean;onAct:(id:string,owned:boolean)=>Promise<void>}){
 const [open,setOpen]=useState(false)
 const ownedItems=state.catalog.filter(item=>item.id==='default'||state.owned.includes(item.id))
 const shopItems=state.catalog.filter(item=>item.id!=='default'&&!state.owned.includes(item.id))
 function cards(items:AquariumState['catalog'],owned:boolean){
  if(!items.length)return <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"><Image className="mb-1 size-7 opacity-40"/><p className="text-sm">{owned?'보유한 배경이 없어요.':'모든 배경을 보유하고 있어요.'}</p></div>
  return <ul className="grid max-h-[53dvh] grid-cols-2 gap-3 overflow-y-auto pb-1">{items.map(item=>{
   const equipped=selectedId===item.id
   return <li key={item.id} className={`overflow-hidden rounded-xl border transition-colors ${equipped?'border-primary/40 bg-primary/5':'border-border/60'}`}>
    <div className="relative"><Preview key={item.image_path} path={item.image_path} name={item.name}/>{equipped&&<span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur"><Check className="size-3"/>현재 배경</span>}</div>
    <div className="space-y-2.5 p-3"><p className="truncate text-sm font-medium">{item.name}</p><Button className="min-h-9 w-full" variant={owned?'outline':'default'} disabled={busy||equipped||(!owned&&(loading||error||gold<item.price))} onClick={()=>void onAct(item.id,owned)}>{equipped?<><Check className="size-3.5"/>적용 중</>:owned?'적용하기':<><GoldIcon className="size-4"/>{item.price.toLocaleString('ko-KR')} 구매</>}</Button></div>
   </li>
  })}</ul>
 }
 return <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value)}}>
  <AquariumToolButton prominent label="꾸미기" icon={<Image className="size-4"/>}/>
  <DialogContent className="max-h-[85dvh] gap-4 sm:max-w-md">
   <DialogHeader><DialogTitle>배경 꾸미기</DialogTitle><DialogDescription>배경을 골라 지금 어항에 적용해보세요.</DialogDescription></DialogHeader>
   <Tabs defaultValue="owned">
    <TabsList aria-label="배경 목록"><TabsTrigger value="owned"><Image className="size-4"/>내 배경 <span className="text-xs opacity-60">{ownedItems.length}</span></TabsTrigger><TabsTrigger value="shop"><ShoppingBag className="size-4"/>구매</TabsTrigger></TabsList>
    <TabsContent value="owned">{cards(ownedItems,true)}</TabsContent>
    <TabsContent value="shop"><div className="mb-3 flex items-center justify-between text-xs"><span className="text-muted-foreground">새로운 분위기를 만나보세요.</span><span className="flex items-center gap-1 tabular-nums"><GoldIcon className="size-4"/>{loading?'…':error?'—':gold.toLocaleString('ko-KR')}</span></div>{cards(shopItems,false)}</TabsContent>
   </Tabs>
  </DialogContent>
 </Dialog>
}
