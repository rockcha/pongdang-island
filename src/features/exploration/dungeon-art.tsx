import doorsA from './assets/doors-a.png'
import doorsB from './assets/doors-b.png'
import doorsC from './assets/doors-c.png'
import sandstone from './assets/tomb-sandstone.png'
import lapis from './assets/tomb-lapis.png'
import overgrown from './assets/tomb-overgrown.png'
import alignment from './assets/door-alignment.json'

export const doorSkins=[
 {name:'태양의 문',sheet:doorsA,row:0,weight:1},
 {name:'청록 풍뎅이의 문',sheet:doorsA,row:1,weight:1},
 {name:'붉은 앙크의 문',sheet:doorsA,row:2,weight:1},
 {name:'청금석 별의 문',sheet:doorsA,row:3,weight:1},
 {name:'비취 코브라의 문',sheet:doorsB,row:0,weight:1},
 {name:'보랏빛 달의 문',sheet:doorsB,row:1,weight:1},
 {name:'상아 연꽃의 문',sheet:doorsB,row:2,weight:1},
 {name:'검은 호루스의 문',sheet:doorsB,row:3,weight:1},
 {name:'구릿빛 태양의 문',sheet:doorsC,row:0,weight:1},
 {name:'청록 수정의 문',sheet:doorsC,row:1,weight:1},
] as const
export const dungeonBackgrounds=[sandstone,lapis,overgrown] as const
export function drawFloorArt(random= Math.random){
 const total=doorSkins.reduce((sum,skin)=>sum+skin.weight,0)
 function drawDoor(){let roll=random()*total;for(let i=0;i<doorSkins.length;i++){roll-=doorSkins[i].weight;if(roll<0)return i}return doorSkins.length-1}
 return {doors:[drawDoor(),drawDoor(),drawDoor()],background:Math.min(dungeonBackgrounds.length-1,Math.floor(random()*dungeonBackgrounds.length))}
}
export function DoorSprite({skin,opening=false}:{skin:number;opening?:boolean}){
 const art=doorSkins[skin]
 const sheet=alignment[Math.floor(skin/4)]
 return <span className={`exploration-door-sprite ${opening?'is-opening':''}`} data-skin={skin} aria-hidden="true">{sheet.frames[art.row].map((frame,index)=><span key={index} className={`exploration-door-frame frame-${index}`} style={{aspectRatio:`${frame.width}/${frame.height}`,backgroundImage:`url(${art.sheet})`,backgroundSize:`${sheet.width/frame.width*100}% ${sheet.height/frame.height*100}%`,backgroundPosition:`${frame.x/(sheet.width-frame.width)*100}% ${frame.y/(sheet.height-frame.height)*100}%`}}/>)}</span>
}
