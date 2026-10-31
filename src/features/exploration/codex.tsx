import {useId,useState,type KeyboardEvent} from 'react'
import {BookOpen,Check,Coins,Shield,Sparkles,Swords} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {explorationWeapons,hasWeaponEffect,weaponTierNames,type WeaponTier} from './weapon-catalog'
import {plannedSpells,type PlannedSpell} from './spell-catalog'
import {practiceSpells} from './practice-state'
import {armorCatalog} from './armor-catalog'
import {combatMagic} from './combat-state'
import {GearAttributes,WeaponEffect} from './equipment-stats'
import './exploration-usability.css'

export type CodexCategory='weapon'|'spell'|'armor'
function CodexImage({src,name,kind}:{src?:string;name:string;kind:CodexCategory}){
 const [failed,setFailed]=useState(false),Icon=kind==='weapon'?Swords:kind==='armor'?Shield:Sparkles
 return src&&!failed?<img src={src} alt={name} loading="lazy" onError={()=>setFailed(true)}/>:<div className="weapon-codex-fallback" role="img" aria-label={name}><Icon size={70} strokeWidth={1.1}/></div>
}
type SpellEntry={id:string;name:string;tier:WeaponTier;mana:number;image?:string;learnPrice?:number;description:string;current:boolean;kind?:PlannedSpell['kind']}
const spells:SpellEntry[]=[...practiceSpells.map(spell=>({...spell,tier:'starter' as const,current:true,description:combatMagic[spell.id as keyof typeof combatMagic]??spell.description})),...plannedSpells.map(spell=>({...spell,current:spell.available}))]
const spellKinds:Record<PlannedSpell['kind'],string>={damage:'직접 피해','damage-status':'피해·상태이상',debuff:'디버프',buff:'버프',healing:'치유',cleanse:'정화'}
const categories=[{id:'weapon',label:'무기',Icon:BookOpen,count:explorationWeapons.length},{id:'spell',label:'마법',Icon:Sparkles,count:spells.length},{id:'armor',label:'방어구',Icon:Shield,count:armorCatalog.length}] as const

export function ExplorationCodex({ownedIds=[],initialCategory='weapon'}:{ownedIds?:string[];initialCategory?:CodexCategory}){
 const id=useId()
 const [open,setOpen]=useState(false),[category,setCategory]=useState<CodexCategory>(initialCategory)
 const [filter,setFilter]=useState<'all'|'plain'|'effect'|'utility'>('all')
 const [weaponTier,setWeaponTier]=useState<'all'|WeaponTier>('all'),[spellTier,setSpellTier]=useState<'all'|WeaponTier>('all'),[armorTier,setArmorTier]=useState<'all'|WeaponTier>('all')
 const tier=category==='spell'?spellTier:category==='armor'?armorTier:weaponTier
 const setTier=category==='spell'?setSpellTier:category==='armor'?setArmorTier:setWeaponTier
 const tierItems=category==='spell'?spells:category==='armor'?armorCatalog:explorationWeapons
 const weapons=explorationWeapons.filter(weapon=>(weaponTier==='all'||weapon.tier===weaponTier)&&(filter==='all'||(filter==='effect'?!!weapon.proc:filter==='utility'?!!(weapon.lifesteal||weapon.cleanseChance):!hasWeaponEffect(weapon))))
 const shownSpells=spells.filter(spell=>spellTier==='all'||spell.tier===spellTier)
 function navigateTab(event:KeyboardEvent<HTMLButtonElement>,index:number){
  const next=event.key==='ArrowRight'?(index+1)%categories.length:event.key==='ArrowLeft'?(index+categories.length-1)%categories.length:event.key==='Home'?0:event.key==='End'?categories.length-1:-1
  if(next<0)return
  event.preventDefault();setCategory(categories[next].id)
  const tabs=event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')
  tabs?.[next].focus()
 }
 return <><button className="exploration-codex-button" onClick={()=>{setCategory(initialCategory);setOpen(true)}}><BookOpen size={16}/>도감</button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="exploration-modal exploration-weapon-codex exploration-codex"><DialogHeader><DialogTitle>도감</DialogTitle><DialogDescription>무기·마법·방어구의 능력과 기준 가격을 확인해요. 기준 가격은 현재 진열 여부와 별개예요.</DialogDescription></DialogHeader>
  <div className="exploration-codex-tabs" role="tablist" aria-label="도감 종류">{categories.map((item,index)=><button key={item.id} id={`${id}-${item.id}`} role="tab" tabIndex={category===item.id?0:-1} aria-selected={category===item.id} aria-controls={`${id}-panel`} onKeyDown={event=>navigateTab(event,index)} onClick={()=>setCategory(item.id)}><item.Icon size={15}/>{item.label} <small>{item.count}</small></button>)}</div>
  {<div className="weapon-codex-tiers" role="group" aria-label={category==='spell'?'마법 단계':category==='armor'?'방어구 단계':'무기 단계'}>{(['all','starter','advanced','ultimate'] as const).map(value=><button key={value} aria-pressed={tier===value} onClick={()=>setTier(value)}>{value==='all'?'모든 단계':weaponTierNames[value]}{' '}<small>{tierItems.filter(item=>value==='all'||item.tier===value).length}</small></button>)}</div>}
  {category==='weapon'&&<div className="weapon-codex-filters" role="group" aria-label="무기 분류">{([['all','전체'],['plain','기본형'],['effect','상태이상'],['utility','피흡·정화']] as const).map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>}
  <div className="weapon-codex-grid" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${category}`}>
   {category==='weapon'&&weapons.map(weapon=><article key={weapon.id} data-tier={weapon.tier}><div className="weapon-codex-art"><CodexImage src={weapon.image} name={weapon.name} kind="weapon"/>{ownedIds.includes(weapon.id)&&<span><Check size={12}/>보유</span>}</div><div className="weapon-codex-copy"><small><b className="weapon-tier-label">{weaponTierNames[weapon.tier]}</b> · {weapon.role}</small><h3>{weapon.name}</h3><GearAttributes gear={weapon} compact/><p>{weapon.description}</p><WeaponEffect gear={weapon} compact/><footer><Coins size={13}/><b>{weapon.price.toLocaleString()}</b><span>{weapon.merchantAvailable?'상인 판매':'기준 가격'}</span></footer></div></article>)}
   {category==='spell'&&shownSpells.map(spell=><article key={spell.id} data-tier={spell.tier}><div className="weapon-codex-art codex-spell-art"><CodexImage src={spell.image} name={spell.name} kind="spell"/>{ownedIds.includes(spell.id)&&<span><Check size={12}/>습득</span>}</div><div className="weapon-codex-copy"><small><b className="weapon-tier-label">{weaponTierNames[spell.tier]}</b> · {spell.kind?spellKinds[spell.kind]:'연습 마법'}</small><h3>{spell.name}</h3><div className="weapon-codex-stats"><span>소모 MP <b>{spell.mana}</b></span></div><p>{spell.description}</p><div className="codex-availability">{spell.current?'현재 연습에서 사용 가능':'학습 예정'}</div><footer><Coins size={13}/><b>{spell.learnPrice?.toLocaleString()??'미정'}</b><span>학습 기준 비용</span></footer></div></article>)}
   {category==='armor'&&armorCatalog.filter(item=>armorTier==='all'||item.tier===armorTier).map(({gear,source,price,tier:armorTierName,role})=><article key={gear.id}><div className="weapon-codex-art"><CodexImage src={gear.image} name={gear.name} kind="armor"/>{ownedIds.includes(gear.id)&&<span><Check size={12}/>보유</span>}</div><div className="weapon-codex-copy"><small><b className="weapon-tier-label">{weaponTierNames[armorTierName]}</b> · {role}</small><h3>{gear.name}</h3><GearAttributes gear={gear} compact/><p>{gear.description}</p><footer>{price!==undefined?<><Coins size={13}/><b>{price.toLocaleString()}</b><span>{source==='merchant'?'상인 판매':'기준 가격'}</span></>:<span className="weapon-codex-unreleased">{source==='starter'?'기본 지급':'연습 물품으로 지급'}</span>}</footer></div></article>)}
  </div>
  <p className="weapon-codex-note">{category==='weapon'?'치명타는 직접 피해의 2배예요. 같은 상태는 강한 효과를 우선하며, 빙결 해제 후 적이 한 번 행동하기 전까지 다시 얼지 않아요.':category==='spell'?'소모 MP는 시전할 때, 학습비는 마법을 배울 때 필요한 비용이에요. 배운 마법은 보관함에서 장착해 사용해요.':'회피는 기본 공격에만 적용돼요. 체력 장비 교체로 회복되지 않으며, 방어력 적용 후 최소 1 피해를 받아요. 보호막은 별도 적용돼요.'}</p>
 </DialogContent></Dialog></>
}
