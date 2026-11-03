import {TILE,topviewItems,type TopviewObject} from './topview-model'
import {FarmStatusBubble,StatusGlyph} from './status-bubble'
export function BuildingUpgradeEffect({object,job,now}:{object:TopviewObject;job:{startedAt:number;readyAt:number};now:number}){
 const item=topviewItems[object.kind]
 return <g data-building-upgrade={object.id}><FarmStatusBubble x={(object.x+item.w/2)*TILE} y={object.y*TILE-18} label="건물 업그레이드 진행" progress={(now-job.startedAt)/(job.readyAt-job.startedAt)} remaining={Math.max(0,(job.readyAt-now)/1000)}><StatusGlyph kind="hammer"/></FarmStatusBubble></g>
}
