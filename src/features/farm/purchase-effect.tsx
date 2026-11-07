import {useEffect} from 'react'
import {TopviewArt} from './topview-art'
import {FarmTileArt} from './tile-controls'
import {topviewItems,type FarmTool} from './topview-model'
import type {FarmTile} from './tile-catalog'
import {FarmLandArt} from './land-controls'
import {FarmItemReceipt,FARM_RECEIPT_MS} from './item-receipt'

export type FarmPurchaseReceipt={id:number;name:string;quantity:number}&({kind:FarmTool;tile?:never;land?:never}|{tile:FarmTile;kind?:never;land?:never}|{land:true;kind?:never;tile?:never})
export function FarmPurchaseEffect({receipt,onDismiss}:{receipt:FarmPurchaseReceipt|null;onDismiss:()=>void}){
 useEffect(()=>{if(!receipt)return;const timer=window.setTimeout(onDismiss,FARM_RECEIPT_MS);return()=>window.clearTimeout(timer)},[receipt,onDismiss])
 if(!receipt)return null
 const unit=receipt.land||receipt.tile?'칸':receipt.kind&&topviewItems[receipt.kind].group==='동물'?'마리':'개'
 return <FarmItemReceipt id={receipt.id} className="farm-purchase-effect" label={`${receipt.name} ${receipt.quantity}${unit} 구매`} quantity={receipt.quantity} art={receipt.land?<FarmLandArt/>:receipt.kind?<TopviewArt kind={receipt.kind} compact/>:<FarmTileArt tile={receipt.tile}/>}/>
}
