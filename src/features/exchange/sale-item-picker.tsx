import {useState} from 'react'
import {Check,Search} from 'lucide-react'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {AssetView} from './asset-view'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {LandscapeImage} from '@/components/landscape-image'
import type {ExchangeAsset,ExchangeInventory} from './api'

type Props={value:ExchangeAsset[];onChange:(assets:ExchangeAsset[])=>void;inventory:ExchangeInventory;disabled:boolean;loading?:boolean;multiple?:boolean}
export function SaleItemPicker({value,onChange,inventory,disabled,loading=false,multiple=true}:Props){
 const [query,setQuery]=useState('')
 const [tab,setTab]=useState('collectible')
 const categories=[{kind:'fuel',label:'연료'},{kind:'bait',label:'미끼'},{kind:'collectible',label:'개체'}]
 const assets=inventory.assets.filter(asset=>asset.kind!=='gold'&&(asset.available??0)>0)
 const normalized=query.trim().replace(/\s+/g,'').toLocaleLowerCase()
 const results=assets.filter(asset=>asset.kind===tab&&asset.name.replace(/\s+/g,'').toLocaleLowerCase().includes(normalized))
 const field='min-h-11 w-full rounded-lg border bg-background px-3 text-sm'
 return <fieldset disabled={disabled} className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
  <legend className="sr-only">판매할 물품</legend>
  <Tabs value={tab} onValueChange={value=>{setTab(String(value));setQuery('')}} className="flex min-h-0 flex-1 flex-col gap-3">
  <TabsList aria-label="판매 물품 종류" className="shrink-0 p-1">{categories.map(category=><TabsTrigger key={category.kind} value={category.kind} disabled={disabled} className="min-h-11">{category.label}<span className="text-[11px] tabular-nums opacity-60">{loading?'…':assets.filter(asset=>asset.kind===category.kind).length}</span></TabsTrigger>)}</TabsList>
  <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true"/><input type="search" aria-label="판매할 물품 검색" placeholder="물품 이름 검색" value={query} onChange={event=>setQuery(event.target.value)} className={`${field} pl-9`} maxLength={80}/></div>
  {categories.map(category=><TabsContent key={category.kind} value={category.kind} className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3" aria-busy={loading}>{results.length>0&&!loading?<ul aria-label="판매 물품 목록" className={multiple?'grid grid-cols-2 gap-2':'space-y-2'}>{results.map(asset=>{
   const active=value.some(item=>asset.kind===item.kind&&asset.id===item.id)
   return <li key={`${asset.kind}:${asset.id}`} className="min-w-0"><button type="button" disabled={disabled||(multiple&&!active&&value.length>=10)} aria-label={`${asset.name} 선택 · 보유 ${asset.available}개`} aria-pressed={active} onClick={()=>onChange(!multiple?[{...asset,quantity:1}]:active?value.filter(item=>item.kind!==asset.kind||item.id!==asset.id):[...value,{...asset,quantity:1}])} className={`relative flex w-full items-center rounded-lg border text-left transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-primary ${multiple?'h-full min-h-20 gap-2 px-2.5 py-3':'min-h-20 justify-between gap-3 px-3 py-3'} ${active?'border-primary/60 bg-primary/5':'border-border/60 bg-background'}`}>
    {multiple?<>
     {asset.kind==='collectible'?<CollectibleThumbnail path={asset.thumbnail_path??''} name={asset.name} className="size-9 shrink-0"/>:<LandscapeImage src={asset.thumbnail_path??''} alt="" className="size-9 shrink-0 object-contain"/>}
     <span className="min-w-0 flex-1"><span className="line-clamp-2 break-words text-xs leading-5">{asset.name}</span><span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">×{asset.available?.toLocaleString('ko-KR')}</span></span>
     {active&&<Check className="absolute right-1.5 top-1.5 size-3 text-primary" aria-hidden="true"/>}
    </>:<><AssetView asset={asset} compact showQuantity={false}/><span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">보유 {asset.available}개{active&&<Check className="size-4 text-primary" aria-hidden="true"/>}</span></>}
   </button></li>
  })}</ul>:<div role="status" className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-muted-foreground">{loading?'보유 물품을 확인하는 중…':normalized?'보유한 물품 중 검색 결과가 없어요.':category.kind==='collectible'?'판매할 개체가 없어요. 전시 중인 개체는 창고로 옮겨주세요.':`판매 가능한 ${category.label} 목록이 비어 있어요.`}</div>}</TabsContent>)}
  </Tabs>
 </fieldset>
}
