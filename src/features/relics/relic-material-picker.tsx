import {Check,ChevronDown,LockKeyhole} from 'lucide-react'
import {useId,useState,type CSSProperties} from 'react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {rarities,type Rarity} from '@/lib/game/rarity'
import {relicQuantity,type Relic} from './api'
import {RelicArtwork} from './relic-artwork'

export function RelicMaterialPicker({open,slot,relics,equippedId,selectedId,other,onSelect,onOpenChange}:{open:boolean;slot:0|1;relics:Relic[];equippedId:string|null;selectedId:string;other?:Relic;onSelect:(relic:Relic)=>void;onOpenChange:(open:boolean)=>void}){
 const [grade,setGrade]=useState<'all'|Rarity>('all'),selectId=useId()
 const owned=relics.filter(r=>relicQuantity(r)>0).toSorted((a,b)=>rarities[b.rarity].rank-rarities[a.rarity].rank||a.name.localeCompare(b.name,'ko'))
 const items=owned.filter(r=>grade==='all'||r.rarity===grade)
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="relic-picker-dialog flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-2xl sm:max-w-md">
  <DialogHeader className="shrink-0 pr-7"><DialogTitle>{slot===0?'기본 유물 선택':'결합할 유물 선택'}</DialogTitle><DialogDescription>장착 중인 유물도 여분이 있으면 선택할 수 있어요.</DialogDescription></DialogHeader>
  <div className="relic-picker-filter"><label htmlFor={selectId}>유물 등급</label><div><select id={selectId} value={grade} onChange={event=>setGrade(event.target.value as 'all'|Rarity)}><option value="all">전체 등급 · {owned.length}종</option>{(['rare','epic','mythic'] as const).map(value=><option key={value} value={value}>{rarities[value].label} · {owned.filter(r=>r.rarity===value).length}종</option>)}</select><ChevronDown size={14} aria-hidden="true"/></div></div>
  <div className="relic-picker-scroll"><div className="relic-material-grid" role="group" aria-label="세공 재료 선택">
   {items.map(r=>{
    const equipped=r.id===equippedId,selected=r.id===selectedId,sameEffect=!r.crafted&&other?.effect_kind===r.effect_kind
    const spare=Math.max(0,relicQuantity(r)-(equipped?1:0)),lastEquipped=equipped&&spare===0
    const unavailable=r.crafted||lastEquipped||!!sameEffect
    return <button key={r.id} type="button" className="relic-material-card" data-rarity={r.rarity} style={{'--material-color':rarities[r.rarity].effectColor} as CSSProperties} aria-label={`${r.name} · ${rarities[r.rarity].label} · ${relicQuantity(r)}개${r.crafted?' · 합성 유물, 재세공 불가':lastEquipped?' · 장착 중, 해제 필요':sameEffect?' · 같은 계열, 선택 불가':equipped?` · 장착 1개, 사용 가능 ${spare}개`:''}`} aria-pressed={selected} disabled={unavailable} onClick={()=>{setGrade('all');onSelect(r)}}>
     <span className="relic-material-art"><RelicArtwork relic={r} className="size-12"/>{selected&&<span className="relic-material-check"><Check size={10}/></span>}</span>
     <strong>{r.name}</strong><span className="relic-material-meta"><span>{rarities[r.rarity].label}</span><span>× {relicQuantity(r)}</span></span>
     {r.crafted?<span className="relic-material-lock">재세공 불가</span>:lastEquipped?<span className="relic-material-lock"><LockKeyhole size={9}/> 해제 필요</span>:sameEffect?<span className="relic-material-lock">같은 계열 · 선택 불가</span>:equipped?<span className="relic-material-lock">장착 1 · 여분 {spare}</span>:selected?<span className="relic-material-lock">선택한 유물</span>:null}
    </button>
   })}
  </div>{!items.length&&<p className="relic-craft-empty">{owned.length?'이 등급의 보유 유물이 없어요.':'아직 보유한 유물이 없어요. 먼저 바다에서 유물을 발견해 보세요.'}</p>}</div>
  <p className="relic-picker-note">동일한 계열의 유물은 결합할 수 없어요.</p>
 </DialogContent></Dialog>
}
