import {FarmGold,FarmGoldIcon} from './farm-gold'
import {createPortal} from 'react-dom'
import {FarmGoodIcon} from './farm-good-icon'
import {farmGoods,type FarmEffect} from './farm-simulation'
import {FarmDiscardIcon} from './discard-icon'
import {TopviewArt} from './topview-art'
import {topviewItems} from './topview-model'
import {FarmItemReceipt} from './item-receipt'

export function FarmActionEffect({effect}:{effect:FarmEffect&{id:number}}){
 if(effect.type==='harvest')return null
 if(effect.type==='sell')return createPortal(<div key={effect.id} className="farm-sale-effect" role="status" aria-live="polite" data-farm-effect="sell"><div className="farm-sale-card"><span className="farm-sale-coin"><FarmGoldIcon/></span><strong>+ <FarmGold amount={(effect.gold??0).toLocaleString()}/></strong><span>{effect.items?`${effect.items.length}종 · ${effect.quantity}개 판매`:`${farmGoods[effect.good].name} ×${effect.quantity} 납품`}</span></div></div>,document.body)
 const name=effect.animal?topviewItems[effect.animal].name:farmGoods[effect.good].name
 const art=effect.type==='discarded'?<FarmDiscardIcon/>:effect.animal?<TopviewArt kind={effect.animal} compact/>:<FarmGoodIcon good={effect.good}/>
 const gain=effect.type==='buy'||effect.type==='crafted'||effect.type==='received'
 const detail={buy:'구매',crafted:'수령',received:'수령',research:'연구 시작',unlock:'연구 완료',craft:'제작 시작',discarded:'폐기 완료'}[effect.type]
 return <FarmItemReceipt id={effect.id} className="farm-action-effect" effect={effect.type} art={art} label={`${name}${gain?` ${effect.quantity??1}개`:''} ${detail}`} quantity={gain?effect.quantity??1:undefined} detail={gain?undefined:detail}/>
}
