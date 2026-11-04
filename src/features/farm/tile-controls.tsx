import {Check,Grid2X2,ShoppingBag,Undo2} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {FarmCountBadge} from './count-badge'
import {dirtTile} from './farm-stock'
import type {LandTool} from './land-tools'

export function DirtTileArt(){
 return <svg viewBox="0 0 64 64" aria-hidden="true" className="farm-tile-art"><rect x="5" y="5" width="54" height="54" rx="9" fill="#d6bc87" stroke="#b99d6c" strokeWidth="2"/><path d="M15 20h5m18 25h4m2-30h5M16 42h3m12-11h5" stroke="#b29662" strokeWidth="2.5" strokeLinecap="round"/></svg>
}
export function FarmTileMenu({tool,count,onPick,onRecover,onBuy,onDone}:{tool:LandTool|null;count:number;onPick:()=>void;onRecover:()=>void;onBuy:()=>void;onDone:()=>void}){
 return <section id="farm-tile-menu" className="farm-tool-menu" aria-label="타일 메뉴">
  <button aria-label="타일 깔기" aria-pressed={tool==='place'} onClick={onPick}><Grid2X2 size={17}/><span>타일 깔기</span><FarmCountBadge count={count} label="보유 타일"/></button>
  <button aria-pressed={tool==='recover'} onClick={onRecover}><Undo2 size={17}/><span>회수하기</span></button>
  <button onClick={onBuy}><ShoppingBag size={17}/><span>구매하기</span></button>
  <button className="farm-tool-done" onClick={onDone}><Check size={16}/><span>완료</span></button>
 </section>
}
export function FarmTilePicker({count,onClose,onSelect,onBuy}:{count:number;onClose:()=>void;onSelect:()=>void;onBuy:()=>void}){
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-sim-dialog"><DialogHeader><DialogTitle>타일 선택</DialogTitle><DialogDescription>깔 타일을 고른 뒤 땅 위를 드래그해주세요.</DialogDescription></DialogHeader>
  <button className="farm-tile-choice" aria-label={`흙길 ${count}개 선택`} disabled={!count} onClick={onSelect}><DirtTileArt/><span><strong>{dirtTile.name}</strong><small>보유 {count.toLocaleString()}개</small></span></button>
  <button className="farm-seed-shop-button" onClick={onBuy}><ShoppingBag size={18}/>타일 구매하기</button>
 </DialogContent></Dialog>
}
