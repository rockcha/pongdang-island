import {FarmGold,FarmGoldIcon} from './farm-gold'
import {createPortal} from 'react-dom'
import {Check,FlaskConical,ShoppingBag,Sparkles,ChefHat} from 'lucide-react'
import {FarmGoodIcon} from './farm-good-icon'
import {farmGoods,type FarmEffect} from './farm-simulation'
import {FarmDiscardIcon} from './discard-icon'
import {TopviewArt} from './topview-art'
import {topviewItems} from './topview-model'
import {isFarmSupply} from './supply-catalog'

export function FarmActionEffect({effect}:{effect:FarmEffect&{id:number}}){
 if(effect.type==='sell')return createPortal(<div key={effect.id} className="farm-sale-effect" role="status" aria-live="polite" data-farm-effect="sell"><div className="farm-sale-card"><span className="farm-sale-coin"><FarmGoldIcon/></span><strong>+ <FarmGold amount={(effect.gold??0).toLocaleString()}/></strong><span>{effect.items?`${effect.items.length}종 · ${effect.quantity}개 판매`:`${farmGoods[effect.good].name} ×${effect.quantity} 납품`}</span></div></div>,document.body)
 const titles={buy:isFarmSupply(effect.good)?'비료를 담았어요':'종자를 담았어요',sell:'판매했어요',research:'새로운 씨앗을 연구해요',unlock:'새 종자 발견!',harvest:'수확했어요',craft:'맛있게 만들고 있어요',crafted:'수령했어요',received:'수령했어요',discarded:'폐기했어요'}
 const destination=effect.animal?'보관함':['harvest','crafted'].includes(effect.type)?'창고':null
 const receipt=!!destination||effect.type==='discarded'
 const Symbol=effect.type==='research'?FlaskConical:effect.type==='buy'?ShoppingBag:effect.type==='unlock'?Sparkles:effect.type==='craft'?ChefHat:Check
 return createPortal(<div key={effect.id} className={`farm-action-effect farm-action-${effect.type}`} aria-hidden={receipt?undefined:true} role={receipt?'status':undefined} aria-live={receipt?'polite':undefined} data-farm-effect={effect.type}>
  <div className="farm-action-burst">{Array.from({length:8},(_,i)=><i key={i} style={{'--angle':`${i*45}deg`} as React.CSSProperties}/>)}</div>
  <div className="farm-action-orbit"/><div className="farm-action-card"><div className="farm-action-art">{effect.type==='discarded'?<span className="farm-good-icon"><FarmDiscardIcon/></span>:effect.animal?<span className="farm-received-animal"><TopviewArt kind={effect.animal}/></span>:<FarmGoodIcon good={effect.good}/>}<span><Symbol size={17}/></span></div><strong>{titles[effect.type]}</strong>{effect.items?effect.items.map(item=><p key={item.good}>{farmGoods[item.good].name} ×{item.quantity}</p>):<p>{effect.animal?topviewItems[effect.animal].name:farmGoods[effect.good].name}{effect.quantity?` ×${effect.quantity}`:''}</p>}{effect.type==='discarded'&&<small className="farm-receipt-destination">밭을 깨끗하게 비웠어요.</small>}{destination&&<small className="farm-receipt-destination">{destination}에 보관했습니다.</small>}{effect.gold!==undefined&&<b>−<FarmGold amount={effect.gold.toLocaleString()}/></b>}</div>
 </div>,document.body)
}
