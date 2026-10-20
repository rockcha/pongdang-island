import {BRICK} from './brick-breaker-config'

export const BRICK_ROUNDS=[
 {minHp:2,maxHp:2,reward:30},
 {minHp:2,maxHp:3,reward:50},
 {minHp:3,maxHp:3,reward:70},
 {minHp:3,maxHp:4,reward:100},
 {minHp:4,maxHp:4,reward:150},
] as const
export const MAX_BRICK_ROUNDS=BRICK_ROUNDS.length
export function brickRound(round:number){return BRICK_ROUNDS[Math.max(0,Math.min(MAX_BRICK_ROUNDS-1,round-1))]}
export function roundBrickHp(round:number,id:number){
 const settings=brickRound(round)
 return (Math.floor(id/BRICK.columns)+id%BRICK.columns)%2===0?settings.minHp:settings.maxHp
}
