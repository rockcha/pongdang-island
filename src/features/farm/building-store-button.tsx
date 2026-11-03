import {useState} from 'react'
import {Package,Move} from 'lucide-react'
import {farmBuildingStorageError} from './farm-simulation'
import {topviewItems,type TopviewObject,type TopviewState} from './topview-model'

export function BuildingStoreButton({object,state,onStore,pendingPlots=0,onMove}:{object:TopviewObject;state:TopviewState;onStore:()=>void;pendingPlots?:number;onMove?:()=>void}){
 const [showReason,setShowReason]=useState(false)
 if(topviewItems[object.kind].group!=='건물')return null
 const reason=farmBuildingStorageError(state,object.id,pendingPlots)
 return <div className="farm-building-store"><div className="farm-building-actions" role="group" aria-label="건물 배치 관리">{onMove&&<button onClick={onMove}><Move size={15}/>이동하기</button>}<button aria-disabled={!!reason} onClick={()=>{if(reason){setShowReason(true);return}onStore()}}><Package size={15}/>보관하기</button></div>{showReason&&reason&&<p role="status">{reason}</p>}</div>
}
