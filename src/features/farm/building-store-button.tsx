import {FarmGold,FarmGoldIcon} from './farm-gold'
import {useState} from 'react'
import {Package,Move,FlipHorizontal2} from 'lucide-react'
import {farmObjectResaleError,farmResalePrice,isResellableFarmKind} from './resale'
import {farmBuildingStorageError} from './farm-simulation'
import {topviewItems,type TopviewObject,type TopviewState} from './topview-model'

export function BuildingStoreButton({object,state,onStore,pendingPlots=0,onMove,onFlip,onSell}:{object:TopviewObject;state:TopviewState;onStore:()=>void;pendingPlots?:number;onMove?:()=>void;onFlip?:()=>void;onSell?:()=>void}){
 const [showReason,setShowReason]=useState(false)
 if(topviewItems[object.kind].group!=='건물')return null
 const reason=farmBuildingStorageError(state,object.id,pendingPlots)
 const saleReason=farmObjectResaleError(state,object.id),sellable=isResellableFarmKind(object.kind)&&onSell
 return <div className="farm-building-store"><div className="farm-building-actions" role="group" aria-label="건물 배치 관리">{onMove&&<button onClick={onMove}><Move size={15}/>이동하기</button>}{onFlip&&<button onClick={onFlip} aria-pressed={!!object.flipped}><FlipHorizontal2 size={15}/>좌우반전</button>}<button aria-disabled={!!reason} onClick={()=>{if(reason){setShowReason(true);return}onStore()}}><Package size={15}/>보관하기</button></div>{showReason&&reason&&<p role="status">{reason}</p>}{sellable&&<><button className="farm-object-sale-button" disabled={!!saleReason} onClick={onSell} aria-label={topviewItems[object.kind].name+" 반값 판매"}><FarmGoldIcon/>판매 · +<FarmGold amount={farmResalePrice(object.kind).toLocaleString()}/></button>{saleReason&&<p className="farm-sale-reason">{saleReason}</p>}</>}</div>
}
