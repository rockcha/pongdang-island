import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {ArrowDown,Backpack,Check,DoorClosed,Flame,Heart,LogOut,Shield,Smartphone,Sparkles,Swords} from 'lucide-react'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GameLeaveGuard} from '@/features/arcade/game-leave-guard'
import {hasOpenOverlay} from '@/components/overlay-back'
import {equipGear,grantPracticeSupplies,newPractice,toggleSpell,type Gear,type PracticeState} from './practice-state'

const doors=[{name:'모래에 묻힌 문',rune:'𓂀',hint:'문틈으로 마른 모래가 흘러내립니다.',detail:'모래 위에는 오래된 발자국만 남아 있습니다. 누군가 먼저 이곳을 지나갔을까요?'},{name:'황금 문양의 문',rune:'𓆣',hint:'빛바랜 황금 문양이 희미하게 빛납니다.',detail:'황금빛 풍뎅이가 새겨져 있습니다. 문 너머에서는 낮고 규칙적인 울림이 들립니다.'},{name:'물소리가 나는 문',rune:'𓈖',hint:'고요한 물방울 소리가 들려옵니다.',detail:'문 아래로 차가운 물기가 번집니다. 어둠 속에서 물방울이 천천히 떨어지고 있습니다.'}]
export function gearStats(item:Gear){return item.attack!==undefined?`공격력 ${item.attack} · 치명타 ${item.critical}%`:`피격 피해 ${item.reduction} 감소 · 회피 ${item.evasion}%`}

export function ExplorationGame({nickname,avatarPath,onLeave}:{nickname:string;avatarPath?:string|null;onLeave:()=>void}){
 const [state,setState]=useState(newPractice),[descending,setDescending]=useState(true),[bag,setBag]=useState(false),[leave,setLeave]=useState(false)
 const [message,setMessage]=useState('계단 끝에 세 개의 문이 모습을 드러냅니다.')
 const requestExit=useRef(()=>setLeave(true));requestExit.current=()=>setLeave(true)
 const mounted=useRef(true)
 useEffect(()=>{
  mounted.current=true
  const root=document.getElementById('root'),wasInert=root?.inert,overflow=document.body.style.overflow
  if(root)root.inert=true
  document.body.style.overflow='hidden'
  const timer=setTimeout(()=>setDescending(false),window.matchMedia('(prefers-reduced-motion: reduce)').matches?100:1500)
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!hasOpenOverlay()){event.preventDefault();requestExit.current()}}
  let wasFullscreen=!!document.fullscreenElement
  const fullscreen=()=>{if(document.fullscreenElement){wasFullscreen=true;if(!mounted.current)void document.exitFullscreen().catch(()=>{})}else if(wasFullscreen){wasFullscreen=false;requestExit.current()}}
  window.addEventListener('keydown',key);document.addEventListener('fullscreenchange',fullscreen)
  return()=>{
   mounted.current=false;clearTimeout(timer)
   if(root)root.inert=wasInert??false
   document.body.style.overflow=overflow
   window.removeEventListener('keydown',key);document.removeEventListener('fullscreenchange',fullscreen)
   queueMicrotask(()=>{
    if(mounted.current)return
    if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{})
    try{screen.orientation?.unlock?.()}catch{/* Optional browser API. */}
   })
  }
 },[])
 const weapon=state.weapons.find(item=>item.id===state.weaponId)!,armor=state.armor.find(item=>item.id===state.armorId)!
 function chooseDoor(index:number){setState(previous=>({...previous,door:index}));setMessage(doors[index].detail)}
 return createPortal(<section className="exploration-game" aria-label="파라오 지하 탐험">
  <GameLeaveGuard active practice description="탐험 진행과 연습 물품은 저장되지 않아요. 저장하지 않고 나가시겠습니까?"/>
  <header className="exploration-game-header"><div><span className="exploration-eyebrow">파라오의 황금해</span><span className="exploration-mode">연습</span></div><h1><ArrowDown size={15}/> 지하 1층 <span>지하실 입구</span></h1><div className="exploration-game-actions"><button onClick={()=>setBag(true)} aria-label="탐험 보관함"><Backpack size={17}/><span>보관함</span></button><button onClick={()=>setLeave(true)} aria-label="탐험 나가기"><LogOut size={17}/><span>나가기</span></button></div></header>
  <div className="exploration-game-body">
   <aside className="exploration-player" aria-label="탐험가 상태"><div className="exploration-identity"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-10"/><div><strong>{nickname}</strong><span>지하를 걷는 이</span></div></div><div className="exploration-hp"><div><span><Heart size={12}/> 체력</span><strong>{state.hp}<small> / 100</small></strong></div><progress aria-label="탐험가 체력" max={100} value={state.hp}/></div>
    <div className="exploration-loadout"><span className="exploration-section-label">현재 장비</span><div><Swords size={15}/><p><strong>{weapon.name}</strong><small>{gearStats(weapon)}</small></p></div><div><Shield size={15}/><p><strong>{armor.name}</strong><small>{gearStats(armor)}</small></p></div></div>
    <div className="exploration-spells"><span className="exploration-section-label">마법 <small>{state.equippedSpells.length} / 3</small></span>{state.equippedSpells.length?state.equippedSpells.map(id=>{const spell=state.spells.find(value=>value.id===id)!;return <button key={id} onClick={()=>setMessage(spell.message)} aria-label={`${spell.name} 사용`}><Sparkles size={12}/>{spell.name}</button>}):<p>장착한 마법이 없어요.<br/>보관함에서 준비할 수 있어요.</p>}</div>
   </aside>
   <main className="exploration-room"><div className="exploration-room-heading"><span className="exploration-eyebrow">THE FIRST DESCENT</span><h2>세 개의 문, 하나의 선택.</h2><p>젖은 돌계단을 내려오자, 오래된 모래 냄새가 스칩니다.</p></div>
    <div className="exploration-doors" role="group" aria-label="지하 1층의 세 문">{doors.map((door,index)=><button key={door.name} className="exploration-door" aria-pressed={state.door===index} onClick={()=>chooseDoor(index)}><span className="exploration-door-number">0{index+1}</span><span className="exploration-door-arch" aria-hidden="true"><span>{door.rune}</span><DoorClosed size={24}/></span><strong>{door.name}</strong><small>{door.hint}</small><span className="exploration-door-select">{state.door===index?<><Check size={12}/> 선택한 문</>:'살펴보기'}</span></button>)}</div>
    <div className="exploration-story" role="status" aria-live="polite"><Flame size={14}/><p>{message}</p></div><p className="exploration-room-note">문 안쪽과 지하 2층은 준비 중이에요.</p>
   </main>
  </div>
  <footer className="exploration-game-footer"><span>지하 1층 · 문 안쪽 준비 중</span><span>저장되지 않는 연습 탐험</span></footer>
  {descending&&<div className="exploration-descent" role="status" aria-label="지하 1층으로 내려가는 중"><div className="exploration-stairwell" aria-hidden="true">{[0,1,2,3,4,5,6].map(i=><i key={i} style={{'--step':i} as React.CSSProperties}/>)}</div><span>파라오의 황금해</span><h2>지하 1층</h2><p>계단을 따라, 더 깊은 곳으로.</p></div>}
  <div className="exploration-rotate" role="status"><Smartphone size={28}/><p>휴대폰을 가로로 돌려주세요.</p><small>지하 탐험은 가로 화면에 맞춰져 있어요.</small></div>
  <PracticeInventory open={bag} onOpenChange={setBag} state={state} onChange={setState}/>
  <ConfirmDialog compact open={leave} onOpenChange={setLeave} title="저장하지 않고 나가시겠습니까?" description="현재 탐험과 연습 물품이 사라져요. 다시 입장하면 지하실 입구부터 시작해요." confirmLabel="저장하지 않고 나가기" cancelLabel="계속 탐험" onConfirm={onLeave}/>
 </section>,document.body)
}

function PracticeInventory({open,onOpenChange,state,onChange}:{open:boolean;onOpenChange:(open:boolean)=>void;state:PracticeState;onChange:React.Dispatch<React.SetStateAction<PracticeState>>}){
 const [tab,setTab]=useState<'weapon'|'armor'|'magic'>('weapon'),[notice,setNotice]=useState('')
 const items=tab==='weapon'?state.weapons:state.armor
 function spell(id:string){
  if(!state.equippedSpells.includes(id)&&state.equippedSpells.length===3){setNotice('마법은 최대 3개까지 장착할 수 있어요. 먼저 하나를 해제해주세요.');return}
  setNotice('');onChange(previous=>toggleSpell(previous,id))
 }
 return <Dialog open={open} onOpenChange={value=>{setNotice('');onOpenChange(value)}}><DialogContent className="exploration-inventory"><DialogHeader><DialogTitle>탐험 보관함</DialogTitle><DialogDescription>무기·보호구는 각각 3개 보관하고 하나를 사용해요. 마법은 최대 3개를 동시에 사용해요.</DialogDescription></DialogHeader>
  <div className="exploration-inventory-tabs" role="tablist" aria-label="탐험 장비 종류">{([{id:'weapon',name:'무기',Icon:Swords,count:state.weapons.length},{id:'armor',name:'보호구',Icon:Shield,count:state.armor.length},{id:'magic',name:'마법',Icon:Sparkles,count:state.equippedSpells.length}] as const).map(item=><button role="tab" aria-selected={tab===item.id} aria-controls="exploration-bag-items" id={`exploration-tab-${item.id}`} key={item.id} onClick={()=>{setTab(item.id);setNotice('')}}><item.Icon size={15}/>{item.name}<span>{item.count} / 3</span></button>)}</div>
  <div id="exploration-bag-items" role="tabpanel" aria-labelledby={`exploration-tab-${tab}`} className="exploration-inventory-items">{tab==='magic'?state.spells.length?state.spells.map(item=><article key={item.id}><Sparkles size={20}/><h3>{item.name}</h3><p>{item.description}</p><button aria-pressed={state.equippedSpells.includes(item.id)} onClick={()=>spell(item.id)}>{state.equippedSpells.includes(item.id)?'마법 해제':'마법 장착'}</button></article>):<p className="exploration-empty">아직 발견한 마법이 없어요.</p>:<>{items.map(item=><article key={item.id}>{tab==='weapon'?<Swords size={20}/>:<Shield size={20}/>}<h3>{item.name}</h3><p>{gearStats(item)}</p><small>{item.description}</small><button aria-pressed={(tab==='weapon'?state.weaponId:state.armorId)===item.id} onClick={()=>onChange(previous=>equipGear(previous,tab,item.id))}>{(tab==='weapon'?state.weaponId:state.armorId)===item.id?'사용 중':tab==='weapon'?'주 무기로 선택':'주 보호구로 선택'}</button></article>)}{Array.from({length:3-items.length},(_,i)=><div className="exploration-empty-slot" key={i}>빈 보관 칸</div>)}</>}</div>
  {notice&&<p role="alert" className="exploration-inventory-notice">{notice}</p>}<div className="exploration-inventory-footer"><span>이번 탐험에서만 사용하는 연습 물품이에요.</span><button disabled={state.supplies} onClick={()=>onChange(grantPracticeSupplies)}>{state.supplies?'연습 물품 지급 완료':'연습 물품 받기'}</button></div>
 </DialogContent></Dialog>
}
