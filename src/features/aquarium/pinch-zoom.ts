import {clampTankCameraView} from './tank-world'
export type TankCamera={zoom:number;view:number;y?:number}

// Zoom the camera, not an already-clipped canvas. Single-finger object dragging
// continues through Phaser; only a two-finger gesture belongs to this handler.
export function bindTankPinchZoom(viewport:HTMLElement,options:{columns:number;minZoom?:number;maxZoom?:number;getState:()=>TankCamera;onChange:(camera:TankCamera)=>void;onBegin?:()=>void;onEnd?:()=>void}){
 const minimum=options.minZoom??1/options.columns,maximum=options.maxZoom??1
 let start:{distance:number;zoom:number;anchor:number;anchorY?:number}|null=null,gesture=false
 const position=(touches:TouchList)=>{
  const rect=viewport.getBoundingClientRect(),a=touches[0],b=touches[1]??a
  return {cx:(a.clientX+b.clientX)/2-rect.left,cy:(a.clientY+b.clientY)/2-rect.top,distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
 }
 const consume=(event:TouchEvent)=>{event.preventDefault();event.stopImmediatePropagation()}
 const begin=(event:TouchEvent)=>{
  if(event.touches.length<2)return
  consume(event);gesture=true;options.onBegin?.()
  const point=position(event.touches),state=options.getState()
  start={distance:point.distance,zoom:state.zoom,anchor:state.view*viewport.clientWidth+point.cx/state.zoom,anchorY:state.y===undefined?undefined:state.y*viewport.clientWidth+point.cy/state.zoom}
 }
 const move=(event:TouchEvent)=>{
  if(!gesture)return
  consume(event)
  if(!start||event.touches.length<2)return
  const point=position(event.touches)
  const zoom=Math.max(minimum,Math.min(maximum,start.zoom*point.distance/Math.max(1,start.distance)))
  options.onChange({zoom,view:clampTankCameraView((start.anchor-point.cx/zoom)/Math.max(1,viewport.clientWidth),options.columns,zoom),...(start.anchorY===undefined?{}:{y:(start.anchorY-point.cy/zoom)/Math.max(1,viewport.clientWidth)})})
 }
 const end=(event:TouchEvent)=>{
  if(!gesture)return
  consume(event)
  if(!event.touches.length){gesture=false;start=null;options.onEnd?.()}
 }
 viewport.addEventListener('touchstart',begin,{capture:true,passive:false})
 viewport.addEventListener('touchmove',move,{capture:true,passive:false})
 viewport.addEventListener('touchend',end,{capture:true,passive:false})
 viewport.addEventListener('touchcancel',end,{capture:true,passive:false})
 return()=>{
  viewport.removeEventListener('touchstart',begin,true);viewport.removeEventListener('touchmove',move,true)
  viewport.removeEventListener('touchend',end,true);viewport.removeEventListener('touchcancel',end,true)
 }
}
