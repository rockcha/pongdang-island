import {spellTierNames} from './spell-catalog'
import './merchant-shop.css'
import {ShopPotions} from './shop-potions'
import {acquiredItemIds} from './acquisition-history'
import {PurchaseReceipt,usePurchaseReceipt} from './purchase-receipt'
import {useState} from 'react'
import {Coins} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {ExplorationCodex} from './codex'
import {useExplorationTrade} from './trade-feedback'
import {ChoiceLog} from './choice-log'
import {getShopkeeper} from './shopkeepers'
import {useNpcConversation,type ConversationMemory} from './use-npc-conversation'
import {buyMerchantItem,merchantPotions,type PracticeState} from './practice-state'
import {learnShamanSpell,shamanLearningBlock,getShamanSpells} from './shaman-stock'

export function ShamanRoom({state,onChange,onDescend,onTalk,latestLog,conversationMemory}:{conversationMemory?:ConversationMemory;state:PracticeState;latestLog?:string;onChange:React.Dispatch<React.SetStateAction<PracticeState>>;onDescend:()=>void;onTalk:(text:string)=>void}){
 const profile=getShopkeeper(state.shamanStock?.shopkeeperId??'nadim')
 const [shop,setShop]=useState(false),[learned,setLearned]=useState(false)
 const {receipt,showReceipt}=usePurchaseReceipt()
 const trade=useExplorationTrade(state,onChange)
 function buyPotion(id:string){
  const potion=merchantPotions.find(item=>item.id===id)
  if(!potion||departing||!trade(previous=>buyMerchantItem(previous,id)))return
  showReceipt({name:potion.name,image:potion.image,kind:'potion'})
  setShop(false)
 }
 const {reply,departing,say,depart}=useNpcConversation(profile.greetings,onTalk,onDescend,conversationMemory)
 function learn(spell:ReturnType<typeof getShamanSpells>[number]){
  if(departing||!trade(previous=>learnShamanSpell(previous,spell.id)))return
  showReceipt({name:spell.name,kind:'magic',image:spell.image})
  setLearned(true);setShop(false);say(profile.purchases)
 }
 const acquired=acquiredItemIds(state)
 const spells=(state.shamanStock?.spellIds??[]).flatMap(id=>getShamanSpells(state).filter(spell=>spell.id===id&&!acquired.has(id)))
 return <section className="exploration-merchant exploration-shaman" aria-label={profile.name}>
  {receipt&&!shop&&<PurchaseReceipt key={receipt.key} item={receipt}/>}
  <div className="exploration-merchant-art exploration-shaman-portrait"><div className="shaman-figure"><img src={profile.portrait} alt={profile.name} draggable={false}/></div></div>
  <div className="exploration-npc-dialogue"><h2>{profile.name}<small>{profile.title}</small></h2><ChoiceLog speaker={profile.name} className="exploration-npc-quote" text={latestLog??reply}/></div>
  <div className="exploration-merchant-choices"><button disabled={departing} onClick={()=>setShop(true)}>{learned?'더 구매할래요':'마법을 살펴본다'}</button><button disabled={departing} onClick={()=>depart(profile.farewells)}>{learned?'이제 됐어요':'배우지 않고 내려간다'}</button></div>
  <Dialog open={shop} onOpenChange={setShop}><DialogContent className="exploration-modal exploration-room-preview exploration-shop exploration-shaman-shop exploration-minimal-shop">
   <DialogHeader><DialogTitle>{profile.shopName} · 지하 {state.market.floor}층</DialogTitle><DialogDescription>마법과 회복 포션을 구매할 수 있어요. 배운 마법은 보관함에서 장착할 수 있어요.</DialogDescription></DialogHeader>
   <div className="exploration-shop-gold"><Coins size={16}/> 보유 골드 {state.gold.toLocaleString()}<ExplorationCodex state={state} initialCategory="spell" ownedIds={state.spells.map(spell=>spell.id)}/></div>
   <div className="exploration-shop-items">{!spells.length&&<p className="exploration-shop-empty">새롭게 배울 마법이 없어요.</p>}{spells.map(spell=><article key={spell.id}><img className="exploration-shop-weapon" src={spell.image} alt={spell.name}/><div><small className="exploration-shop-tier" data-tier={spell.tier}>{spellTierNames[spell.tier]}</small><h4>{spell.name}</h4><p>{spell.description}</p><small>MP {spell.mana}</small><br/><span>{spell.learnPrice?.toLocaleString()} 골드</span>{!spell.available&&<p>효과 준비 중 · 아직 배울 수 없어요.</p>}</div><button disabled={!!shamanLearningBlock(state,spell.id)} onClick={()=>learn(spell)}>{shamanLearningBlock(state,spell.id)??'배우기'}</button></article>)}<ShopPotions state={state} busy={departing} onBuy={buyPotion}/></div>
   {<button className="exploration-room-return" onClick={()=>setShop(false)}>{profile.name}에게 돌아가기</button>}
  </DialogContent></Dialog>
 </section>
}
