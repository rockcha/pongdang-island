import {useState} from 'react'
import {Check,Search} from 'lucide-react'
import {AssetView} from './asset-view'
import type {ExchangeAsset,ExchangeInventory} from './api'

type Props={value:ExchangeAsset;onChange:(asset:ExchangeAsset)=>void;inventory:ExchangeInventory;disabled:boolean;loading?:boolean}
export function SaleItemPicker({value,onChange,inventory,disabled,loading=false}:Props){
 const [query,setQuery]=useState('')
 const assets=inventory.assets.filter(asset=>asset.kind!=='gold'&&(asset.available??0)>0)
 const normalized=query.trim().replace(/\s+/g,'').toLocaleLowerCase()
 const results=normalized?assets.filter(asset=>asset.name.replace(/\s+/g,'').toLocaleLowerCase().includes(normalized)):[]
 const field='min-h-11 w-full rounded-lg border bg-background px-3 text-sm'
 return <fieldset disabled={disabled} className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
  <legend className="sr-only">판매할 물품</legend>
  <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true"/><input type="search" aria-label="판매할 물품 검색" placeholder="보유한 개체·미끼 이름 검색" value={query} onChange={event=>setQuery(event.target.value)} className={`${field} pl-9`} maxLength={80}/></div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={loading}>{results.length>0&&!loading?<ul aria-label="판매 물품 검색 결과" className="divide-y divide-border/60">{results.map(asset=>{
   const active=asset.kind===value.kind&&asset.id===value.id
   return <li key={`${asset.kind}:${asset.id}`}><button type="button" disabled={disabled} aria-label={`${asset.name} 선택 · 보유 ${asset.available}개`} aria-pressed={active} onClick={()=>onChange({...asset,quantity:active?value.quantity:1})} className={`flex min-h-16 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-primary ${active?'bg-secondary/60':''}`}>
    <AssetView asset={asset} compact showQuantity={false}/><span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">보유 {asset.available}개{active&&<Check className="size-4 text-primary" aria-hidden="true"/>}</span>
   </button></li>
  })}</ul>:<div role="status" className="flex h-full items-center justify-center px-6 text-center text-xs leading-5 text-muted-foreground">{loading?'보유 물품을 확인하는 중…':!assets.length?'판매할 물품이 없어요. 전시 중인 개체는 창고로 옮겨주세요.':!normalized?'판매할 물품 이름을 검색해주세요.':'보유한 물품 중 검색 결과가 없어요.'}</div>}</div>
 </fieldset>
}
