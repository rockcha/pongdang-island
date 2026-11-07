import {FarmGold} from './farm-gold'
import {isFarmShopKind} from './building-rules'
import {isRetiredTradeBuilding} from './market-catalog'
import {FarmCategoryIcon} from './category-icon'
import {FarmTerrainBadge} from './terrain-badge'
import {useState,useEffect,useRef} from 'react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {TopviewArt} from './topview-art'
import {farmCanPurchase,farmOwnedCount} from './farm-simulation'
import {FarmShopItemPurchase} from './shop-item-purchase'
import {FarmBuildingProducts} from './building-products'
import {Info} from 'lucide-react'
import {ShopCategoryIcon} from './shop-category-icon'
import {buildingShopCategories,decorationShopCategories,farmShopCategory,type ShopCategory} from './shop-categories'
import {BuildingInfo} from './building-info'
import {farmBuildingSubtitle} from './building-subtitle'
import './facility-dialog.css'
import {TileShopPanel} from './tile-shop-panel'
import type {FarmTile} from './tile-catalog'
import {topviewItems,farmPlacementTerrain,type FarmTool,type TopviewState} from './topview-model'

export type FarmShopTab='건물'|'꾸미기'|'타일'
export function FarmShop({state,initialTab='건물',focusKind,onClose,onBuy,onBuyTiles}:{state:TopviewState;focusKind?:FarmTool|null;initialTab?:FarmShopTab;onClose:()=>void;onBuy:(kind:FarmTool,quantity:number)=>string|Promise<string>;onBuyTiles:(quantity:number,tile:FarmTile)=>string|Promise<string>}){
 const focusRef=useRef<HTMLElement|null>(null)
 useEffect(()=>{focusRef.current?.scrollIntoView?.({block:'center'})},[focusKind])
 const [tab,setTab]=useState<FarmShopTab>(initialTab),[feedback,setFeedback]=useState(''),[infoKind,setInfoKind]=useState<FarmTool|null>(null)
 const [categories,setCategories]=useState<Record<'건물'|'꾸미기',ShopCategory>>({'건물':'전체','꾸미기':'전체'})
 function showFeedback(result:string|Promise<string>){if(typeof result==='string')setFeedback(result);else void result.then(setFeedback).catch(()=>setFeedback('구매 결과를 확인해주세요.'))}
 useEffect(()=>{if(focusKind)setCategories({'건물':'전체','꾸미기':'전체'})},[focusKind])
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className={`farm-sim-dialog farm-shop ${tab==='타일'?'farm-shop-tiles':''}`}><DialogHeader><DialogTitle>상점</DialogTitle><DialogDescription>구매한 물건은 보관함에, 타일은 타일 메뉴에 보관돼요.</DialogDescription></DialogHeader>
  <nav className="farm-shop-tabs" aria-label="상점 분류">{(['건물','꾸미기','타일'] as const).map(category=><button key={category} aria-pressed={tab===category} onClick={()=>{setTab(category);setFeedback('')}}><FarmCategoryIcon kind={category==='건물'?'building':category==='꾸미기'?'decoration':'tile'}/><span>{category==='꾸미기'?'장식':category}</span></button>)}</nav>
  {tab!=='타일'&&<div className="farm-shop-filters"><nav aria-label={`${tab==='건물'?'건물':'장식물'} 카테고리`}>{(tab==='건물'?buildingShopCategories:decorationShopCategories).map(category=><button key={category} aria-label={category} title={category} aria-pressed={categories[tab]===category} onClick={()=>{setCategories(previous=>({...previous,[tab]:category}));setFeedback('')}}><ShopCategoryIcon category={category}/></button>)}</nav><span>낮은 가격순</span></div>}
  <div className="farm-shop-body">{tab==='타일'?<TileShopPanel state={state} onBuy={(quantity,tile)=>showFeedback(onBuyTiles(quantity,tile))}/>:<div className="farm-shop-grid">{(Object.entries(topviewItems) as [FarmTool,typeof topviewItems[FarmTool]][]).filter(([kind,item])=>kind!=='plot'&&!isRetiredTradeBuilding(kind)&&isFarmShopKind(kind)&&item.group===tab&&(categories[tab]==='전체'||farmShopCategory(kind,tab)===categories[tab])).sort((a,b)=>a[1].price-b[1].price||a[1].name.localeCompare(b[1].name,'ko')).map(([kind,item])=>{
   const owned=!farmCanPurchase(state,kind)
   return <article ref={kind===focusKind?focusRef:undefined} data-highlighted={kind===focusKind||undefined} key={kind} className="farm-shop-card" aria-label={item.name} data-owned={owned}>
    {item.group==='건물'&&<span className="farm-shop-owned-count" aria-label={`${item.name} 보유 ${farmOwnedCount(state,kind)}개`} title="배치한 건물과 보관함의 건물을 합한 수량">보유 {farmOwnedCount(state,kind)}</span>}
    {item.group==='건물'&&<button className="farm-shop-info-button" aria-label={`${item.name} 설명`} onClick={()=>setInfoKind(kind)}><Info size={18}/></button>}
    <span className="farm-item-art"><TopviewArt kind={kind} compact/>{item.group==='꾸미기'&&<FarmTerrainBadge terrain={farmPlacementTerrain(kind)}/>}</span><strong>{item.name}</strong>
    {item.group==='꾸미기'&&<small className="farm-decoration-meta">{item.w}×{item.h}</small>}
    {item.group==='건물'&&<FarmBuildingProducts kind={kind}/>}
    <FarmShopItemPurchase kind={kind} state={state} onBuy={(kind,quantity)=>showFeedback(onBuy(kind,quantity))}/>
   </article>
  })}</div>}</div>
  <footer className="farm-shop-footer"><span>보유 골드</span><strong><FarmGold amount={state.gold.toLocaleString()}/></strong></footer>
  {feedback&&<p className="farm-shop-feedback" role="status">{feedback}</p>}
  {infoKind&&<Dialog open onOpenChange={open=>{if(!open)setInfoKind(null)}}><DialogContent className="farm-sim-dialog farm-compact-dialog farm-facility-dialog farm-shop-info"><DialogHeader className="farm-compact-header"><DialogTitle>{topviewItems[infoKind].name} 설명</DialogTitle><DialogDescription className="farm-building-subtitle">{farmBuildingSubtitle(infoKind)}</DialogDescription></DialogHeader><div className="farm-sim-body"><BuildingInfo object={{id:-1,kind:infoKind,x:0,y:0,level:1}} state={state}/></div></DialogContent></Dialog>}
 </DialogContent></Dialog>
}
