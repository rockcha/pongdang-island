import {expect,it,vi} from 'vitest'
import type Phaser from 'phaser'
import {HangangMythicRenderer} from '@/features/aquarium/hangang-mythic-renderer'
it('clears both effect layers when reduced motion is enabled during the first animation tick',()=>{
 const buffers=Array.from({length:2},()=>Object.fromEntries(['clear','lineStyle','fillStyle','beginPath','lineTo','moveTo','closePath','fillPath','strokePath','setPosition','setRotation','setScale','setDepth','setAlpha','setVisible','destroy'].map(k=>[k,vi.fn().mockReturnThis()])))
 let next=0
 const scene={add:{graphics:()=>buffers[next++]}} as unknown as Phaser.Scene
 const renderer=new HangangMythicRenderer(scene)
 const body={originX:.5,originY:.5,x:100,y:100,rotation:0,displayWidth:170,displayHeight:170,flipX:false,depth:1,alpha:1,visible:true} as Phaser.GameObjects.Sprite
 renderer.draw('hangang-red-cheer-incarnation',.01,0,false,body)
 expect(buffers[1].strokePath).toHaveBeenCalled()
 renderer.draw('hangang-red-cheer-incarnation',.01,0,true,body)
 for(const b of buffers)expect(b.clear).toHaveBeenCalledTimes(2)
 renderer.destroy()
 for(const b of buffers)expect(b.destroy).toHaveBeenCalledOnce()
})
it('keeps Hangul upright when a fish turns left, including during a cached render tick',()=>{
 const buffers=Array.from({length:2},()=>Object.fromEntries(['clear','lineStyle','fillStyle','beginPath','lineTo','moveTo','closePath','fillPath','strokePath','fillTriangle','setPosition','setRotation','setScale','setDepth','setAlpha','setVisible','destroy'].map(k=>[k,vi.fn().mockReturnThis()])))
 let next=0
 const renderer=new HangangMythicRenderer({add:{graphics:()=>buffers[next++]}} as unknown as Phaser.Scene)
 const body={originX:.5,originY:.5,x:100,y:100,rotation:0,displayWidth:170,displayHeight:170,flipX:false,depth:1,alpha:1,visible:true} as Phaser.GameObjects.Sprite
 renderer.draw('hangang-hunmin-spirit',11,0,false,body)
 const first=buffers[1].fillTriangle.mock.calls[0],count=buffers[1].fillTriangle.mock.calls.length
 expect(count).toBeGreaterThan(0)
 body.flipX=true;renderer.draw('hangang-hunmin-spirit',11,0,false,body)
 const mirrored=buffers[1].fillTriangle.mock.calls[count]
 const area=(p:number[])=>(p[2]-p[0])*(p[5]-p[1])-(p[4]-p[0])*(p[3]-p[1])
 expect(area(mirrored)*-1).toBeCloseTo(area(first),8)
 expect(buffers[1].clear).toHaveBeenCalledTimes(2)
 renderer.destroy()
})
