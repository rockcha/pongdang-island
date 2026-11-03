import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {Link} from 'react-router'
import {ArrowLeft,Check,ChevronDown,Coins,Grid2X2,Hand,LandPlot,Package,Plus,Minus,RotateCcw,X,Pencil,Undo2} from 'lucide-react'
import {FarmObjectMenu} from './object-menu'
import {TopviewArt} from './topview-art'
import {FarmProductionDialog} from './production-dialog'
import {farmLimits,farmPlacementError,simulateFarm,type FarmSimAction} from './farm-simulation'
import {adjacentLand,buyTestLand,cellKey,coastline,initialTopview,MAP_H,MAP_W,objectAt,objectArtHeight,placementValid,TEST_LAND_PRICE,TILE,topviewItems,type FarmTool,type TopviewState} from './topview-model'
import './topview-farm.css'

type Mode='look'|'land'|'move'|'path'|FarmTool
const seaMargin=TILE*2
export function TopviewFarm(){
 const [state,setState]=useState(initialTopview),[mode,setMode]=useState<Mode>('look'),[group,setGroup]=useState<'건물'|'동물'|'꾸미기'|'보관함'|null>(null)
 const [editing,setEditing]=useState(false),[history,setHistory]=useState<TopviewState[]>([])
 const [productionId,setProductionId]=useState<number|null>(null),[productionMessage,setProductionMessage]=useState(''),[clock,setClock]=useState(Date.now)
 const svgRef=useRef<SVGSVGElement>(null)
 const [moveTarget,setMoveTarget]=useState<{x:number;y:number}|null>(null),[notice,setNotice]=useState<{name:string}|null>(null)
 const [lastAdded,setLastAdded]=useState<string|null>(null)
 const [selected,setSelected]=useState<number|null>(null),[hover,setHover]=useState<{x:number;y:number}|null>(null)
 const [zoom,setZoom]=useState(()=>window.innerWidth<600?.52:1),[grid,setGrid]=useState(false),[message,setMessage]=useState('땅을 넓히고, 나만의 농장을 배치해 보세요.'),[help,setHelp]=useState(false)
 const viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number;moved:boolean}|null>(null)
 const limits=farmLimits(state),productionObject=state.objects.find(o=>o.id===productionId)
 const running=[state.simulation.millJob?.readyAt,...Object.values(state.simulation.cropJobs).map(j=>j.readyAt),...Object.values(state.simulation.animalJobs)].some(t=>t&&t>clock)
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[running])
 function act(action:FarmSimAction){
  if(!productionObject)return
  const result=simulateFarm(state,productionObject.id,action,Date.now())
  setProductionMessage(result.message)
  if(result.state!==state){setState(result.state);setHistory([]);setClock(Date.now())}
  if(result.place){setProductionId(null);setEditing(true);setGrid(true);choose(result.place);setGroup('보관함');setMessage(result.message)}
 }
 useLayoutEffect(()=>{const el=viewport.current;if(el){el.scrollLeft=Math.max(0,((MAP_W*TILE+seaMargin*2)*(window.innerWidth<600?.52:1)-el.clientWidth)/2);el.scrollTop=window.innerWidth<600?0:90}},[])
 const tool=mode in topviewItems?mode as FarmTool:null,moving=state.objects.find(o=>o.id===selected)
 const previewKind=tool??(mode==='move'?moving?.kind:undefined)
 const previewCell=mode==='move'?moveTarget:hover
 const valid=!!previewKind&&!!previewCell&&placementValid(state,previewKind,previewCell.x,previewCell.y,mode==='move'?selected??undefined:undefined)
 function commit(next:TopviewState){if(next===state)return;setNotice(null);setHistory(old=>[...old.slice(-29),state]);setState(next)}
 function toggleEditing(){const next=!editing;setEditing(next);setMoveTarget(null);setNotice(null);setMode('look');setGroup(null);setSelected(null);setHover(null);setGrid(next);setLastAdded(null);setHistory([]);setMessage('도구를 골라 나만의 섬을 꾸며보세요.')}
 useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(null),4500);return()=>window.clearTimeout(timer)},[notice])
 function cancelMove(){setMode('look');setMoveTarget(null);setHover(null)}
 function undo(){const previous=history.at(-1);if(!previous)return;setState(previous);setHistory(old=>old.slice(0,-1));setLastAdded(null);setSelected(null);setHover(null);setMoveTarget(null);setNotice(null);setMode('look');setMessage('마지막 편집을 되돌렸어요.')}
 function recover(){
  if(!moving)return
  if(state.simulation.cropJobs[moving.id]||state.simulation.animalJobs[moving.id]||(moving.kind==='mill'&&state.simulation.millJob)){setMessage('생산물을 먼저 수령한 뒤 회수해주세요.');return}
  const after={...state,objects:state.objects.filter(o=>o.id!==moving.id)},nextLimits=farmLimits(after)
  if(nextLimits.usedPlots>nextLimits.plots||nextLimits.usedAnimals>nextLimits.animals){setMessage('관리소를 회수하기 전에 초과한 텃밭이나 동물을 먼저 회수해주세요.');return}
  commit({...state,objects:state.objects.filter(o=>o.id!==moving.id),stored:[...state.stored,moving.kind]})
  setNotice({name:topviewItems[moving.kind].name});setSelected(null);setMode('look');setMessage('보관함에서 다시 꺼내 배치할 수 있어요.')
 }
 function confirmMove(){
  if(!moving||!moveTarget||!valid)return
  if(moving.x!==moveTarget.x||moving.y!==moveTarget.y)commit({...state,objects:state.objects.map(o=>o.id===moving.id?{...o,...moveTarget}:o)})
  cancelMove();setSelected(null);setMessage('배치를 옮겼어요.')
 }
 function choose(next:Mode){setMoveTarget(null);setNotice(null);setMode(next);setSelected(null);setHover(null);setMessage(next==='land'?`섬 옆 바다의 + 칸을 누르면 ${TEST_LAND_PRICE} 테스트 골드로 확장돼요.`:next==='path'?'빈 땅을 눌러 흙길을 놓거나 지워보세요.':'원하는 위치를 눌러 배치해 보세요.')}
 function cellClick(x:number,y:number){
  if(drag.current?.moved)return
  if(!editing){const found=objectAt(state,x,y);if(found){setSelected(found.id);setMessage(topviewItems[found.kind].name);if(topviewItems[found.kind].group==='건물'||['plot','cow','chicken'].includes(found.kind)){setProductionMessage('');setProductionId(found.id)}}return}
  const found=objectAt(state,x,y)
  if(mode==='move'){setMoveTarget({x,y});setMessage('위치를 고른 뒤 배치를 눌러주세요.');return}
  if(found){setSelected(found.id);setMode('look');setGroup(null);setHover(null);return}
  if(mode==='land'){
   const next=buyTestLand(state,x,y)
   if(next!==state){setLastAdded(cellKey(x,y));commit(next);setMessage('땅을 넓혔어요. 이어서 옆 칸도 구매할 수 있어요.')}
   else setMessage(state.gold<TEST_LAND_PRICE?'테스트 골드가 부족해요.':'기존 땅과 맞닿은 + 칸을 골라주세요.')
   return
  }
  if(mode==='path'&&state.land.includes(cellKey(x,y))&&!found){const key=cellKey(x,y);commit({...state,paths:state.paths.includes(key)?state.paths.filter(p=>p!==key):[...state.paths,key]});return}
  if(tool){
   const placementError=farmPlacementError(state,tool)
   if(placementError){setMessage(placementError);return}
   if(['cow','chicken'].includes(tool)&&!state.stored.includes(tool)){setMessage('닭장이나 외양간에서 동물을 먼저 구매해주세요.');return}
   const storedIndex=state.stored.indexOf(tool)
   if(group==='보관함'&&storedIndex<0){setMessage('보관함에서 배치할 개체를 선택해주세요.');return}
   if(storedIndex<0&&state.gold<topviewItems[tool].price){setMessage('테스트 골드가 부족해요.');return}
   if(!placementValid(state,tool,x,y)){setMessage('모든 바닥 칸이 땅 위에 있고, 다른 물체와 겹치지 않아야 해요.');return}
   commit({...state,gold:state.gold-(storedIndex<0?topviewItems[tool].price:0),stored:state.stored.filter((_,index)=>index!==storedIndex),objects:[...state.objects,{id:state.nextId,kind:tool,x,y}],nextId:state.nextId+1});setMessage(`${topviewItems[tool].name}을 배치했어요.`)
   if(group==='보관함'&&state.stored.filter(kind=>kind===tool).length===1){setMode('look');setHover(null)}
  }else setSelected(null)
 }
 const shore=coastline(state.land)
 const allCells=Array.from({length:MAP_W*MAP_H},(_,i)=>({x:i%MAP_W,y:Math.floor(i/MAP_W)}))
 return <section className="top-farm" aria-label="탑뷰 농장 테스트" onKeyDown={event=>{if(event.key==='Escape'){if(mode==='move')cancelMove();else setSelected(null)}}}>
  <header className="top-farm-header"><Link to="/aquarium" aria-label="농장 나가기"><ArrowLeft size={18}/></Link><div><h1>내 농장 <span>탑뷰 테스트</span></h1><p>바다 위에 가꾸는 나만의 작은 섬</p></div><button className="top-farm-gold" onClick={()=>setHelp(v=>!v)} aria-label="테스트 골드 안내"><Coins size={15}/>{state.gold.toLocaleString()}<ChevronDown size={12}/></button></header>
  {!editing&&<div className="top-farm-summary">텃밭 {limits.usedPlots}/{limits.plots} · 동물 {limits.usedAnimals}/{limits.animals}<span>🌾 {state.simulation.inventory.wheat} · 밀가루 {state.simulation.inventory.flour}</span></div>}
  {help&&<div className="top-farm-help">테스트 골드로 구도와 배치를 확인하는 화면이에요. 실제 골드·농장은 변경되지 않으며, 새로고침하면 초기 배치로 돌아와요.</div>}
  <div className="top-farm-viewport" ref={viewport} onPointerDown={e=>{
   const el=viewport.current;if(!el||e.button!==0||e.pointerType==='touch')return
   drag.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop,moved:false}
  }} onPointerMove={e=>{const d=drag.current,el=viewport.current;if(!d||!el)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>8)d.moved=true;if(d.moved){el.scrollLeft=d.left-dx;el.scrollTop=d.top-dy}}} onPointerUp={()=>{window.setTimeout(()=>{drag.current=null},0)}} onPointerLeave={()=>{drag.current=null;setHover(null)}}>
   <svg ref={svgRef} className="top-farm-map" style={{width:(MAP_W*TILE+seaMargin*2)*zoom,height:(MAP_H*TILE+seaMargin*2)*zoom}} viewBox={`${-seaMargin} ${-seaMargin} ${MAP_W*TILE+seaMargin*2} ${MAP_H*TILE+seaMargin*2}`} role="group" aria-label="사각 격자 농장 지도">
    <defs><pattern id="farm-water" width="96" height="80" patternUnits="userSpaceOnUse"><rect width="96" height="80" fill="#80b8bf"/><path className="top-farm-waves" d="M10 19q6 3 12 0m30 32q9 4 18 0M75 8h7M12 62h6" fill="none" stroke="#b9dfe0" strokeWidth="1.5" strokeLinecap="round"/></pattern><pattern id="farm-grass" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#89a663"/><path d="m8 11 2-3 2 3m17 18 2-3 2 3" fill="none" stroke="#a0b879" strokeWidth="1.5"/><path d="M17 22h2M33 8h2" stroke="#678b50" strokeWidth="2"/></pattern><pattern id="farm-path" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#d6bc87"/><path d="M7 14h3m14 16h2m4-24h2" stroke="#b99d6c" strokeWidth="1.5"/></pattern></defs>
    <rect x={-seaMargin} y={-seaMargin} width={MAP_W*TILE+seaMargin*2} height={MAP_H*TILE+seaMargin*2} fill="url(#farm-water)" onClick={()=>{if(mode==='look')setSelected(null)}}/>
    <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">{shore.map(edge=><g key={edge.id}><path d={edge.path} stroke="#98d2ca" strokeWidth="30"/><path d={edge.path} stroke="#c9d9b4" strokeWidth="20"/><path d={edge.path} stroke="#e6c995" strokeWidth="13"/></g>)}</g>
    {allCells.map(({x,y})=>{
     const key=cellKey(x,y),owned=state.land.includes(key),buyable=editing&&mode==='land'&&adjacentLand(state,x,y)
     return <g key={key} data-farm-cell={key} role={editing&&mode==='move'&&owned?'button':undefined} tabIndex={editing&&mode==='move'&&owned?0:undefined} aria-label={editing&&mode==='move'&&owned?`배치 위치 ${x},${y}`:undefined} onKeyDown={event=>{if(mode==='move'&&(event.key==='Enter'||event.key===' ')){event.preventDefault();cellClick(x,y)}}} onPointerEnter={()=>setHover({x,y})} onClick={()=>cellClick(x,y)}>
      <rect shapeRendering="crispEdges" x={x*TILE} y={y*TILE} width={TILE} height={TILE} fill={owned?(state.paths.includes(key)?'url(#farm-path)':'url(#farm-grass)'):buyable?'#b7ddd060':'transparent'} className={lastAdded===key?'top-farm-new-land':undefined} stroke={buyable?'#fff1c8':editing&&grid&&owned?'#e4ebc447':'transparent'} strokeWidth={buyable?1.5:1}/>
      {buyable&&<g role="button" tabIndex={0} aria-label={`땅 ${x},${y} 구매`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cellClick(x,y)}}}><rect x={x*TILE+1} y={y*TILE+1} width={TILE-2} height={TILE-2} fill="transparent"/><path d={`M${x*TILE+15} ${y*TILE+20}h10m-5-5v10`} stroke="#fff8d4" strokeWidth="2"/></g>}
     </g>
    })}
    <g pointerEvents="none" fill="none" strokeLinecap="round">{shore.map(edge=><g key={edge.id}><path d={edge.path} stroke="#e9d09d" strokeWidth="5"/><path d={edge.path} transform={`translate(${edge.dx*12} ${edge.dy*12})`} stroke="#e7f3df" strokeWidth="1.7" opacity=".6"/></g>)}</g>
    {state.objects.toSorted((a,b)=>(a.y+topviewItems[a.kind].h)-(b.y+topviewItems[b.kind].h)||a.x-b.x).map(o=>{
     const item=topviewItems[o.kind],animal=item.group==='동물',height=objectArtHeight(o.kind),bottom=(o.y+item.h)*TILE
     return <g key={o.id} role="button" tabIndex={0} aria-label={`${item.name} (${o.x},${o.y})`} onClick={()=>cellClick(o.x,o.y)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cellClick(o.x,o.y)}}} onPointerEnter={()=>setHover({x:o.x,y:o.y})} className={`top-farm-object ${animal?'top-farm-animal':''}`} style={{animationDelay:`${o.id*.37}s`}}>
      {selected===o.id&&<rect x={o.x*TILE+2} y={o.y*TILE+2} width={item.w*TILE-4} height={item.h*TILE-4} rx="5" fill="#f8e9ad50" stroke="#fff1b9" strokeWidth="2"/>}
      <svg x={o.x*TILE} y={bottom-height} width={item.w*TILE} height={height} overflow="visible" opacity={mode==='move'&&o.id===selected?0.3:1}><TopviewArt kind={o.kind} crop={state.simulation.cropJobs[o.id]?.crop} stage={state.simulation.cropJobs[o.id]?(state.simulation.cropJobs[o.id].readyAt<=clock?'ready':'growing'):'empty'}/></svg>
      {item.group==='건물'&&!editing&&<text x={(o.x+item.w/2)*TILE} y={bottom+9} textAnchor="middle" fill="#fff4d9" stroke="#627b50" strokeWidth="2.5" paintOrder="stroke" fontSize="12">{item.name}</text>}
     </g>
    })}
    {editing&&previewKind&&previewCell&&<g pointerEvents="none"><rect data-placement-valid={valid} x={previewCell.x*TILE+1} y={previewCell.y*TILE+1} width={topviewItems[previewKind].w*TILE-2} height={topviewItems[previewKind].h*TILE-2} rx="4" fill={valid?'#b7dc8e66':'#e2a38b66'} stroke={valid?'#69934b':'#d8755b'} strokeWidth="2" strokeDasharray="5 3"/>{mode==='move'&&<svg x={previewCell.x*TILE} y={(previewCell.y+topviewItems[previewKind].h)*TILE-objectArtHeight(previewKind)} width={topviewItems[previewKind].w*TILE} height={objectArtHeight(previewKind)} opacity=".7"><TopviewArt kind={previewKind}/></svg>}</g>}
   </svg>
  </div>
  {productionObject&&!editing&&<FarmProductionDialog key={productionObject.id} object={productionObject} state={state} message={productionMessage} onAction={act} onClose={()=>{setProductionId(null);setSelected(null)}}/>}
  {editing&&moving&&(mode==='look'||mode==='move')&&<FarmObjectMenu object={mode==='move'&&moveTarget?{...moving,...moveTarget}:moving} svgRef={svgRef} viewportRef={viewport} moving={mode==='move'} valid={valid} onMove={()=>{setMode('move');setGroup(null);setMoveTarget({x:moving.x,y:moving.y});setHover(null);setMessage('빈 땅을 누른 뒤 배치를 눌러주세요.')}} onRecover={recover} onConfirm={confirmMove} onCancel={cancelMove} onClose={()=>setSelected(null)}/>}
  <aside className="top-farm-camera"><button aria-label="농장 확대" onClick={()=>setZoom(z=>Math.min(1.8,z+.2))}><Plus size={17}/></button><button aria-label="농장 축소" onClick={()=>setZoom(z=>Math.max(.5,z-.2))}><Minus size={17}/></button>{editing&&<><button aria-label="격자 표시" aria-pressed={grid} onClick={()=>setGrid(!grid)}><Grid2X2 size={16}/></button><button aria-label="테스트 초기화" onClick={()=>{commit(initialTopview());choose('look')}}><RotateCcw size={15}/></button></>}</aside>
  <div className="top-farm-bottom">{editing&&<p className="top-farm-message" role="status">{notice?<>{notice.name} 회수 완료<button onClick={undo}>되돌리기</button></>:message}</p>}
   {editing&&group&&<div className="top-farm-palette"><header><span>{group}</span><small>{group==='보관함'?'회수한 개체는 무료로 다시 배치할 수 있어요.':'테스트 골드로 자유롭게 배치해 보세요'}</small><button aria-label="목록 닫기" onClick={()=>setGroup(null)}><X size={16}/></button></header><div>{(Object.entries(topviewItems) as [FarmTool,typeof topviewItems[FarmTool]][]).filter(([kind,item])=>group==='보관함'?state.stored.includes(kind):item.group===group).map(([kind,item])=>{const count=state.stored.filter(k=>k===kind).length;return <button key={kind} aria-pressed={mode===kind} onClick={()=>choose(kind)}><TopviewArt kind={kind}/><span>{item.name}</span><small>{count?`보관 ${count}개 · 무료`:item.price.toLocaleString()+' G'}</small></button>})}{group==='보관함'&&!state.stored.length&&<p className="top-farm-storage-empty">회수한 개체가 여기에 보관돼요.</p>}</div></div>}
   {editing&&mode==='land'&&<div className="top-farm-land-info"><LandPlot size={18}/><div><strong>땅 구매</strong><span>한 칸 {TEST_LAND_PRICE} G · 바다의 + 칸을 눌러 섬 확장</span></div></div>}
   {editing?<><div className="top-farm-edit-actions"><span>농장 편집</span><button aria-label="한 단계 되돌리기" disabled={!history.length} onClick={undo}><Undo2 size={15}/><span>되돌리기</span></button><button className="top-farm-edit-done" onClick={toggleEditing}><Check size={15}/>완료</button></div><nav className="top-farm-toolbar" aria-label="농장 편집 도구"><button aria-pressed={mode==='look'} onClick={()=>{choose('look');setGroup(null)}}><Hand size={18}/><span>둘러보기</span></button><button aria-pressed={mode==='land'} onClick={()=>{choose('land');setGroup(null)}}><LandPlot size={18}/><span>땅 구매</span></button>{(['건물','꾸미기'] as const).map(g=><button key={g} aria-pressed={group===g} onClick={()=>{setGroup(group===g?null:g);choose('look')}}><span className="top-farm-tool-art"><TopviewArt kind={g==='건물'?'office':'tree'}/></span><span>{g}</span></button>)}<button aria-pressed={mode==='path'} onClick={()=>{choose('path');setGroup(null)}}><Grid2X2 size={18}/><span>흙길</span></button><button aria-pressed={group==='보관함'} onClick={()=>{choose('look');setGroup(group==='보관함'?null:'보관함')}}><Package size={18}/><span>보관함</span></button></nav></>:<button className="top-farm-edit-trigger" onClick={toggleEditing}><Pencil size={17}/>편집</button>}
   <p className="top-farm-test-note">테스트 배치 · 실제 골드 사용 없음 · 새로고침 시 초기화</p>
  </div>
 </section>
}
