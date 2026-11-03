// @vitest-environment node
import {expect,it} from 'vitest'
import {landingSegment,pointerStep,rouletteSegments,rotationProgress,segmentCenter,rouletteSpinDuration} from '../src/features/relic-roulette/model'
it('matches wheel area to outcome odds and lands each result under the pointer',()=>{
 const weights={none:0,rare:0,epic:0,mythic:0}
 for(const segment of rouletteSegments)weights[segment.kind]+=segment.weight
 expect(rouletteSegments).toHaveLength(4)
 expect(weights).toEqual({none:60,rare:34,epic:5,mythic:1})
 for(const grade of ['none','rare','epic','mythic'] as const){
  const index=landingSegment(grade,'an-operation'),segment=rouletteSegments[index]
  expect(segment.kind).toBe(grade)
  expect(segmentCenter(index)).toBeGreaterThan(0);expect(segmentCenter(index)).toBeLessThan(360)
 }
})
it('stops at the audio duration with decreasing angular speed',()=>{
 expect(rotationProgress(0)).toBe(0)
 expect(rotationProgress(rouletteSpinDuration)).toBe(1)
 expect(rotationProgress(rouletteSpinDuration+1000)).toBe(1)
 const before=rotationProgress(1000)-rotationProgress(900)
 const after=rotationProgress(3000)-rotationProgress(2900)
 expect(before).toBeGreaterThan(after)
})
it('lets the pointer rebound and settle without accumulating energy at low frame rates',()=>{
 let state={angle:-20,velocity:-150},crossed=false
 for(let i=0;i<180;i++){state=pointerStep(state.angle,state.velocity,i%7===0?90:16);if(state.angle>0)crossed=true}
 expect(crossed).toBe(true)
 expect(Math.abs(state.angle)).toBeLessThan(.001)
 expect(Math.abs(state.velocity)).toBeLessThan(.001)
})
