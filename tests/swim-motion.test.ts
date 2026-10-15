import { expect, it } from 'vitest'
import { createSwimMotion } from '../src/features/aquarium/swim-motion'

it('occasionally rests in place and makes rare short bursts without position jumps',()=>{
 const counts={rest:0,dart:0,cruise:0}
 for(let seed=0;seed<100;seed++){
  const motion=createSwimMotion(`behavior-${seed}`,seed,.05)
  const point=motion(.5)
  counts[point.behavior as keyof typeof counts]++
  if(point.behavior==='rest'){
   expect(motion(1).x).toBe(point.x)
   expect(motion(1).y).toBe(point.y)
   expect(Math.abs(point.velocityX)).toBe(0)
   expect(Math.abs(point.velocityY)).toBe(0)
  }
  const before=motion(6-.0001),after=motion(6+.0001)
  expect(Math.abs(after.x-before.x)).toBeLessThan(.001)
  expect(Math.abs(after.y-before.y)).toBeLessThan(.001)
 }
 expect(counts.rest).toBeGreaterThan(10)
 expect(counts.dart).toBeGreaterThan(0)
 expect(counts.dart).toBeLessThan(counts.rest)
 expect(counts.cruise).toBeGreaterThan(counts.rest)
})

it('explores different heights with diagonal travel without rapid vertical movement', () => {
  const motion = createSwimMotion('diagonal-fish', 42, 0.05)
  const points = Array.from({ length: 121 }, (_, index) => motion(index))
  const heightRange=Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))
  expect(heightRange).toBeGreaterThan(0.01)
  expect(heightRange).toBeLessThanOrEqual(0.16)
  expect(points.some(p => Math.abs(p.velocityX) > 0.01 && Math.abs(p.velocityY) > 0.0001)).toBe(true)
  expect(points.every(p => Math.abs(p.velocityY) < 0.025)).toBe(true)
})

it('makes noticeable horizontal progress for every individual, including slow species', () => {
  for (let seed = 0; seed < 20; seed++) {
    const motion = createSwimMotion(`fish-${seed}`, seed, 0.03)
    const positions = Array.from({ length: 121 }, (_, index) => motion(index * 0.5).x)
    expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(0.4)
  }
})

it('gives individuals different routes even with the same species speed and seed', () => {
  const first = createSwimMotion('fish-a', 0, 0.05)
  const second = createSwimMotion('fish-b', 0, 0.05)
  expect([0, 10, 30, 60].map(first)).not.toEqual([0, 10, 30, 60].map(second))
  expect(createSwimMotion('fish-a', 0, 0.05)(30)).toEqual(first(30))
})

it('stays inside the tank and remains continuous across route changes', () => {
  for (const speed of [0.03, 0.085, 0.5]) {
    const motion = createSwimMotion('fish', 999999, speed)
    for (let time = 0; time < 180; time += 0.05) {
      const point = motion(time), next = motion(time + 0.001)
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(1)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(1)
      expect(Math.abs(next.x - point.x)).toBeLessThan(0.001)
      expect(Math.abs(next.y - point.y)).toBeLessThan(0.001)
    }
  }
})

it('uses shallow depth changes with continuous position at course and behavior boundaries',()=>{
 for(const seed of [0,42,240000,999999]){
  const route=createSwimMotion('sea-crocodile',seed,.045)
  const points=Array.from({length:1801},(_,i)=>route(i*.1))
  expect(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))).toBeLessThan(.081)
  for(let i=1;i<points.length;i++)expect(Math.abs(points[i].y-points[i-1].y)).toBeLessThan(.001)
 }
})
