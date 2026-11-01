import type Phaser from 'phaser'
import {hangangMythicPaths} from './hangang-mythic-effects'
export class HangangMythicRenderer{
 private graphics:Phaser.GameObjects.Graphics
 private bucket=-1
 constructor(scene:Phaser.Scene){this.graphics=scene.add.graphics()}
 draw(id:string,time:number,seed:number,reduced:boolean,body:Phaser.GameObjects.Sprite){
  const bucket=reduced?0:Math.floor(time*30),g=this.graphics
  if(bucket!==this.bucket){
   this.bucket=bucket;g.clear()
   for(const path of hangangMythicPaths(id,time,seed,reduced)){
    g.lineStyle(path.width,path.color,path.alpha);g.fillStyle(path.color,path.alpha);g.beginPath()
    path.points.forEach(([x,y],i)=>{const px=x-body.originX,py=y-body.originY;if(i)g.lineTo(px,py);else g.moveTo(px,py)})
    if(path.closed)g.closePath();if(path.fill)g.fillPath();else g.strokePath()
   }
  }
  g.setPosition(body.x,body.y).setRotation(body.rotation).setScale(body.displayWidth*(body.flipX?-1:1),body.displayHeight).setDepth(body.depth+.02).setAlpha(body.alpha).setVisible(body.visible)
 }
 destroy(){this.graphics.destroy()}
}
