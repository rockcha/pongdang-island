import type {ProductionFacility} from './api'
export function productionStatus(site:ProductionFacility,now:number){
 if(!site.startedAt)return 'idle' as const
 if(now>=Date.parse(site.expiresAt!))return 'expired' as const
 if(now>=Date.parse(site.completesAt!))return 'ready' as const
 return 'working' as const
}
export function remainingTime(until:string,now:number){const seconds=Math.max(0,Math.ceil((Date.parse(until)-now)/1000)),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60);return h?`${h}시간 ${m}분`:m?`${m}분 ${seconds%60}초`:`${seconds}초`}
