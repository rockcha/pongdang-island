import {BrickPractice} from './brick-breaker-model'

export const BRICK_ENGINE_VERSION=1
export const BRICK_TICK=1/120
export type BrickInput={tick:number;action:'direction'|'launch'|'next';value?:-1|0|1}
export type BrickReplay={ticks:number;inputs:BrickInput[]}
export function brickRandom(seed:number){let state=seed>>>0;return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
export class BrickSession{
 readonly model:BrickPractice
 ticks=0;inputs:BrickInput[]=[];direction:-1|0|1=0;private accumulator=0
 constructor(seed:number){this.model=new BrickPractice(brickRandom(seed))}
 command(action:BrickInput['action'],value?:-1|0|1){
  if(action==='direction'&&value===this.direction)return
  if(this.inputs.length>=10000)throw new Error('INPUT_LIMIT')
  this.inputs.push({tick:this.ticks,action,...(value===undefined?{}:{value})});this.apply(action,value)
 }
 apply(action:BrickInput['action'],value?:-1|0|1){if(action==='direction')this.direction=value??0;else if(action==='launch')this.model.launch();else this.model.nextRound()}
 step(){if(this.direction)this.model.moveInput(this.model.paddleX+this.direction*420*BRICK_TICK,BRICK_TICK);this.model.step(BRICK_TICK);this.ticks++}
 advance(seconds:number){this.accumulator+=Math.max(0,Math.min(0.05,seconds));while(this.accumulator>=BRICK_TICK){this.step();this.accumulator-=BRICK_TICK}}
 replay():BrickReplay{return {ticks:this.ticks,inputs:this.inputs.map(input=>({...input}))}}
}
/** Inputs, movement speed, damage and rewards all use the same simulation as the browser. */
export function verifyBrickReplay(seed:number,replay:BrickReplay,elapsedSeconds:number){
 if(!replay||!Number.isInteger(replay.ticks)||replay.ticks<0||replay.ticks>216000||replay.ticks/120>elapsedSeconds+2||!Array.isArray(replay.inputs)||replay.inputs.length>10000)throw new Error('INVALID_REPLAY')
 const session=new BrickSession(seed);let previous=-1
 for(const input of replay.inputs){
  if(!Number.isInteger(input.tick)||input.tick<previous||input.tick>replay.ticks||!['direction','launch','next'].includes(input.action)||(input.action==='direction'&&![-1,0,1].includes(input.value!)))throw new Error('INVALID_INPUT')
  previous=input.tick
 }
 let index=0
 for(let tick=0;tick<=replay.ticks;tick++){
  while(index<replay.inputs.length&&replay.inputs[index].tick===tick){const input=replay.inputs[index++];session.apply(input.action,input.value)}
  if(tick<replay.ticks)session.step()
  session.model.drainImpacts();session.model.drainFeedback();session.model.drainSongs();session.model.drainAnchorSlams();session.model.drainTorpedoBlasts();session.model.drainPaddleHit()
 }
 return {score:session.model.secured,reward:session.model.reward,round:session.model.round,lives:session.model.lives}
}
