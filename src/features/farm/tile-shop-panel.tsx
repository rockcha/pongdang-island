import {FarmGold} from './farm-gold'
import {useState} from 'react'
import {Check} from 'lucide-react'
import {farmTiles,tileCount,type FarmTile} from './tile-catalog'
import {FarmTileArt} from './tile-controls'
import type {TopviewState} from './topview-model'
import './tile-shop-panel.css'

export function TileShopPanel({state,onBuy}:{state:TopviewState;onBuy:(quantity:number,tile:FarmTile)=>void}){
 const [selected,setSelected]=useState<FarmTile>('dirt'),[quantity,setQuantity]=useState(5)
 const product=farmTiles.find(tile=>tile.id===selected)!,max=Math.min(1000,Math.floor(state.gold/product.price)),amount=max?Math.min(quantity,max):1
 return <section className="farm-tile-catalog" aria-label="타일 구매">
  <div className="farm-tile-catalog-grid">{[...farmTiles].sort((a,b)=>a.price-b.price).map(tile=><button key={tile.id} aria-label={`${tile.name} 선택`} aria-pressed={tile.id===selected} onClick={()=>setSelected(tile.id)}>
   <span className="farm-tile-check">{tile.id===selected&&<Check size={13}/>}</span><FarmTileArt tile={tile.id}/><strong>{tile.name}</strong><span><FarmGold amount={tile.price}/> <small>/ 개</small></span><small>보유 {tileCount(state,tile.id).toLocaleString()}개</small>
  </button>)}</div>
  <footer className="farm-tile-checkout"><div className="farm-tile-order-title"><span className="farm-tile-selected-art" role="img" aria-label={`선택한 타일: ${product.name}`}><FarmTileArt tile={selected}/></span><strong>{product.name}</strong><span>개당 <FarmGold amount={product.price}/></span></div>
   <div className="farm-tile-order-quantity"><span>구매 수량</span><div><button aria-label="타일 수량 줄이기" disabled={!max||amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><input aria-label={product.name+' 구매 수량'} type="number" inputMode="numeric" min={1} max={Math.max(1,max)} value={amount} disabled={!max} onChange={e=>setQuantity(Math.max(1,Math.min(max,Math.floor(Number(e.target.value)||1))))}/><button aria-label="타일 수량 늘리기" disabled={!max||amount>=max} onClick={()=>setQuantity(amount+1)}>+</button></div></div>
   <button className="farm-shop-buy" disabled={!max} onClick={()=>onBuy(amount,selected)}>{max?<>{product.name} {amount}개 구매 · <FarmGold amount={amount*product.price}/></>:'골드가 부족해요'}</button>
  </footer>
 </section>
}
