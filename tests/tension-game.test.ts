import { expect,it } from 'vitest'
import { fishingFightSeconds,fishBehavior,fishForce,fishMood,newTensionGame,stepTensionGame } from '@/features/fishing/tension-game'

function play(mode:'always'|'never'|'responsive',fps=60){
 let s=newTensionGame(()=>.5)
 for(let i=0;i<fps*40&&s.phase!=='won'&&s.phase!=='lost';i++){
  s=stepTensionGame(s,1/fps,mode==='always'||mode==='responsive'&&s.tension<65)
 }
 return s
}
it('waits between three and five seconds without changing tension or distance',()=>{
 expect(newTensionGame(()=>0).wait).toBe(3);expect(newTensionGame(()=>1).wait).toBe(5)
 const s=stepTensionGame(newTensionGame(()=>0),.25,true)
 expect(s).toMatchObject({phase:'waiting',progress:.12,tension:38})
})
it('rewards responding to the warning and surge, at different frame rates',()=>{
 for(const fps of [30,60,120])expect(play('responsive',fps).phase).toBe('won')
 expect(Math.abs(play('responsive',30).time-play('responsive',120).time)).toBeLessThan(.15)
})
it('loses when continuously pulling or leaving slack, without an instant threshold failure',()=>{
 expect(play('always')).toMatchObject({phase:'lost',reason:'snap'})
 expect(play('never')).toMatchObject({phase:'lost',reason:'slack'})
 const s={...newTensionGame(),phase:'playing' as const,time:2.6,tension:99}
 expect(stepTensionGame(s,.1,true).phase).toBe('playing')
})
it('has a warning before every surge and keeps completed games immutable',()=>{
 for(let seed=1;seed<=20;seed++){let previous=fishMood(0,seed);for(let t=.01;t<12;t+=.01){const mood=fishMood(t,seed);if(mood==='surge'&&previous!=='surge')expect(previous).toBe('warning');previous=mood}}
 const s=play('responsive');expect(stepTensionGame(s,.2,true)).toBe(s)
})

it('varies patterns between casts and raises tension faster while pulling',()=>{expect(Array.from({length:100},(_,i)=>fishMood(i*.1,1))).not.toEqual(Array.from({length:100},(_,i)=>fishMood(i*.1,2)));const state={...newTensionGame(()=>.5),phase:'playing' as const,time:0};expect(stepTensionGame(state,.25,true).tension-state.tension).toBeGreaterThan(5)})

it('never wins a pre-drawn failed cast even when reeled all the way in',()=>{let s=newTensionGame(()=>.5,{failureAt:7,failureReason:'bait'});s={...s,phase:'playing',progress:.999,tension:40};expect(stepTensionGame(s,.1,true).phase).toBe('playing');expect(stepTensionGame({...s,time:6.95},.1,true)).toMatchObject({phase:'lost',reason:'bait'})})
it('drains faster with rarity while keeping every tier winnable with controlled input',()=>{
 const tiers=['common','rare','epic','mythic'] as const;let previous=0
 for(const rarity of tiers){const start={...newTensionGame(()=>.5,{rarity}),phase:'playing' as const};const delta=start.tension-stepTensionGame(start,.2,false).tension;expect(delta).toBeGreaterThan(previous);previous=delta
 for(let seed=1;seed<=500;seed++){let s={...newTensionGame(()=>.5,{rarity}),seed};let pulling=false;for(let f=0;f<2400&&!['won','lost'].includes(s.phase);f++){if(f%12===0){pulling=s.tension<65}s=stepTensionGame(s,1/60,pulling)}expect(s.phase,'tier '+rarity+' seed '+seed).toBe('won')}
 }
})

it('starts with a fish pull that drains the gauge, while holding restores it',()=>{
 for(const rarity of ['common','rare','epic','mythic'] as const){const s={...newTensionGame(()=>.5,{rarity}),phase:'playing' as const,time:0};expect(fishMood(0,s.seed,rarity)).toBe('surge');expect(stepTensionGame(s,.1,false).tension).toBeLessThan(s.tension);expect(stepTensionGame(s,.1,true).tension).toBeGreaterThan(stepTensionGame(s,.1,false).tension)}
})
it('releasing near the upper limit lowers the gauge instead of snapping',()=>{let s={...newTensionGame(()=>.5,{rarity:'mythic'}),phase:'playing' as const,tension:90};for(let i=0;i<30;i++)s=stepTensionGame(s,1/60,false);expect(s.phase).toBe('playing');expect(s.tension).toBeLessThan(95)})

it('allows recovery at zero and fails after 1.5 seconds at zero',()=>{let s={...newTensionGame(()=>.5,{rarity:'mythic'}),phase:'playing' as const,tension:0};s=stepTensionGame(s,.25,false);expect(s.phase).toBe('playing');const recovered=stepTensionGame({...s,time:1.1},.1,true);expect(recovered.tension).toBeGreaterThan(0);expect(recovered.slack).toBe(0);for(let i=0;i<6;i++)s=stepTensionGame(s,.25,false);expect(s).toMatchObject({phase:'lost',reason:'slack'})})
it('epic and mythic surges can empty a full gauge within a second',()=>{for(const rarity of ['epic','mythic'] as const){let s={...newTensionGame(()=>.5,{rarity}),phase:'playing' as const,tension:100};for(let i=0;i<4;i++)s=stepTensionGame(s,.25,false);expect(s.tension).toBe(0);expect(s.phase).toBe('playing')}})

it('a strong fish keeps overpowering a held reel until its own surge subsides',()=>{
 for(const rarity of ['epic','mythic'] as const){const s={...newTensionGame(()=>.5,{rarity}),phase:'playing' as const,time:.2,tension:60};expect(stepTensionGame(s,.1,true).tension).toBeLessThan(60);const recovering={...s,time:1.4};expect(stepTensionGame(recovering,.1,true).tension).toBeGreaterThan(60);expect(stepTensionGame(s,.1,true).time).toBeCloseTo(stepTensionGame(s,.1,false).time)}
})
it('fish effort swells and eases without rerolling when the player presses',()=>{expect(fishForce(.2,50000,'mythic')).toBeGreaterThan(fishForce(.01,50000,'mythic'));expect(fishForce(.2,50000,'mythic')).toBe(fishForce(.2,50000,'mythic'))})

it('mixes short pulls and sustained multi-second struggles independent of holding',()=>{
 let shortest=100,longest=0
 for(let seed=1;seed<=30;seed++){let run=0;for(let t=0;t<22;t+=.025){if(fishMood(t,seed)==='surge')run+=.025;else if(run){shortest=Math.min(shortest,run);longest=Math.max(longest,run);run=0}}}
 expect(shortest).toBeLessThan(1.2);expect(longest).toBeGreaterThan(3)
})

it('finishes controlled fights at 10/14/18/22 seconds and pre-drawn failures at six',()=>{
 for(const rarity of ['common','rare','epic','mythic'] as const){let s=newTensionGame(()=>.5,{rarity,wait:0});for(let i=0;i<2400&&!['won','lost'].includes(s.phase);i++)s=stepTensionGame(s,1/60,s.tension<65);expect(s.phase).toBe('won');expect(s.time).toBeCloseTo(fishingFightSeconds[rarity],1)}
 let s=newTensionGame(()=>.5,{failureAt:6,wait:0});for(let i=0;i<600&&!['won','lost'].includes(s.phase);i++)s=stepTensionGame(s,1/60,s.tension<65);expect(s.phase).toBe('lost');expect(s.time).toBeCloseTo(6,1)
})
it('makes the same seeded sustained pull last longer at higher tiers',()=>{const lengths:number[]=[];for(const rarity of ['common','rare','epic','mythic'] as const){let length=0;for(let time=1;time<30;time+=.01){if(fishBehavior(time,42,rarity).index===4)length+=.01}lengths.push(length)}for(let i=1;i<lengths.length;i++)expect(lengths[i]).toBeGreaterThan(lengths[i-1])})

it('allows both gauge extremes for less than 1.5 seconds',()=>{
 const low={...newTensionGame(()=>.5),phase:'playing' as const,tension:0,slack:1.3};expect(stepTensionGame(low,.1,false).phase).toBe('playing');expect(stepTensionGame(low,.25,false)).toMatchObject({phase:'lost',reason:'slack'})
 const high={...newTensionGame(()=>.5),phase:'playing' as const,tension:100,danger:1.3};expect(stepTensionGame(high,.1,true).phase).toBe('playing');expect(stepTensionGame(high,.25,true)).toMatchObject({phase:'lost',reason:'snap'})
})
