import {RodPartImage,hasRodImages} from './rod-image-assets'
// Image decorations with SVG fallback. Movement, hit areas and gauges belong to the caller.
import {memo,useId} from 'react'
import {hasExtraRodSkin,extraRodWidth,ExtraShaft,ExtraFrame,ExtraRotor,ExtraFloat,ExtraGrip} from './extra-rod-skin-art'

// Motion is applied by the parent SVG group. These drawings depend only on the rod.
export const RodSkinFrame=memo(RodSkinFrameArt)
export const RodSkinRotor=memo(RodSkinRotorArt)
export const RodSkinFloat=memo(RodSkinFloatArt)
export const RodSkinGrip=memo(RodSkinGripArt)

export function RodSkinShaft({id,path}:{id:string;path:string}){
 const key='rod-material-'+useId().replaceAll(':','')
 if(id==='basic')return <g data-skin-shaft={id}><path d={path} fill="none" stroke="#c69857" strokeWidth="6.2" strokeLinecap="round"/><path d={path} fill="none" stroke="#efd09a" strokeWidth="1.5" strokeOpacity=".8"/><path d={path} pathLength="100" fill="none" stroke="#96713f" strokeWidth="7" strokeDasharray=".7 16"/><path d={path} pathLength="100" fill="none" stroke="#e6c389" strokeWidth="6.8" strokeDasharray=".3 16.4"/></g>
 if(id==='bronze')return <g data-skin-shaft={id}><path d={path} fill="none" stroke="#76503a" strokeWidth="4.8" strokeLinecap="round"/><path d={path} fill="none" stroke="#d7b388" strokeWidth="1"/><path d={path} pathLength="100" fill="none" stroke="#b78c4e" strokeWidth="5.4" strokeDasharray="1 24"/></g>
 if(hasExtraRodSkin(id))return <ExtraShaft id={id} path={path} gradientId={key}/>
 const wood=id==='pongdang',coral=id==='coral'
 const width=wood?5.8:coral?4.8:3.8
 const colors=wood?['#71421e','#dba361','#9c622d']:coral?['#a64f64','#ffd0bf','#d4788d']:['#555e8f','#f1efff','#8c91bd']
 return <g data-skin-shaft={id}>
  <defs><linearGradient id={key} x1="0%" y1="0%" x2="100%" y2="20%"><stop stopColor={colors[0]}/><stop offset=".45" stopColor={colors[1]}/><stop offset=".7" stopColor={colors[2]}/><stop offset="1" stopColor={colors[1]}/></linearGradient></defs>
  <path d={path} fill="none" stroke={`url(#${key})`} strokeWidth={width} strokeLinecap="round"/>
  {wood?<><path d={path} fill="none" stroke="#613b1e" strokeWidth="1" strokeDasharray="13 4 4 8" strokeOpacity=".65"/><path d={path} pathLength="100" fill="none" stroke="#ffdfab" strokeWidth="6.1" strokeDasharray="1 .8 1 20" strokeLinecap="butt"/></>:coral?<><path d={path} fill="none" stroke="#ffe7ce" strokeWidth="1.1" strokeOpacity=".8"/><path d={path} pathLength="100" fill="none" stroke="#f7d9ad" strokeWidth="5.2" strokeDasharray="1.4 23.6"/><path d={path} pathLength="100" fill="none" stroke="#fff1de" strokeWidth="2" strokeDasharray=".5 7.5" strokeLinecap="round"/></>:<><path d={path} fill="none" stroke="#fff9ef" strokeWidth=".8" strokeOpacity=".9"/><path d={path} pathLength="100" fill="none" stroke="#ead5a4" strokeWidth="4.4" strokeDasharray=".8 24.2"/><path d={path} pathLength="100" fill="none" stroke="#535e96" strokeWidth="1.5" strokeDasharray="4 1 1 17"/></>}
 </g>
}
export function hasRodSkin(id?:string){return !!id&&(id==='basic'||id==='bronze'||id==='pongdang'||id==='coral'||id==='mistmoon'||hasExtraRodSkin(id))}
export function rodShaftOutlineWidth(id?:string){return id==='pongdang'?7:id==='coral'?6:id==='mistmoon'?4.8:id&&extraRodWidth(id)?extraRodWidth(id)!+1.2:6}
export function rodReelBackground(id:string){return ({nyamnyam:'#364c34',swift:'#26364f',siren:'#24574f',mukhyang:'#354641',scrapisle:'#426b57',cloudferry:'#527d69',whitenight:'#245c72',bluegrove:'#174d72',primal:'#37412e',bronze:'#183b53',pongdang:'#54351f',coral:'#783f57',mistmoon:'#202d50',starruins:'#263d43',dreamabyss:'#241c42',lunea:'#65537c',calm:'#28575b'} as Record<string,string>)[id]??'#28575b'}
function Star({fill='#f4a258'}:{fill?:string}){
 return <path d="m0-9 2.7 5.4 6-.8-3.8 4.8 2.6 5.5L1.7 3.6l-4.5 4-0.2-6-5.3-3 5.7-2Z" fill={fill} stroke="#a96a35" strokeWidth=".7"/>
}
function RodSkinFrameArt({id}:{id:string}){
 if(hasRodImages(id))return <RodPartImage key={id} id={id} part="frame" fallback={<VectorFrame id={id}/>}/>
 return <VectorFrame id={id}/>
}
function VectorFrame({id}:{id:string}){
 if(id==='basic'||id==='bronze')return <g data-skin-frame={id}><circle r="34" fill="#183b53" stroke="#abc7ce" strokeWidth="2"/></g>
 if(hasExtraRodSkin(id))return <ExtraFrame id={id}/>
 if(id==='pongdang')return <g data-skin-frame={id}><circle r="34" fill="#754423" stroke="#d6ab60" strokeWidth="3"/><circle r="30" fill="#ad763f" stroke="#f5d196"/>{Array.from({length:8},(_,i)=><circle key={i} cx={Math.cos(i*Math.PI/4)*32} cy={Math.sin(i*Math.PI/4)*32} r="1.3" fill="#ffe0a0"/>)}</g>
 if(id==='coral')return <g data-skin-frame={id}>{Array.from({length:12},(_,i)=><ellipse key={i} rx="8" ry="12" cy="-25" transform={`rotate(${i*30})`} fill="#fff0d9" stroke="#d8999b" strokeWidth="1"/>)}<circle r="29" fill="#a85d6b" stroke="#f5cf9d" strokeWidth="2"/></g>
 return <g data-skin-frame={id}><circle r="35" fill="#222c52" stroke="#bfc4df" strokeWidth="2.5"/><circle r="31" fill="#313b67" stroke="#e8dbb0" strokeWidth=".8"/>{Array.from({length:8},(_,i)=><circle key={i} cx={Math.cos(i*Math.PI/4)*33} cy={Math.sin(i*Math.PI/4)*33} r="1" fill="#fff7de"/>)}</g>
}
function RodSkinRotorArt({id}:{id:string}){
 if(hasRodImages(id))return <RodPartImage key={id} id={id} part="rotor" fallback={<VectorRotor id={id}/>}/>
 return <VectorRotor id={id}/>
}
function VectorRotor({id}:{id:string}){
 if(id==='basic'||id==='bronze')return <g data-skin-rotor={id}><circle r="24" fill="#597e81"/><path d="M-23 0H23M0-23V23" stroke="#d7b388" strokeWidth="3"/><circle cx="24" r="5" fill="#d7b388"/></g>
 if(hasExtraRodSkin(id))return <ExtraRotor id={id}/>
 if(id==='pongdang')return <g data-skin-rotor={id}><circle r="27" fill="#a8713e" stroke="#e1bb7e"/><path d="M-23-10Q-4-18 21-9M-25 1Q-5-7 25 3M-21 14Q0 6 23 16" fill="none" stroke="#754823" strokeWidth="1.5"/><path d="M0 0 20 8" stroke="#e5bb68" strokeWidth="4"/><circle r="6" fill="#f0c979" stroke="#774b28"/><g transform="translate(21 8) scale(.8)"><Star/></g></g>
 if(id==='coral')return <g data-skin-rotor={id}>{Array.from({length:5},(_,i)=><path key={i} d="M0 0C-18-11-13-29 0-25C13-29 18-11 0 0Z" transform={`rotate(${i*72})`} fill={i%2?'#ed9a9b':'#f5b6aa'} stroke="#ffe8cb" strokeWidth="1.3"/>)}<circle r="6" fill="#ffdfb1" stroke="#c68c73"/><path d="M0 0 19 13" stroke="#e3b783" strokeWidth="3"/><circle cx="21" cy="15" r="5" fill="#ffdfce" stroke="#d9988c"/></g>
 return <g data-skin-rotor={id}><path d="M13-25A28 28 0 1 0 16 23A24 24 0 0 1 13-25Z" fill="#ded8f5" stroke="#fff1cb" strokeWidth="1.2"/><path d="m0-12 3 8 8 4-8 3-3 9-3-9-8-3 8-4Z" fill="#f5ddaa"/><circle r="4" fill="#cbc5f0"/><path d="M0 0 21 13" stroke="#d7c69b" strokeWidth="2.5"/><circle cx="23" cy="15" r="5" fill="#e6dcff" stroke="#fff0cc"/></g>
}
function RodSkinFloatArt({id}:{id:string}){
 if(hasRodImages(id))return <RodPartImage key={id} id={id} part="float" fallback={<VectorFloat id={id}/>}/>
 return <VectorFloat id={id}/>
}
function VectorFloat({id}:{id:string}){
 if(id==='basic'||id==='bronze')return <g data-skin-float={id}><ellipse rx="5" ry="9" fill="#fff1d4"/><path d="M-5 0a5 9 0 0 0 10 0Z" fill="#eb886f"/></g>
 if(hasExtraRodSkin(id))return <ExtraFloat id={id}/>
 if(id==='pongdang')return <g data-skin-float={id}><ellipse rx="5.5" ry="9" fill="#ed994b" stroke="#f8d69e" strokeWidth=".8"/><path d="M-5 0H5" stroke="#fff0ca" strokeWidth="3"/><g transform="translate(0 -13) scale(.45)"><Star/></g></g>
 if(id==='coral')return <g data-skin-float={id}><path d="M0-13C-10-6-7 7 0 9C7 7 10-6 0-13Z" fill="#f2a4a7" stroke="#ffe3cc"/><path d="M0-9Q-4 0 0 7Q4 0 0-9" fill="#ffd0bd"/><path d="m0 8-5 3 2 4h6l2-4Z" fill="#fff0db" stroke="#dfb393"/></g>
 return <g data-skin-float={id}><path d="M0-10C-3-6-8 2-4 8Q0 13 4 8C8 2 3-6 0-10Z" fill="#d4d5ec" stroke="#fbf5d9"/><path d="M0-7Q-4 3 0 8" fill="none" stroke="#fff" strokeWidth="1.1"/><path d="M3-21A5 5 0 1 0 4-12A4 4 0 0 1 3-21Z" fill="#f9df9d"/></g>
}
function RodSkinGripArt({id}:{id:string}){
 if(id==='basic'||id==='bronze')return null
 if(hasExtraRodSkin(id))return <ExtraGrip id={id}/>
 return <g data-skin-grip={id}>{id==='pongdang'?<><path d="M-4-18 0-3M2-19 5-7" stroke="#e2b781" strokeWidth="1.4"/><g transform="scale(.6)"><Star/></g></>:id==='coral'?<><path d="M0 7V-7m0 5-6-4m6 7 6-5" stroke="#f5a4a4" strokeWidth="3" strokeLinecap="round"/><path d="M-6 9Q0-3 6 9Z" fill="#fff0d7"/></>:<path d="M2-9A9 9 0 1 0 5 8A8 8 0 0 1 2-9Z" fill="#e7dcff" stroke="#f9dbaa"/>}</g>
}
