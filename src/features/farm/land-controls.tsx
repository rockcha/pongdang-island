import {useEffect,useState} from 'react'
import {LandPlot,Minus,Plus,Undo2} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {TEST_LAND_PRICE} from './topview-model'
import type {LandTool,LandStrokeResult} from './land-tools'

export function LandBadge({count}:{count:number}){
 return <span className="farm-land-icon"><LandPlot size={20}/><span key={count} className="farm-land-badge" data-land-stock={count} aria-hidden="true">{count.toLocaleString()}</span></span>
}
export function LandToolPanel({tool,stock,preview,onTool,onBuy}:{tool:LandTool;stock:number;preview:LandStrokeResult|null;onTool:(tool:LandTool)=>void;onBuy:()=>void}){
 return <section className="farm-land-panel" aria-label="땅 도구">
  <header><LandPlot size={18}/><div><strong>땅 가꾸기</strong><span>여분 {stock.toLocaleString()}칸</span></div><button onClick={onBuy}>땅 구매</button></header>
  <div className="farm-land-switch"><button aria-pressed={tool==='place'} onClick={()=>onTool('place')}><Plus size={14}/>땅 놓기</button><button aria-pressed={tool==='recover'} onClick={()=>onTool('recover')}><Undo2 size={14}/>땅 회수</button></div>
  {preview?<p className="farm-land-preview-summary">{preview.changed.length}칸 {tool==='place'?'놓기':'회수'} · 여분 {preview.state.landStock.toLocaleString()}칸{preview.blocked.length>0&&<span> · 건너뜀 {preview.blocked.length}칸</span>}</p>:<p>누르거나 드래그해 선택하고, 손을 떼면 적용돼요.<small>두 손가락으로 이동·확대·축소할 수 있어요.</small></p>}
 </section>
}
export function LandPurchaseDialog({open,gold,onOpenChange,onBuy}:{open:boolean;gold:number;onOpenChange:(open:boolean)=>void;onBuy:(quantity:number)=>boolean}){
 const [quantity,setQuantity]=useState('5'),[error,setError]=useState('')
 useEffect(()=>{if(open){setQuantity(String(Math.max(1,Math.min(5,Math.floor(gold/TEST_LAND_PRICE)))));setError('')}},[open])
 const count=Number(quantity),valid=/^\d+$/.test(quantity)&&Number.isSafeInteger(count)&&count>=1&&count<=1000,total=count*TEST_LAND_PRICE,affordable=Math.min(1000,Math.floor(gold/TEST_LAND_PRICE))
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="farm-sim-dialog farm-land-purchase"><DialogHeader><span className="farm-land-purchase-symbol"><LandPlot size={32} strokeWidth={1.4}/></span><DialogTitle>땅 구매</DialogTitle><DialogDescription>미리 구매해 두고, 원하는 곳에 한 칸씩 놓아요.</DialogDescription></DialogHeader>
  <div className="farm-land-price"><span>땅 1칸</span><strong>{TEST_LAND_PRICE} G</strong></div>
  <label htmlFor="farm-land-quantity">구매 수량</label><div className="farm-land-stepper"><button aria-label="땅 수량 줄이기" disabled={!valid||count<=1} onClick={()=>setQuantity(String(count-1))}><Minus size={17}/></button><div><input id="farm-land-quantity" aria-label="땅 구매 수량" type="text" inputMode="numeric" value={quantity} aria-invalid={!valid||total>gold} onChange={event=>{if(/^\d*$/.test(event.target.value)){setQuantity(event.target.value);setError('')}}}/><span>칸</span></div><button aria-label="땅 수량 늘리기" disabled={!valid||count>=affordable} onClick={()=>setQuantity(String(count+1))}><Plus size={17}/></button></div>
  <div className="farm-land-presets">{[1,5,10].map(amount=><button key={amount} aria-pressed={count===amount} disabled={amount>affordable} onClick={()=>{setQuantity(String(amount));setError('')}}>{amount}칸</button>)}</div>
  <div className="farm-land-purchase-total"><p><span>총 구매 금액</span><strong>{valid?total.toLocaleString():'—'} G</strong></p><p><span>체험 골드</span><span>{gold.toLocaleString()} G</span></p></div>
  <p className="farm-sim-caption">구매한 땅은 여분으로 보관돼요.<br/>놓거나 회수할 때는 골드가 들지 않아요.</p>
  {(error||valid&&total>gold)&&<p className="farm-land-error" role="alert">{error||'체험 골드가 부족해요.'}</p>}
  <button className="farm-sim-primary" disabled={!valid||total>gold} onClick={()=>{if(onBuy(count))onOpenChange(false);else setError('수량과 남은 골드를 다시 확인해주세요.')}}>{valid?`${count.toLocaleString()}칸 구매 · ${total.toLocaleString()} G`:'1~1,000칸을 입력해주세요'}</button>
 </DialogContent></Dialog>
}
