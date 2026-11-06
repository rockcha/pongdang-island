import {useEffect} from 'react'
import {createPortal} from 'react-dom'
import {TopviewArt} from './topview-art'
import {FarmTileArt} from './tile-controls'
import type {FarmTool} from './topview-model'
import type {FarmTile} from './tile-catalog'
import './purchase-effect.css'

export type FarmPurchaseReceipt={id:number;name:string;quantity:number}&({kind:FarmTool;tile?:never}|{tile:FarmTile;kind?:never})
export function FarmPurchaseEffect({receipt,onDismiss}:{receipt:FarmPurchaseReceipt|null;onDismiss:()=>void}){
 useEffect(()=>{if(!receipt)return;const timer=window.setTimeout(onDismiss,1800);return()=>window.clearTimeout(timer)},[receipt,onDismiss])
 if(!receipt)return null
 return createPortal(<div className="farm-purchase-effect" key={receipt.id} role="status" aria-live="polite"><div className="farm-purchase-effect-card"><span className="farm-purchase-effect-label">구매 완료</span><div className="farm-purchase-effect-art">{receipt.kind?<TopviewArt kind={receipt.kind}/>:<FarmTileArt tile={receipt.tile}/>}</div><strong>{receipt.name} <span className="farm-purchase-effect-quantity">× {receipt.quantity.toLocaleString()}</span></strong></div></div>,document.body)
}
