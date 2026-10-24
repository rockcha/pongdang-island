/** Local tank zoom: keep page navigation and controls at their original size. */
export function bindTankPinchZoom(viewport:HTMLElement,content:HTMLElement){
 let scale=1,x=0,y=0,gesture=false
 let start:{distance:number;scale:number;x:number;y:number;cx:number;cy:number}|null=null
 const position=(touches:TouchList)=>{
  const rect=viewport.getBoundingClientRect(),a=touches[0],b=touches[1]??a
  return {cx:(a.clientX+b.clientX)/2-rect.left,cy:(a.clientY+b.clientY)/2-rect.top,distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
 }
 const paint=()=>{
  x=scale<1?viewport.clientWidth*(1-scale)/2:Math.max(viewport.clientWidth*(1-scale),Math.min(0,x))
  y=scale<1?viewport.clientHeight*(1-scale)/2:Math.max(viewport.clientHeight*(1-scale),Math.min(0,y))
  content.style.transformOrigin='0 0'
  content.style.transform=`translate(${x}px,${y}px) scale(${scale})`
 }
 const begin=(event:TouchEvent)=>{
  if(event.touches.length>=2||scale>1){
   gesture=true;event.preventDefault();event.stopImmediatePropagation()
   start={...position(event.touches),scale,x,y}
  }
 }
 const move=(event:TouchEvent)=>{
  if(!gesture||!start)return
  event.preventDefault();event.stopImmediatePropagation()
  const point=position(event.touches)
  scale=event.touches.length>=2&&start.distance>0?Math.max(.5,Math.min(3,start.scale*point.distance/start.distance)):start.scale
  const ratio=scale/start.scale
  x=point.cx-(start.cx-start.x)*ratio;y=point.cy-(start.cy-start.y)*ratio
  paint()
 }
 const end=(event:TouchEvent)=>{
  if(!gesture)return
  event.preventDefault();event.stopImmediatePropagation()
  if(event.touches.length){start={...position(event.touches),scale,x,y}}
  else {gesture=false;start=null}
 }
 viewport.addEventListener('touchstart',begin,{capture:true,passive:false})
 viewport.addEventListener('touchmove',move,{capture:true,passive:false})
 viewport.addEventListener('touchend',end,{capture:true,passive:false})
 viewport.addEventListener('touchcancel',end,{capture:true,passive:false})
 const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(paint)
 observer?.observe(viewport)
 return()=>{
  viewport.removeEventListener('touchstart',begin,true);viewport.removeEventListener('touchmove',move,true)
  viewport.removeEventListener('touchend',end,true);viewport.removeEventListener('touchcancel',end,true)
  observer?.disconnect();content.style.transform='';content.style.transformOrigin=''
 }
}
