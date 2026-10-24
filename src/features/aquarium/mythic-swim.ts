import additionalSheets from './mythic-action-layouts.json'
import sharedMythicSheets from './shared-mythic-action-layouts.json'
import nyamnyamMythicSheets from './nyamnyam-mythic-action-layouts.json'
import primalMythicSheets from './primal-mythic-action-layouts.json'
import halloweenMythicSheets from './halloween-mythic-action-layouts.json'
import {halloweenMythicFrame} from './halloween-spirits'
import {sharedDecorationColumns,sharedDecorationAsset} from './shared-decoration-animation'
export function mythicSheetColumns(path:string){return sharedDecorationColumns(path)??(mythicDetailedPaths.includes(path)?4:2)}
export const luneaDetailedSwimPath='fish/mythic/lunea-mistmoon-goddess_swim8_sprite.png'
type MythicSheet={id:string;aliases:string[];scale:number;shifts:number[][];cell:number;assetVersion?:number}
const sheets:MythicSheet[]=[
 ...halloweenMythicSheets,
 ...primalMythicSheets,
 ...nyamnyamMythicSheets,
 ...sharedMythicSheets,
 ...additionalSheets,
 {id:'scrap-greenark-last-collector',aliases:['scrap-greenark-last-collector'],scale:1,cell:444,shifts:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,-1],[0,-1]]},
 {id:'cloud-howl-moving-castle',aliases:['cloud-howl-moving-castle'],scale:1,cell:444,shifts:[[0,0],[0,0],[0,0],[-1,0],[0,0],[0,0],[0,0],[-1,0]]},
 {id:'mammor-frozen-memory',aliases:['mammor-frozen-memory'],scale:1,cell:443.5,shifts:[[0,0],[1.5,0],[0,0],[-0.5,0],[0,-2.5],[1.5,-4.5],[1,-2.5],[-0.5,-0.5]]},
 {id:'nivella-snowflake-dancer',aliases:['nivella-snowflake-dancer'],scale:1,cell:443.5,shifts:[[0,0],[-6.5,1],[-5,4],[-7.5,1],[-1,-7.5],[-2.5,-13.5],[-9,-9.5],[-5.5,0.5]]},
 {id:'plios-blackwave-king',aliases:['plios-blackwave-king'],scale:1,cell:443.5,shifts:[[0,0],[2.5,-1],[-3,0],[-13.5,-1],[1,-31.5],[3.5,-31.5],[-2,-32.5],[-13.5,-33.5]]},
 {id:'lunea-mistmoon-goddess',aliases:['lunea-mistmoon-goddess'],scale:1.15,cell:443.5,shifts:[[0,0],[1,0],[2,1],[-7,1],[-6,-36],[0,-36],[3,-36],[3,-36]]},
 {id:'atlantean-sentinel',aliases:['atlantean-sentinel','atlantean-sentinel-walk','atlantean-sentinel-standing'],scale:1.04,cell:443.5,shifts:[[0,0],[-18.5,0],[-36,0],[-36.5,0],[0,-13.5],[-18.5,-13.5],[-36,-13.5],[-35.5,-13.5]]},
 {id:'pongi-explorer',aliases:['pongi-explorer','pongi-explorer-cruise'],scale:1,cell:443.5,shifts:[[0,0],[-5.5,0],[-15,-1],[-21.5,0],[0,-46.5],[-5.5,-45.5],[-14,-46.5],[-21.5,-45.5]]},
 {id:'ancient-coral-giant-crab',aliases:['ancient-coral-giant-crab','ancient-coral-giant-crab-walk'],scale:1,cell:443.5,shifts:[[0,0],[-2.5,-1],[-2,0],[-2.5,0],[0,-28.5],[-0.5,-28.5],[-1,-28.5],[-2.5,-28.5]]},
 {id:'dawn-narwhal',aliases:['dawn-narwhal'],scale:1,cell:443.5,shifts:[[0,0],[0.5,0],[1,0],[-0.5,0],[0,-54.5],[-0.5,-53.5],[1,-52.5],[0.5,-52.5]]},
 {id:'seila-white-sail-guardian',aliases:['seila-white-sail-guardian'],scale:1.2,cell:443.5,shifts:[[0,0],[8.5,-1],[-2,0],[-0.5,0],[3,-6.5],[11.5,-6.5],[-4,-6.5],[-2.5,-9.5]]},
]
export const mythicDetailedPaths=sheets.map(s=>`fish/mythic/${s.id}_swim8_sprite.png`)
const sheetFor=(path:string)=>sheets.find(s=>path===`fish/mythic/${s.id}_swim8_sprite.png`)
export function mythicSwimAsset(path:string,rarity:string){
 if(rarity!=='mythic')return null
 const decoration=sharedDecorationAsset(path)
 if(decoration)return decoration
 const canonical=path.replace('_compat_sprite.png','_sprite.png')
 const sheet=sheets.find(s=>canonical===`fish/mythic/${s.id}_swim8_sprite.png`||s.aliases.some(alias=>canonical===`fish/mythic/${alias}_sprite.png`))
 return sheet?{path:`fish/mythic/${sheet.id}_swim8_sprite.png`,url:`/aquarium/swim/${sheet.id}${sheet.assetVersion?`_swim8_v${sheet.assetVersion}_sprite.png`:sheet.id==='extinction-defying-megalodon'||sharedMythicSheets.some(s=>s.id===sheet.id)?'_swim8_v2_sprite.png':'_swim8_sprite.png'}`}:null
}
export function mythicSwimFrame(path:string,time:number,seed:number,reduced=false){
 if(!sheetFor(path))return null
 // A short glance is part of the swim loop, independent of travel direction.
 if(reduced)return 0
 const halloweenFrame=halloweenMythicFrame(path,time,seed)
 if(halloweenFrame!==null)return halloweenFrame
 const phase=((time+seed/1000000)%6+6)%6
 if([...sharedMythicSheets,...nyamnyamMythicSheets,...primalMythicSheets].some(s=>path===`fish/mythic/${s.id}_swim8_sprite.png`)){
  // Reversible propulsion for four seconds, then anticipation, action, return,
  // recovery. The recovery drawing matches the next cycle's neutral pose.
  return phase<4?[0,1,2,3,2,1][Math.floor(phase*3)%6]:4+Math.min(3,Math.floor((phase-4)*2))
 }
 if(path==='fish/mythic/siren-skalla-six-shadows_swim8_sprite.png'){
  // Reverse each tail beat and unwind the guarding heads before returning to
  // swimming. Direct 3->0 and 7->0 jumps skip the intermediate neck/tail poses.
  const cycle=[0,1,2,3,2,1,0,1,2,3,2,1,0,4,5,6,7,6,5,4,0,1,2,1]
  return cycle[Math.min(cycle.length-1,Math.floor(phase*4))]
 }
 if(path==='fish/mythic/extinction-defying-megalodon_swim8_sprite.png'){
  // Reverse the tail beat instead of snapping from its last pose to the first.
  if(phase<4.2)return [0,1,2,3,2,1][Math.floor(phase*2.5)%6]
  // The rebuilt jaw stays anatomically hinged: open, threaten, close, recover.
  const bite=(phase-4.2)/1.8
  return bite<.2?4:bite<.43?5:bite<.68?6:7
 }
 const actionDuration=path==='fish/mythic/never-return-ghost-ship_swim8_sprite.png'?2.4:undefined
 if(actionDuration!==undefined){
  const actionStart=6-actionDuration
  return phase<actionStart?Math.floor(phase*3)%4:4+Math.min(3,Math.floor((phase-actionStart)/actionDuration*4))
 }
 if(path==='fish/mythic/scrap-greenark-last-collector_swim8_sprite.png'){
  return phase<4?Math.floor(phase*3)%4:4+Math.min(3,Math.floor((phase-4)*2))
 }
 return phase<10/3?Math.floor(phase*3)%4:Math.min(7,Math.floor((phase-10/3)*3))
}
export function mythicSwimLayout(path:string,frame=0){
 const sheet=sheetFor(path)
 if(!sheet)return null
 // Chest patch registration against frame 0, in source-cell pixels.
 // Hair/tail extents and the head glance must not determine the body anchor.
 const [x,y]=sheet.shifts[frame]??[0,0]
 return {originX:.5+x/sheet.cell,originY:.5+y/sheet.cell,scale:sheet.scale}
}
