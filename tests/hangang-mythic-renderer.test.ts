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
