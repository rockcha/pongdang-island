import {Grid2X2,ShoppingBag,Undo2} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {FarmCountBadge} from './count-badge'
import {dirtTile} from './farm-stock'
import type {LandTool} from './land-tools'
import {FarmToolPanel} from './farm-tool-panel'
import {FarmDirtTexture} from './dirt-art'

export function DirtTileArt(){
 return <svg viewBox="0 0 64 64" aria-hidden="true" className="farm-tile-art"><rect x="4" y="6" width="56" height="55" rx="8" fill="#8e7a60"/><svg x="5" y="5" width="54" height="54" viewBox="0 0 120 120"><FarmDirtTexture/></svg><rect x="5" y="5" width="54" height="54" rx="1" fill="none" stroke="#a58f70" strokeWidth="1.2"/><path d="M7 6h50" stroke="#dfd1b6" strokeWidth="1" strokeLinecap="round" opacity=".6"/></svg>
}
export function FarmTileMenu({tool,count,onPick,onRecover,onBuy,onDone}:{tool:LandTool|null;count:number;onPick:()=>void;onRecover:()=>void;onBuy:()=>void;onDone:()=>void}){
 return <FarmToolPanel id="farm-tile-menu" label="타일 메뉴" title="타일 관리" description={tool==='place'?'빈 땅을 누르거나 드래그해 선택한 타일을 깔아요.':tool==='recover'?'길 위를 누르거나 드래그해 타일을 회수해요.':'타일을 골라 길을 만들거나 깔아 둔 타일을 회수해요.'} onDone={onDone}>
  <button aria-label="타일 깔기" aria-pressed={tool==='place'} onClick={onPick}><Grid2X2 size={17}/><span>타일 깔기</span><FarmCountBadge count={count} label="보유 타일"/></button>
  <button aria-pressed={tool==='recover'} onClick={onRecover}><Undo2 size={17}/><span>회수하기</span></button>
  <button onClick={onBuy}><ShoppingBag size={17}/><span>구매하기</span></button>
 </FarmToolPanel>
}
export function FarmTilePicker({count,onClose,onSelect,onBuy}:{count:number;onClose:()=>void;onSelect:()=>void;onBuy:()=>void}){
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-sim-dialog"><DialogHeader><DialogTitle>타일 선택</DialogTitle><DialogDescription>깔 타일을 고른 뒤 땅 위를 드래그해주세요.</DialogDescription></DialogHeader>
  <button className="farm-tile-choice" aria-label={`흙길 ${count}개 선택`} disabled={!count} onClick={onSelect}><DirtTileArt/><span><strong>{dirtTile.name}</strong><small>보유 {count.toLocaleString()}개</small></span></button>
  <button className="farm-seed-shop-button" onClick={onBuy}><ShoppingBag size={18}/>타일 구매하기</button>
 </DialogContent></Dialog>
}
