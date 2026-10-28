import {readFlea,type FleaFilter,type FleaFeed,type FleaPost} from './api'
import type {ExchangeAsset} from '@/features/exchange/api'
export const fleaAssetKey=(asset:ExchangeAsset)=>asset.kind+':'+asset.id
export function compareFleaPosts(posts:FleaPost[],assetKey:string,sort:'latest'|'low'|'high'){
 const price=(post:FleaPost)=>Math.min(...post.items.filter(item=>fleaAssetKey(item.asset)===assetKey&&item.remaining>0).map(item=>item.unit_price))
 return posts.filter(post=>post.status==='active'&&Number.isFinite(price(post))).toSorted((a,b)=>(sort==='latest'?0:(price(a)-price(b))*(sort==='high'?-1:1))||Date.parse(b.created_at)-Date.parse(a.created_at)||a.id.localeCompare(b.id))
}
/** Price comparisons include every matching page, rather than sorting one latest page. */
export async function readFleaComparison(filter:FleaFilter,assetKey:string,sort:'latest'|'low'|'high',signal:AbortSignal):Promise<FleaFeed>{
 const posts=new Map<string,FleaPost>()
 for(let offset=0;;offset+=20){
  signal.throwIfAborted()
  const page=await readFlea({...filter,offset},signal)
  page.items.forEach(post=>posts.set(post.id,post))
  if(offset+20>=page.total||page.items.length===0)break
 }
 const items=compareFleaPosts([...posts.values()],assetKey,sort)
 return {items,total:items.length}
}
