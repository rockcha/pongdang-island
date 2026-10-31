import './merchant-shop.css'
import {PurchaseReceipt,usePurchaseReceipt} from './purchase-receipt'
import {useState} from 'react'
import {ExplorationCodex} from './codex'
import {useExplorationTrade} from './trade-feedback'
import {ChoiceLog} from './choice-log'
import {getShopkeeper} from './shopkeepers'
import {useNpcConversation,type ConversationMemory} from './use-npc-conversation'
import {GearAttributes,WeaponEffect} from './equipment-stats'
import {GearDelta} from './gear-delta'
import {GearComparison} from './gear-comparison'
import {Coins,Droplets,Heart,Shield,Sparkles,Swords} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {buyMerchantItem,equipGear,floorMerchantGoods,purchaseBlock,type PracticeState} from './practice-state'

function PotionQuantity({state,item,onBuy}:{state:PracticeState;item:Extract<ReturnType<typeof floorMerchantGoods>[number],{kind:'potion'}>;onBuy:(quantity:number)=>boolean}){
 const [quantity,setQuantity]=useState('1')
 const count=Number(quantity),max=Math.max(0,Math.floor(state.gold/item.price)),blocked=purchaseBlock(state,item.id,count)
 return <div className="merchant-potion-controls"><div className="merchant-quantity">
 <button aria-label={item.name+' 수량 감소'} disabled={count<=1} onClick={()=>setQuantity(String(Math.max(1,count-1)))}>−</button>
 <input aria-label={item.name+' 구매 수량'} type="number" inputMode="numeric" min="1" max={Math.max(1,max)} step="1" value={quantity} onChange={event=>setQuantity(event.target.value)}/>
 <button aria-label={item.name+' 수량 증가'} disabled={count>=max} onClick={()=>setQuantity(String(Math.min(max,Math.max(1,count+1))))}>+</button>
 <button disabled={max<1} onClick={()=>setQuantity(String(max))}>최대</button></div>
 <button className="merchant-batch-buy" aria-label={item.name+' '+(Number.isSafeInteger(count)?count:0)+'개 구매'} disabled={!!blocked} onClick={()=>{if(onBuy(count))setQuantity('1')}}>{blocked??'구매'} · {Number.isSafeInteger(count)&&count>0?(count*item.price).toLocaleString():'—'} 골드</button></div>
}

export function MerchantRoom({returnToDoors=false,state,onChange,onDescend,onTalk,latestLog,conversationMemory,onEquipChange}:{onEquipChange?:()=>void;returnToDoors?:boolean;conversationMemory?:ConversationMemory;state:PracticeState;latestLog?:string;onChange:React.Dispatch<React.SetStateAction<PracticeState>>;onDescend:()=>void;onTalk:(text:string)=>void}){
 const profile=getShopkeeper(state.market.shopkeeperId)
 const [shop,setShop]=useState(false),[purchased,setPurchased]=useState(false),[tab,setTab]=useState('weapon')
 const [lastGear,setLastGear]=useState<{id:string;kind:'weapon'|'armor'}|null>(null)
 const [replacement,setReplacement]=useState<string|null>(null),[replaceId,setReplaceId]=useState('')

 const {receipt,showReceipt}=usePurchaseReceipt()
 const trade=useExplorationTrade(state,onChange)
 const {reply,departing,say,depart}=useNpcConversation(profile.greetings,onTalk,onDescend,conversationMemory)
 function purchase(item:ReturnType<typeof floorMerchantGoods>[number],quantity=1,replacing?:string){
  if(departing)return false
  if((item.kind==='weapon'||item.kind==='armor')&&(item.kind==='weapon'?state.weapons:state.armor).length>=3&&!replacing){setReplacement(item.id);setReplaceId('');return false}
  if(!trade(previous=>buyMerchantItem(previous,item.id,quantity,replacing)))return false
  showReceipt({name:item.kind==='potion'?item.name+' ×'+quantity:item.name,kind:item.kind==='armor'?'armor':item.kind==='potion'?'potion':'weapon',image:item.kind==='potion'?item.image:item.gear&&'image' in item.gear?item.gear.image:undefined})
  if(item.kind==='weapon'||item.kind==='armor')setLastGear({id:item.id,kind:item.kind})
  setPurchased(true);setReplacement(null);if(item.kind!=='potion')setShop(false);say(profile.purchases);return true
 }
 const goods=floorMerchantGoods(state)
 const replacingItem=goods.find(item=>item.id===replacement)
 const boughtGear=lastGear?(lastGear.kind==='weapon'?state.weapons:state.armor).find(item=>item.id===lastGear.id):undefined
 const full=!!replacingItem&&(replacingItem.kind==='weapon'?state.weapons:state.armor).length>=3
 const comparisonInventory=replacingItem?.kind==='weapon'?state.weapons:state.armor
 const compared=comparisonInventory.find(item=>item.id===replaceId)??comparisonInventory.find(item=>item.id===(replacingItem?.kind==='weapon'?state.weaponId:state.armorId))
 const equipped=tab==='armor'?state.armor.find(item=>item.id===state.armorId):state.weapons.find(item=>item.id===state.weaponId)
 return <section className="exploration-merchant" aria-label="상인 방">
  {receipt&&!shop&&receipt.kind!=='potion'&&<PurchaseReceipt key={receipt.key} item={receipt}/>}
  {returnToDoors&&<p className="exploration-supply-note">보급 상인 · 거래 후 지하 {state.market.floor}층 탐험을 계속합니다</p>}
  <div className="exploration-merchant-art"><img src={profile.portrait} alt={profile.name} draggable={false}/></div>
  <><div className="exploration-npc-dialogue"><h2>{profile.name}<small>{profile.title}</small></h2><ChoiceLog speaker={profile.name} className="exploration-npc-quote" text={latestLog??reply}/></div><div className="exploration-merchant-choices"><button disabled={departing} onClick={()=>setShop(true)}>{purchased?'더 구매할래요':'구매한다'}</button><button disabled={departing} onClick={()=>depart(profile.farewells)}>{returnToDoors?'문으로 돌아간다':purchased?'이제 됐어요':'구매하지 않고 지나간다'}</button></div></>
  {!shop&&boughtGear&&lastGear&&<div className="merchant-equip-choice" aria-label="구매 장비 장착"><span>{boughtGear.name} · 보관함에 구매했어요</span><button disabled={(lastGear.kind==='weapon'?state.weaponId:state.armorId)===lastGear.id} onClick={()=>{onChange(previous=>equipGear(previous,lastGear.kind,lastGear.id));onEquipChange?.()}}>{(lastGear.kind==='weapon'?state.weaponId:state.armorId)===lastGear.id?'장착 중':'장착하기'}</button><button onClick={()=>setLastGear(null)}>현재 장비 유지</button></div>}
  <Dialog open={shop} onOpenChange={value=>{setShop(value);if(!value){setReplacement(null);setReplaceId('')}}}>
 <DialogContent className="exploration-modal exploration-room-preview exploration-shop exploration-minimal-shop">
  <DialogHeader><DialogTitle>{profile.shopName} · 지하 {state.market.floor}층</DialogTitle><DialogDescription>장비는 보관함에 구매해요. 내 장비 탭에서 보유 물품을 비교할 수 있어요.</DialogDescription></DialogHeader>
  <div className="exploration-shop-gold"><div className="merchant-gold-balance" aria-label={`보유 골드 ${state.gold.toLocaleString()}`}><Coins size={21}/><span><small>보유 골드</small><strong>{state.gold.toLocaleString()}<small> G</small></strong></span></div><ExplorationCodex ownedIds={[...state.weapons,...state.armor,...state.spells].map(item=>item.id)}/></div>
  {replacingItem&&(replacingItem.kind==='weapon'||replacingItem.kind==='armor')?<section className="merchant-replacement" aria-label="구매 장비 비교"><h3>구매할 장비 · {replacingItem.name}</h3>{compared&&<GearDelta current={compared} candidate={replacingItem.gear} currentLabel={full&&replaceId?'교체 대상':'현재 장착'}/>}<div className="merchant-purchase-summary" aria-label="구매 정보"><span>가격 <b>{replacingItem.price.toLocaleString()} 골드</b></span><span>보관함 <b>{comparisonInventory.length}/3{full?' · 교체 필요':` → ${comparisonInventory.length+1}/3`}</b></span></div>{full?<><p>교체할 장비를 선택하세요. 장착 중인 장비를 교체하면 새 장비가 장착됩니다.</p><GearComparison items={comparisonInventory} equippedId={replacingItem.kind==='weapon'?state.weaponId:state.armorId} selected={replaceId} onSelect={setReplaceId}/></>:<p>현재 장비는 유지됩니다. 구매 후 원할 때 장착하세요.</p>}<button className="exploration-choice-confirm" disabled={!!purchaseBlock(state,replacingItem.id,1,full?replaceId||undefined:undefined)} onClick={()=>purchase(replacingItem,1,full?replaceId:undefined)}>{full?'교체하고 구매':'보관함에 구매'} · {replacingItem.price.toLocaleString()} 골드</button><button className="exploration-modal-return" onClick={()=>{setReplacement(null);setReplaceId('')}}>취소</button></section>:<>
  <div className="merchant-tabs" role="group" aria-label="물품 종류">{([{kind:'weapon',label:'무기'},{kind:'armor',label:'방어구'},{kind:'potion',label:'포션'},{kind:'owned',label:'내 장비'}] as const).filter(value=>value.kind!=='armor'||profile.sellsArmor).map(value=><button key={value.kind} aria-pressed={tab===value.kind} onClick={()=>setTab(value.kind)}>{value.label}</button>)}</div>
  {tab==='owned'?<section className="merchant-owned" aria-label="내 장비"><h3>보유 무기 · {state.weapons.length}/3</h3><GearComparison items={state.weapons} equippedId={state.weaponId}/><h3>보유 방어구 · {state.armor.length}/3</h3><GearComparison items={state.armor} equippedId={state.armorId}/></section>:<>
  {(tab==='weapon'||tab==='armor')&&equipped&&<div className="merchant-current-equipment">{equipped.image&&<img src={equipped.image} alt={equipped.name}/>}<div><small>현재 장착 {tab==='weapon'?'무기':'방어구'}</small><strong>{equipped.name}</strong><GearAttributes gear={equipped} compact/><WeaponEffect gear={equipped} compact/></div></div>}
  <div className="exploration-shop-items">{([{kind:'weapon',label:'무기',note:'3개 진열'},{kind:'armor',label:'방어구',note:'3개 진열'},{kind:'potion',label:'소모품',note:'상시 판매'}] as const).filter(section=>section.kind===tab&&(section.kind!=='armor'||profile.sellsArmor)).map(section=><section className="exploration-shop-section" key={section.kind} aria-label={section.label}><h3>{section.label}<small>{section.kind==='potion'?section.note:`${goods.filter(item=>item.kind===section.kind).length}개 진열`}</small></h3>{!goods.some(item=>item.kind===section.kind)&&<p className="exploration-shop-empty">새롭게 구매할 장비가 없어요.</p>}{goods.filter(item=>item.kind===section.kind).map(item=>{
   const reason=purchaseBlock(state,item.id),blocked=reason==='보관 칸 부족'?null:reason,Icon=item.kind==='weapon'?Swords:item.kind==='armor'?Shield:item.kind==='potion'?(item.potionKind==='health'?Heart:Droplets):Sparkles
   return <article key={item.id}>{item.kind==='potion'?<img className="exploration-shop-weapon exploration-potion-art" src={item.image} alt={item.name}/>:item.gear&&'image' in item.gear&&item.gear.image?<img className="exploration-shop-weapon" src={item.gear.image} alt={item.name}/>:<Icon size={23}/>}<div><h4>{item.name}</h4>{item.gear?<><GearAttributes gear={item.gear} compact/><WeaponEffect gear={item.gear} compact/></>:<p>{item.description}</p>}<span className="merchant-item-price" data-unaffordable={state.gold<item.price} aria-label={`가격 ${item.price.toLocaleString()} 골드`}><Coins size={14}/><b>{item.price.toLocaleString()}</b><small>G</small></span>{item.kind==='potion'&&<small> · 보유 {state.potions[item.potionKind]}개</small>}</div>{item.kind==='potion'?<PotionQuantity item={item} state={state} onBuy={quantity=>purchase(item,quantity)}/>:<button disabled={!!blocked} onClick={()=>purchase(item)}>{blocked??'구매'}</button>}</article>
  })}</section>)}</div>
  </>}</>}
  <div className="merchant-confirmation">{receipt?.kind==='potion'&&<span key={receipt.key} role="status" aria-label="구매 알림" aria-live="polite">{receipt.image&&<img src={receipt.image} alt=""/>}{receipt.name} · 구매 완료</span>}</div>
  {<button className="exploration-room-return" onClick={()=>{setShop(false);setReplacement(null);setReplaceId('')}}>{profile.name}에게 돌아가기</button>}
 </DialogContent>
</Dialog>
 </section>
}
