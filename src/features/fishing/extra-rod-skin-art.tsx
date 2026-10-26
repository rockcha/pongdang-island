import {useState} from 'react'

function CloudferryFloat(){
 const [failed,setFailed]=useState(false)
 return <g data-skin-float="cloudferry">{!failed?<image href="/fishing/equipment/cloudferry-totoro-float.png" x="-17" y="-24" width="34" height="34" preserveAspectRatio="xMidYMid meet" onError={()=>setFailed(true)}/>:<><path d="M-5-9-6-18-2-14 2-14 6-18 5-9C14-3 12 11 0 12C-12 11-14-3-5-9Z" fill="#8e9690" stroke="#4d5953"/><ellipse cy="4" rx="7" ry="6" fill="#f7edcf"/><circle cx="-4" cy="-5" r="1.5" fill="white"/><circle cx="4" cy="-5" r="1.5" fill="white"/><path d="m-4 3 2-2 2 2m1 0 2-2 2 2M-1-4H1" fill="none" stroke="#4d5953" strokeWidth="1.2"/></>}</g>
}

const materials:Record<string,{width:number;colors:string[];band:string;dash:string}>={
 nyamnyam:{width:5,colors:['#455a39','#e2c28a','#566e49'],band:'#efac82',dash:'1.5 2 1.5 20'},
 siren:{width:5,colors:['#b39559','#fff3d6','#4a9f99'],band:'#d7b667',dash:'1 2 1 21'},
 mukhyang:{width:5,colors:['#6a6855','#e0d4ad','#444b46'],band:'#828571',dash:'1 24'},
 scrapisle:{width:5.5,colors:['#78513c','#d6a976','#589279'],band:'#af8256',dash:'1.5 2 1.5 20'},
 cloudferry:{width:5,colors:['#8d6638','#e5c893','#b0a267'],band:'#70977c',dash:'1.2 23.8'},
 whitenight:{width:4.8,colors:['#428aa9','#eaf9ff','#78bcd6'],band:'#d9e4ee',dash:'1.2 23.8'},
 bluegrove:{width:5,colors:['#154c91','#55c8dc','#2468af'],band:'#d9e3e5',dash:'1.2 23.8'},
 primal:{width:5.8,colors:['#493a28','#a5854e','#56613b'],band:'#ead5a4',dash:'1.5 2 1.5 20'},
 starruins:{width:5.6,colors:['#344e58','#8aa9a9','#405c66'],band:'#d9bd7e',dash:'2 1 1 21'},
 dreamabyss:{width:3.6,colors:['#302448','#a28ad4','#493775'],band:'#8cdbef',dash:'6 2 1 16'},
 lunea:{width:4.6,colors:['#b6acc3','#fff9ed','#dbcbe6'],band:'#ebcd91',dash:'.8 3 .8 20.4'},
 calm:{width:5,colors:['#356d70','#bce9d9','#5e9e98'],band:'#f0e8ca',dash:'3 22'},
 swift:{width:4.8,colors:['#17263e','#64748b','#26364f'],band:'#d9b66f',dash:'2 2 1 20'},
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
 if(id==='nyamnyam'||id==='swift')return <g data-skin-frame={id}><circle r="34" fill={id==='swift'?'#26364f':'#435c3b'} stroke="#d9b66f" strokeWidth="4"/><circle r="28" fill="none" stroke="#f5dfb2"/></g>
 if(id==='siren')return <g data-skin-frame={id}><circle r="34" fill="#2f797b" stroke="#ddbd75" strokeWidth="3"/><circle r="28" fill="#f4e7c9" stroke="#a88842"/><path d="M-17-19Q-10 26 0 18Q10 26 17-19M-13-13H13M-7-12V13M0-12V18M7-12V13" fill="none" stroke="#b39559" strokeWidth="3"/></g>
 if(id==='mukhyang')return <g data-skin-frame={id}><circle r="34" fill="#333b3b" stroke="#b4b6a4" strokeWidth="3"/><circle r="27" fill="#202c2e" stroke="#677875"/><path d="M-20 10Q-5-20 18-10" fill="none" stroke="#879c91" strokeWidth="2"/><rect x="17" y="15" width="9" height="9" rx="1" fill="#ae5145"/></g>
 if(id==='scrapisle')return <g data-skin-frame={id}><circle r="34" fill="#426b57" stroke="#bf9463" strokeWidth="4"/><circle r="27" fill="#77a48a" stroke="#e0bb84"/></g>
 if(id==='cloudferry')return <g data-skin-frame={id}><circle r="34" fill="#729789" stroke="#dfbd78" strokeWidth="4"/><circle r="28" fill="#fff3d8" stroke="#91b6a1"/></g>
 if(id==='whitenight')return <g data-skin-frame={id}><circle r="34" fill="#245c72" stroke="#d9e4ee" strokeWidth="4"/><circle r="29" fill="#3d819c" stroke="#a1e4f6"/></g>
 if(id==='bluegrove')return <g data-skin-frame={id}><circle r="34" fill="#248c9c" stroke="#d9e3e5" strokeWidth="3"/><circle r="28" fill="#f4ead5"/></g>
 if(id==='primal')return <g data-skin-frame={id}><circle r="34" fill="#3c4c32" stroke="#d6bf8a" strokeWidth="3"/><circle r="29" fill="#706041" stroke="#c99042"/></g>
 if(id==='starruins')return <g data-skin-frame={id}><path d="m-15-34 30 0 19 19v30L15 34h-30l-19-19v-30Z" fill="#3c5960" stroke="#d7bb7d" strokeWidth="3"/><path d="m-12-29 24 0 17 17v24L12 29h-24l-17-17v-24Z" fill="none" stroke="#8ba7a1"/></g>
 if(id==='dreamabyss')return <g data-skin-frame={id}><circle r="35" fill="#211d42" stroke="#9985cd" strokeWidth="2"/><circle r="31" fill="none" stroke="#7acddd" strokeWidth="1"/>{[0,90,180,270].map(a=><path key={a} d="M-6-32q6-7 12 0" transform={`rotate(${a})`} fill="none" stroke="#c1a0ed"/>)}</g>
 if(id==='lunea')return <g data-skin-frame={id}><circle r="34" fill="#534c73" stroke="#f5deac" strokeWidth="2"/>{Array.from({length:14},(_,i)=><circle key={i} cx={Math.cos(i*Math.PI/7)*32} cy={Math.sin(i*Math.PI/7)*32} r="2.8" fill="#f8f2ef" stroke="#c8b5d6" strokeWidth=".6"/>)}</g>
 return <g data-skin-frame={id}><circle r="35" fill="#346f73" stroke="#d8e5d0" strokeWidth="3"/><circle r="30" fill="#5b9994" stroke="#bce7d6"/><path d="M-27-13q8-5 13 0m28 26q8 5 13 0" fill="none" stroke="#edf4da" strokeWidth="1.4"/></g>
}
export function ExtraRotor({id}:{id:string}){
 if(id==='nyamnyam'||id==='swift')return <g data-skin-rotor={id}>{[0,120,240].map(a=><path key={a} transform={`rotate(${a})`} d="M0-3Q-24-25-22 3Q-11-6 0 3Z" fill={id==='swift'?'#f4e4c3':'#ed9975'} stroke="#d9b66f"/>)}<circle r="5" fill="#d9b66f"/><path d="M0 0 22 15" stroke="#d9b66f" strokeWidth="3"/><circle cx="24" cy="17" r="5" fill={id==='swift'?'#d99935':'#ed9975'}/></g>
 if(id==='mukhyang')return <g data-skin-rotor={id}><circle r="24" fill="#f0ead9" stroke="#909d8e" strokeWidth="2"/><path d="M-16 12Q-11-17 2-13T16 9Q1-1-16 12Z" fill="#394440"/><path d="M0 0 22 15" stroke="#879a89" strokeWidth="3"/><ellipse cx="24" cy="17" rx="6" ry="5" fill="#dbe8d7" stroke="#718b7c"/><circle r="4" fill="#c8d9c6"/></g>
 if(id==='scrapisle')return <g data-skin-rotor={id}>{Array.from({length:10},(_,i)=><path key={i} transform={`rotate(${i*36})`} d="M-5-20-5-28H5V-20Z" fill="#bf9463" stroke="#e0bb84"/>)}<circle r="23" fill="#b88853" stroke="#e0bb84" strokeWidth="2"/><circle r="12" fill="#548b72"/><circle r="4" fill="#e0bb84"/><path d="M0 0 22 13" stroke="#e0bb84" strokeWidth="3"/><circle cx="24" cy="15" r="5" fill="#548b72"/></g>
 if(id==='cloudferry')return <g data-skin-rotor={id}><path d="M-23 10C-33-1-20-15-10-10C-10-27 14-29 19-12C34-14 36 9 23 13H-20Z" fill="#fff7df" stroke="#cda966" strokeWidth="2"/><circle r="5" fill="#83ae9a"/><path d="M0 0 22 15" stroke="#b59153" strokeWidth="3"/><circle cx="24" cy="17" r="5" fill="#dfbb78"/></g>
 if(id==='whitenight')return <g data-skin-rotor={id}>{[0,60,120,180,240,300].map(a=><path key={a} transform={`rotate(${a})`} d="M0-5-5-19 0-27 5-19Z" fill="#a1e4f6" stroke="#f2fcff"/>)}<circle r="6" fill="#f2fcff" stroke="#d6c397"/><path d="M0 0 20 15" stroke="#d6c397" strokeWidth="3"/><circle cx="22" cy="17" r="5" fill="#fff5dc"/></g>
 if(id==='bluegrove')return <g data-skin-rotor={id}><circle r="26" fill="#f4ead5" stroke="#39b6c6" strokeWidth="2"/><path d="M-8-23C20-13-20 8 8 23" fill="none" stroke="#2468af" strokeWidth="9"/><circle r="4" fill="#d9e3e5"/><path d="M0 0 20 16" stroke="#d9e3e5" strokeWidth="3"/><circle cx="22" cy="18" r="5" fill="#248c9c"/></g>
 if(id==='primal')return <g data-skin-rotor={id}><circle r="26" fill="#bd8438" stroke="#edd39c"/><path d="M0 0C-10-12-21 2-12 12C4 30 30 4 17-14C6-29-20-22-24-5" fill="none" stroke="#f5d48a" strokeWidth="3"/><circle r="4" fill="#5b6f41"/></g>
 if(id==='starruins')return <g data-skin-rotor={id}><path d="m0-27 5 15 14-7-7 14 15 5-15 5 7 14-14-7-5 15-5-15-14 7 7-14-15-5 15-5-7-14 14 7Z" fill="#d8bb7e" stroke="#fff0bd"/><circle r="6" fill="#649d9e" stroke="#edda9f"/><path d="M0 0 22 13" stroke="#c9a86d" strokeWidth="3"/><path d="m22 8 5 5-5 5-5-5Z" fill="#a5bdb0" stroke="#e5d29c"/></g>
 if(id==='dreamabyss')return <g data-skin-rotor={id}><path d="M-23 10C-36-13-4-35 17-17C35-1 12 26-5 16C-18 8-8-8 4-5C13-2 7 8 1 5" fill="none" stroke="#8de3ef" strokeWidth="5" strokeLinecap="round"/><path d="M-18 19Q3 30 24 3" fill="none" stroke="#cbacfa" strokeWidth="3"/><path d="M0 0 21 12" stroke="#baa1de" strokeWidth="2"/><circle cx="23" cy="14" r="4.5" fill="#e0c9f7"/></g>
 if(id==='lunea')return <g data-skin-rotor={id}><path d="M10-27A28 28 0 1 0 12 25A24 24 0 0 1 10-27Z" fill="#fff0c7" stroke="#d7b875"/><path d="M-13-19A22 22 0 1 1-14 17A20 20 0 0 0-13-19Z" fill="#d4c8ed" stroke="#f1e6fb"/><circle r="7" fill="#f7e9f5" stroke="#efcf8b"/><path d="M0 0 19 15" stroke="#e2c082" strokeWidth="2"/><circle cx="22" cy="17" r="4" fill="#eee0ff"/></g>
 return <g data-skin-rotor={id}>{[0,120,240].map(a=><path key={a} transform={`rotate(${a})`} d="M0-5C-23-15-29 10-18 19C-23 4-9 0 0 5Z" fill="#f0ebd2" stroke="#c7e3cb"/>)}<circle r="5.5" fill="#c8e6d9" stroke="#f8edc6"/><path d="M0 0 22 11" stroke="#cbdcba" strokeWidth="2.5"/><circle cx="24" cy="12" r="4.5" fill="#f5eed8"/></g>
}
export function ExtraFloat({id}:{id:string}){
 if(id==='nyamnyam'||id==='swift')return <g data-skin-float={id}><path d="M0-12C-9-5-7 7 0 12C7 7 9-5 0-12Z" fill={id==='swift'?'#26364f':'#fff0d5'} stroke="#d9b66f"/><path d="M-5 0H5" stroke={id==='swift'?'#d9b66f':'#ed9975'} strokeWidth="5"/><path d="M0-18V-12" stroke="#d9b66f" strokeWidth="2"/></g>
 if(id==='siren')return <g data-skin-float={id}><ellipse rx="6" ry="11" fill="#faf1dc" stroke="#b39559"/><path d="M-6 1H6" stroke="#4a9f99" strokeWidth="5"/><path d="M0-17V-10" stroke="#b39559" strokeWidth="2"/></g>
 if(id==='mukhyang')return <g data-skin-float={id}><path d="M0-18V-9" stroke="#ae5145" strokeWidth="3"/><ellipse rx="5.5" ry="10" fill="#f8f0dc" stroke="#818e80"/><path d="M-3-6Q4-2 0 5L3 7" fill="none" stroke="#303e3b" strokeWidth="3" strokeLinecap="round"/></g>
 if(id==='scrapisle')return <g data-skin-float={id}><path d="M-6-8Q0-12 6-8V8Q0 12-6 8Z" fill="#a6b592" stroke="#b48755"/><ellipse cy="-8" rx="6" ry="2.5" fill="#e2c795"/><path d="M-6 1H6" stroke="#548b72" strokeWidth="4"/></g>
 if(id==='cloudferry')return <CloudferryFloat/>
 if(id==='whitenight')return <g data-skin-float={id}><path d="M0-14 7-3 5 8 0 14-5 8-7-3Z" fill="#91d9ed" stroke="#eaf9ff"/><path d="m-7-3 7-11 7 11Z" fill="#f2fcff"/><path d="M0-14V14m-5-6 5 6 5-6" fill="none" stroke="#d9e4ee"/></g>
 if(id==='bluegrove')return <g data-skin-float={id}><ellipse rx="6" ry="10" fill="#f4ead5" stroke="#d9e3e5"/><path d="M-6 0Q0 3 6 0L0 10Z" fill="#2468af"/><path d="M-6-2H6" stroke="#39b6c6" strokeWidth="4"/></g>
 if(id==='primal')return <g data-skin-float={id}><ellipse rx="6" ry="10" fill="#daa044" stroke="#f8dfaa"/><path d="M-5 1H5" stroke="#617548" strokeWidth="3"/><path d="M0-15V-9" stroke="#ead5a4" strokeWidth="2"/></g>
 if(id==='starruins')return <g data-skin-float={id}><path d="m0-13 5 7v14l-5 4-5-4V-6Z" fill="#a8c5bd" stroke="#e6c992"/><path d="M-4 0H4" stroke="#4c858d" strokeWidth="3"/><path d="m0-22 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#f0d99b"/></g>
 if(id==='dreamabyss')return <g data-skin-float={id}><path d="M0-12C-9-5-7 7 0 12C7 7 9-5 0-12Z" fill="#7960b0" stroke="#a7dcea"/><path d="M-2 7Q5 0-2-7" fill="none" stroke="#a3e8ee"/><path d="M0-12Q-5-18 2-22" fill="none" stroke="#92d9ed" strokeWidth="2"/></g>
 if(id==='lunea')return <g data-skin-float={id}><path d="M3-14A12 12 0 1 0 6 8A10 10 0 0 1 3-14Z" fill="#f6e2a9" stroke="#ffefc9"/><circle cy="-2" r="5" fill="#f5eafa" stroke="#cdbde8"/><path d="m-2 9-3 8 4-3m3-5 3 7-4-2" fill="#cbb5eb"/></g>
 return <g data-skin-float={id}><ellipse rx="6.5" ry="9" fill="#6baaa7" stroke="#dce9d3"/><path d="M-6-2Q-3-5 0-2T6-2M-6 3Q-3 0 0 3T6 3" fill="none" stroke="#fff0d4" strokeWidth="1.4"/><path d="M0-15v6" stroke="#f6e4b9" strokeWidth="2"/></g>
}
export function ExtraGrip({id}:{id:string}){
 if(id==='nyamnyam'||id==='swift')return <g data-skin-grip={id}><path d="M-5-14H5M-5-8H5M-5-2H5" stroke={id==='swift'?'#f4e4c3':'#ed9975'} strokeWidth="2"/><ellipse cy="6" rx="4" ry="6" fill={id==='swift'?'#d99935':'#fff0d5'} stroke="#d9b66f"/></g>
 if(id==='mukhyang')return <g data-skin-grip={id}><path d="M-5-17H5M-5-12H5M-5-7H5M-5-2H5" stroke="#f0e9d3" strokeWidth="2"/><path d="M0 2V8" stroke="#ad5146"/><rect x="-4" y="8" width="8" height="8" rx="1" fill="#ad5146"/><path d="M-2 10H2V14H-2Z" stroke="#f5e8d2" fill="none"/></g>
 if(id==='scrapisle')return <g data-skin-grip={id}><circle r="6" fill="#b88853" stroke="#e0bb84"/><circle r="2" fill="#548b72"/><path d="M0-9V-6M0 6V9M-9 0H-6M6 0H9" stroke="#b88853" strokeWidth="3"/></g>
 if(id==='whitenight')return <g data-skin-grip={id}>{[0,60,120].map(a=><path key={a} transform={`rotate(${a})`} d="M0-8V8m-3-12 3 3 3-3m-6 8 3-3 3 3" stroke="#eaf9ff" strokeWidth="1.5" fill="none"/>)}</g>
 if(id==='bluegrove')return <g data-skin-grip={id}><path d="M-3-10Q7-4 0 2T3 10" stroke="#83dcd7" strokeWidth="3" fill="none"/></g>
 if(id==='primal')return <g data-skin-grip={id}><ellipse rx="4" ry="7" fill="#db9e43" stroke="#ead5a4"/><path d="M0-4V4m0-2-2-2m2 0 2-2" stroke="#6b713e" fill="none"/></g>
 return <g data-skin-grip={id}>{id==='starruins'?<path d="m0-10 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#e3ca8d" stroke="#8d9e93"/>:id==='dreamabyss'?<path d="M-3-12Q6-6-2 0T2 12M1-10Q-6-4 2 3" fill="none" stroke="#a3d9ee" strokeWidth="2"/>:id==='lunea'?<><circle r="5" fill="#f3e6f6" stroke="#e3cb92"/><path d="M2-11A11 11 0 1 0 4 10A9 9 0 0 1 2-11Z" fill="#f6dfac"/></>:<path d="M-6-5Q-3-9 1-5T7-5M-6 1Q-3-3 1 1T7 1M-6 7Q-3 3 1 7T7 7" stroke="#e0ead0" fill="none" strokeWidth="2"/>}</g>
}
