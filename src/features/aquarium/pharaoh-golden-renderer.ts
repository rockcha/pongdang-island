import type Phaser from 'phaser'
import {pharaohGoldenPaths} from './pharaoh-golden-effects'

/** One bounded, reusable graphics layer per creature; no timers or texture uploads. */
export class PharaohGoldenRenderer{
 private graphics:Phaser.GameObjects.Graphics
 private bucket=-1
 private signature=''
 constructor(scene:Phaser.Scene){this.graphics=scene.add.graphics()}
 draw(id:string,time:number,seed:number,reduced:boolean,body:Phaser.GameObjects.Sprite){
  const bucket=reduced?0:Math.floor(time*30),signature=`${seed}:${reduced}:${body.flipX}:${body.originX}:${body.originY}`
  const graphics=this.graphics
  if(bucket!==this.bucket||signature!==this.signature){
   this.bucket=bucket;this.signature=signature;graphics.clear()
   for(const path of pharaohGoldenPaths(id,time,seed,reduced)){
    graphics.lineStyle(path.width,path.color,path.alpha);graphics.fillStyle(path.color,path.alpha);graphics.beginPath()
    path.points.forEach(([x,y],i)=>{const px=(body.flipX?1-x:x)-body.originX,py=y-body.originY;if(i)graphics.lineTo(px,py);else graphics.moveTo(px,py)})
    if(path.closed)graphics.closePath()
    if(path.fill)graphics.fillPath();else graphics.strokePath()
   }
  }
  graphics.setPosition(body.x,body.y).setRotation(body.rotation).setScale(body.displayWidth,body.displayHeight).setDepth(body.depth+.02).setAlpha(body.alpha).setVisible(body.visible)
 }
 destroy(){this.graphics.destroy()}
}
