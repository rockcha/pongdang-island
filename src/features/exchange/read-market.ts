import {createClient} from '@/lib/client'
import {fuelDisplay} from '@/lib/fuel-display'
import {exchangeOfferItems,type ExchangePage} from './api'
export type MarketFilter={tab:string;query:string;kind:string;status:string;offset:number}
export async function readExchangeMarket(filter:MarketFilter,signal:AbortSignal):Promise<ExchangePage>{
 const filtered=filter.kind!=='all'||filter.tab==='mine'&&filter.status!=='all'
 const items:ExchangePage['items']=[]
 for(let offset=filtered?0:filter.offset;;offset+=20){
  signal.throwIfAborted()
  const {data,error}=await createClient().rpc('exchange_state',{p_tab:filter.tab,p_query:filter.query.replaceAll('연료','기름'),p_offset:offset}).abortSignal(signal)
  if(error)throw error
  const page=fuelDisplay(data) as ExchangePage
  if(!filtered)return page
  items.push(...page.items)
  if(offset+20>=page.total||page.items.length===0)break
 }
 const matching=Array.from(new Map(items.map(item=>[item.id,item])).values()).filter(listing=>(filter.kind==='all'||exchangeOfferItems(listing.offer).some(item=>item.kind===filter.kind||item.subtype===filter.kind))&&(filter.tab!=='mine'||filter.status==='all'||listing.status===filter.status))
 return {items:matching,total:matching.length}
}
