import {topviewItems,type TopviewObject} from './topview-model'
import {farmUpgradeArt} from './upgrade-art'
import {FarmStatusBubble} from './status-bubble'
import {farmWorkPosition} from './work-status'

export function BuildingUpgradeEffect({object,job,now,onActivate}:{object:TopviewObject;job:{startedAt:number;readyAt:number};now:number;onActivate?:()=>void}){
 const duration=job.readyAt-job.startedAt,progress=duration>0?(now-job.startedAt)/duration:1
 return <g data-building-upgrade={object.id}><FarmStatusBubble {...farmWorkPosition(object)} label={`${topviewItems[object.kind].name} 업그레이드`} progressLabel="건물 업그레이드 진행" progress={progress} remaining={Math.max(0,(job.readyAt-now)/1000)} ready={now>=job.readyAt} onActivate={onActivate}>
  <image className="farm-upgrade-map-art" href={farmUpgradeArt} x="-15" y="-15" width="30" height="30"/>
 </FarmStatusBubble></g>
}
