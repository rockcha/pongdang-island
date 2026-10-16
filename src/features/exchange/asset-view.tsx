import {GoldIcon} from '@/features/gold/gold-provider'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {ExchangeAsset} from './api'
export function AssetView({asset,compact=false,showQuantity=true}:{asset:ExchangeAsset;compact?:boolean;showQuantity?:boolean}){
 const size=compact?'size-9':'size-14'
 return <span className="inline-flex min-w-0 items-center gap-2">
  {asset.kind==='gold'?<GoldIcon className={size}/>:asset.kind==='bait'?<img src={asset.thumbnail_path??''} alt="" className={`${size} shrink-0 object-contain`}/>:<CollectibleThumbnail path={asset.thumbnail_path??''} name={asset.name} className={size}/>}
  <span className="min-w-0"><span className="block break-words text-sm">{asset.kind==='gold'?`${asset.quantity.toLocaleString('ko-KR')}골드`:asset.name}</span>{showQuantity&&asset.kind!=='gold'&&<span className="block text-xs tabular-nums text-muted-foreground">×{asset.quantity.toLocaleString('ko-KR')}</span>}</span>
 </span>
}
