import type { FishingAttempt } from './api'
import { useEffect } from 'react'

const prefix='pongdang:fishing-trip:'
export const fishingTripKey=(userId:string)=>prefix+userId

export function readFishingTrip(userId:string):FishingAttempt[]{
 try{
  const data:unknown=JSON.parse(localStorage.getItem(fishingTripKey(userId))??'[]')
  return Array.isArray(data)?data.filter((item):item is FishingAttempt=>!!item&&typeof item.operation_id==='string'&&typeof item.species?.id==='string'&&typeof item.species?.name==='string'&&['common','rare','epic','mythic'].includes(item.species?.rarity)):[]
 }catch{return []}
}

export function recordFishingCatch(userId:string,attempt:FishingAttempt){
 const previous=readFishingTrip(userId)
 if(!attempt.species||previous.some(item=>item.operation_id===attempt.operation_id))return previous
 const next=[attempt,...previous]
 try{localStorage.setItem(fishingTripKey(userId),JSON.stringify(next))}catch{/* The current screen can still show the catch when storage is unavailable. */}
 return next
}

export function clearFishingTrip(userId:string){
 try{localStorage.removeItem(fishingTripKey(userId))}catch{/* Storage may be disabled. */}
}

export function isFishingTripRoute(pathname:string){
 return /^\/(region|sailing)\/[^/]+\/?$/.test(pathname)
}

export function useFishingTripRoute(userId:string|undefined,pathname:string){
 useEffect(()=>{if(userId&&!isFishingTripRoute(pathname))clearFishingTrip(userId)},[pathname,userId])
}
