const materials:Record<string,{width:number;colors:string[];band:string;dash:string}>={
 bluegrove:{width:5,colors:['#154c91','#55c8dc','#2468af'],band:'#d9e3e5',dash:'1.2 23.8'},
 primal:{width:5.8,colors:['#493a28','#a5854e','#56613b'],band:'#ead5a4',dash:'1.5 2 1.5 20'},
 starruins:{width:5.6,colors:['#344e58','#8aa9a9','#405c66'],band:'#d9bd7e',dash:'2 1 1 21'},
 dreamabyss:{width:3.6,colors:['#302448','#a28ad4','#493775'],band:'#8cdbef',dash:'6 2 1 16'},
 lunea:{width:4.6,colors:['#b6acc3','#fff9ed','#dbcbe6'],band:'#ebcd91',dash:'.8 3 .8 20.4'},
 calm:{width:5,colors:['#356d70','#bce9d9','#5e9e98'],band:'#f0e8ca',dash:'3 22'},
}
export const hasExtraRodSkin=(id:string)=>id in materials
export const extraRodWidth=(id:string)=>materials[id]?.width
export function ExtraShaft({id,path,gradientId}:{id:string;path:string;gradientId:string}){
 const m=materials[id]
 return <g data-skin-shaft={id}><defs><linearGradient id={gradientId}><stop stopColor={m.colors[0]}/><stop offset=".45" stopColor={m.colors[1]}/><stop offset="1" stopColor={m.colors[2]}/></linearGradient></defs>
  <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth={m.width} strokeLinecap="round"/>
  <path d={path} pathLength="100" fill="none" stroke={m.band} strokeWidth={m.width+.5} strokeDasharray={m.dash}/>
  <path d={path} fill="none" stroke={id==='dreamabyss'?'#82dff1':'#fff9e4'} strokeOpacity=".75" strokeWidth=".8" strokeDasharray={id==='starruins'?'3 5':undefined}/>
  {id==='dreamabyss'&&<path d={path} fill="none" stroke="#d3a8ff" strokeWidth="1.4" strokeDasharray="12 9"/>}
 </g>
}
export function ExtraFrame({id}:{id:string}){
 if(id==='bluegrove')return <g data-skin-frame={id}><circle r="34" fill="#248c9c" stroke="#d9e3e5" strokeWidth="3"/><circle r="28" fill="#f4ead5"/></g>
 if(id==='primal')return <g data-skin-frame={id}><circle r="34" fill="#3c4c32" stroke="#d6bf8a" strokeWidth="3"/><circle r="29" fill="#706041" stroke="#c99042"/></g>
 if(id==='starruins')return <g data-skin-frame={id}><path d="m-15-34 30 0 19 19v30L15 34h-30l-19-19v-30Z" fill="#3c5960" stroke="#d7bb7d" strokeWidth="3"/><path d="m-12-29 24 0 17 17v24L12 29h-24l-17-17v-24Z" fill="none" stroke="#8ba7a1"/></g>
 if(id==='dreamabyss')return <g data-skin-frame={id}><circle r="35" fill="#211d42" stroke="#9985cd" strokeWidth="2"/><circle r="31" fill="none" stroke="#7acddd" strokeWidth="1"/>{[0,90,180,270].map(a=><path key={a} d="M-6-32q6-7 12 0" transform={`rotate(${a})`} fill="none" stroke="#c1a0ed"/>)}</g>
 if(id==='lunea')return <g data-skin-frame={id}><circle r="34" fill="#534c73" stroke="#f5deac" strokeWidth="2"/>{Array.from({length:14},(_,i)=><circle key={i} cx={Math.cos(i*Math.PI/7)*32} cy={Math.sin(i*Math.PI/7)*32} r="2.8" fill="#f8f2ef" stroke="#c8b5d6" strokeWidth=".6"/>)}</g>
 return <g data-skin-frame={id}><circle r="35" fill="#346f73" stroke="#d8e5d0" strokeWidth="3"/><circle r="30" fill="#5b9994" stroke="#bce7d6"/><path d="M-27-13q8-5 13 0m28 26q8 5 13 0" fill="none" stroke="#edf4da" strokeWidth="1.4"/></g>
}
export function ExtraRotor({id}:{id:string}){
 if(id==='bluegrove')return <g data-skin-rotor={id}><circle r="26" fill="#f4ead5" stroke="#39b6c6" strokeWidth="2"/><path d="M-8-23C20-13-20 8 8 23" fill="none" stroke="#2468af" strokeWidth="9"/><circle r="4" fill="#d9e3e5"/><path d="M0 0 20 16" stroke="#d9e3e5" strokeWidth="3"/><circle cx="22" cy="18" r="5" fill="#248c9c"/></g>
 if(id==='primal')return <g data-skin-rotor={id}><circle r="26" fill="#bd8438" stroke="#edd39c"/><path d="M0 0C-10-12-21 2-12 12C4 30 30 4 17-14C6-29-20-22-24-5" fill="none" stroke="#f5d48a" strokeWidth="3"/><circle r="4" fill="#5b6f41"/></g>
 if(id==='starruins')return <g data-skin-rotor={id}><path d="m0-27 5 15 14-7-7 14 15 5-15 5 7 14-14-7-5 15-5-15-14 7 7-14-15-5 15-5-7-14 14 7Z" fill="#d8bb7e" stroke="#fff0bd"/><circle r="6" fill="#649d9e" stroke="#edda9f"/><path d="M0 0 22 13" stroke="#c9a86d" strokeWidth="3"/><path d="m22 8 5 5-5 5-5-5Z" fill="#a5bdb0" stroke="#e5d29c"/></g>
 if(id==='dreamabyss')return <g data-skin-rotor={id}><path d="M-23 10C-36-13-4-35 17-17C35-1 12 26-5 16C-18 8-8-8 4-5C13-2 7 8 1 5" fill="none" stroke="#8de3ef" strokeWidth="5" strokeLinecap="round"/><path d="M-18 19Q3 30 24 3" fill="none" stroke="#cbacfa" strokeWidth="3"/><path d="M0 0 21 12" stroke="#baa1de" strokeWidth="2"/><circle cx="23" cy="14" r="4.5" fill="#e0c9f7"/></g>
 if(id==='lunea')return <g data-skin-rotor={id}><path d="M10-27A28 28 0 1 0 12 25A24 24 0 0 1 10-27Z" fill="#fff0c7" stroke="#d7b875"/><path d="M-13-19A22 22 0 1 1-14 17A20 20 0 0 0-13-19Z" fill="#d4c8ed" stroke="#f1e6fb"/><circle r="7" fill="#f7e9f5" stroke="#efcf8b"/><path d="M0 0 19 15" stroke="#e2c082" strokeWidth="2"/><circle cx="22" cy="17" r="4" fill="#eee0ff"/></g>
 return <g data-skin-rotor={id}>{[0,120,240].map(a=><path key={a} transform={`rotate(${a})`} d="M0-5C-23-15-29 10-18 19C-23 4-9 0 0 5Z" fill="#f0ebd2" stroke="#c7e3cb"/>)}<circle r="5.5" fill="#c8e6d9" stroke="#f8edc6"/><path d="M0 0 22 11" stroke="#cbdcba" strokeWidth="2.5"/><circle cx="24" cy="12" r="4.5" fill="#f5eed8"/></g>
}
export function ExtraFloat({id}:{id:string}){
 if(id==='bluegrove')return <g data-skin-float={id}><ellipse rx="6" ry="10" fill="#f4ead5" stroke="#d9e3e5"/><path d="M-6 0Q0 3 6 0L0 10Z" fill="#2468af"/><path d="M-6-2H6" stroke="#39b6c6" strokeWidth="4"/></g>
 if(id==='primal')return <g data-skin-float={id}><ellipse rx="6" ry="10" fill="#daa044" stroke="#f8dfaa"/><path d="M-5 1H5" stroke="#617548" strokeWidth="3"/><path d="M0-15V-9" stroke="#ead5a4" strokeWidth="2"/></g>
 if(id==='starruins')return <g data-skin-float={id}><path d="m0-13 5 7v14l-5 4-5-4V-6Z" fill="#a8c5bd" stroke="#e6c992"/><path d="M-4 0H4" stroke="#4c858d" strokeWidth="3"/><path d="m0-22 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#f0d99b"/></g>
 if(id==='dreamabyss')return <g data-skin-float={id}><path d="M0-12C-9-5-7 7 0 12C7 7 9-5 0-12Z" fill="#7960b0" stroke="#a7dcea"/><path d="M-2 7Q5 0-2-7" fill="none" stroke="#a3e8ee"/><path d="M0-12Q-5-18 2-22" fill="none" stroke="#92d9ed" strokeWidth="2"/></g>
 if(id==='lunea')return <g data-skin-float={id}><path d="M3-14A12 12 0 1 0 6 8A10 10 0 0 1 3-14Z" fill="#f6e2a9" stroke="#ffefc9"/><circle cy="-2" r="5" fill="#f5eafa" stroke="#cdbde8"/><path d="m-2 9-3 8 4-3m3-5 3 7-4-2" fill="#cbb5eb"/></g>
 return <g data-skin-float={id}><ellipse rx="6.5" ry="9" fill="#6baaa7" stroke="#dce9d3"/><path d="M-6-2Q-3-5 0-2T6-2M-6 3Q-3 0 0 3T6 3" fill="none" stroke="#fff0d4" strokeWidth="1.4"/><path d="M0-15v6" stroke="#f6e4b9" strokeWidth="2"/></g>
}
export function ExtraGrip({id}:{id:string}){
 if(id==='bluegrove')return <g data-skin-grip={id}><path d="M-3-10Q7-4 0 2T3 10" stroke="#83dcd7" strokeWidth="3" fill="none"/></g>
 if(id==='primal')return <g data-skin-grip={id}><ellipse rx="4" ry="7" fill="#db9e43" stroke="#ead5a4"/><path d="M0-4V4m0-2-2-2m2 0 2-2" stroke="#6b713e" fill="none"/></g>
 return <g data-skin-grip={id}>{id==='starruins'?<path d="m0-10 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#e3ca8d" stroke="#8d9e93"/>:id==='dreamabyss'?<path d="M-3-12Q6-6-2 0T2 12M1-10Q-6-4 2 3" fill="none" stroke="#a3d9ee" strokeWidth="2"/>:id==='lunea'?<><circle r="5" fill="#f3e6f6" stroke="#e3cb92"/><path d="M2-11A11 11 0 1 0 4 10A9 9 0 0 1 2-11Z" fill="#f6dfac"/></>:<path d="M-6-5Q-3-9 1-5T7-5M-6 1Q-3-3 1 1T7 1M-6 7Q-3 3 1 7T7 7" stroke="#e0ead0" fill="none" strokeWidth="2"/>}</g>
}
