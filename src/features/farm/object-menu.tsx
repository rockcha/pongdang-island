import {useLayoutEffect,useRef,useState,type RefObject} from 'react'
import {Check,Move,Trash2,Undo2,X} from 'lucide-react'
import {MAP_W,TILE,objectArtHeight,objectFootprint,topviewItems,type TopviewObject} from './topview-model'

export function FarmObjectMenu({object,svgRef,viewportRef,moving,valid,onMove,onRecover,onConfirm,onCancel,onClose}:{object:TopviewObject;svgRef:RefObject<SVGSVGElement|null>;viewportRef:RefObject<HTMLDivElement|null>;moving:boolean;valid:boolean;onMove:()=>void;onRecover:()=>void;onConfirm:()=>void;onCancel:()=>void;onClose:()=>void}){
 const menu=useRef<HTMLDivElement>(null),[position,setPosition]=useState<{left:number;top:number;arrow:number;below:boolean}|null>(null)
 const item={...topviewItems[object.kind],...objectFootprint(object)}
 useLayoutEffect(()=>{
  function update(){
   const svg=svgRef.current,popup=menu.current,viewport=viewportRef.current
   if(!svg||!popup||!viewport)return
   const bounds=svg.getBoundingClientRect(),box=popup.getBoundingClientRect(),root=svg.closest('.top-farm')
   const scale=bounds.width/((MAP_W+4)*TILE),anchorX=bounds.left+(object.x+item.w/2+2)*TILE*scale
   const height=objectArtHeight(object.kind,object.rotation)
   const objectTop=bounds.top+((object.y+item.h+2)*TILE-height)*scale,objectBottom=bounds.top+(object.y+item.h+2)*TILE*scale
   const headerBottom=root?.querySelector('.top-farm-header')?.getBoundingClientRect().bottom??12
   const footerTop=root?.querySelector('.top-farm-bottom')?.getBoundingClientRect().top??window.innerHeight
   const minTop=headerBottom+10,maxTop=Math.max(minTop,footerTop-box.height-10)
   const below=objectTop-box.height-12<minTop&&objectBottom+12+box.height<footerTop
   const left=Math.max(12,Math.min(anchorX-box.width/2,window.innerWidth-box.width-12))
   const top=Math.max(minTop,Math.min(below?objectBottom+12:objectTop-box.height-12,maxTop))
   const next={left,top,arrow:Math.max(16,Math.min(anchorX-left,box.width-16)),below}
   setPosition(old=>old&&Object.keys(next).every(key=>old[key as keyof typeof next]===next[key as keyof typeof next])?old:next)
  }
  update()
  const viewport=viewportRef.current
  viewport?.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update)
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):null
  if(menu.current)observer?.observe(menu.current)
  if(svgRef.current)observer?.observe(svgRef.current)
  return()=>{viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);observer?.disconnect()}
 },[object.x,object.y,object.kind,item,svgRef,viewportRef,moving])
 return <div ref={menu} role="group" aria-label={`${item.name} ${moving?'이동':'편집'} 메뉴`} className="top-farm-object-menu" data-below={position?.below} style={{left:position?.left??0,top:position?.top??0,visibility:position?'visible':'hidden'}}>
  <header><strong>{item.name}{moving?' 이동 중':''}</strong><button aria-label="개체 메뉴 닫기" onClick={moving?onCancel:onClose}><X size={13}/></button></header>
  <div>{moving?<><button disabled={!valid} onClick={onConfirm}><Check size={14}/>배치</button><button onClick={onCancel}><X size={14}/>취소</button></>:<><button onClick={onMove}><Move size={14}/>이동</button><button onClick={onRecover}>{object.kind==='plot'?<><Trash2 size={14}/>제거하기</>:<><Undo2 size={14}/>회수</>}</button></>}</div>
  <i aria-hidden="true" style={{left:position?.arrow??'50%'}}/>
 </div>
}
