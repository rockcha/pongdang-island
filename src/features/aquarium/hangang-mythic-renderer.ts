import type Phaser from 'phaser'
import {hangangMythicPaths} from './hangang-mythic-effects'
export class HangangMythicRenderer{
 private back:Phaser.GameObjects.Graphics
 private front:Phaser.GameObjects.Graphics
 private bucket=''
 constructor(scene:Phaser.Scene){this.back=scene.add.graphics();this.front=scene.add.graphics()}
 draw(id:string,time:number,seed:number,reduced:boolean,body:Phaser.GameObjects.Sprite){
  const bucket=reduced?'reduced':String(Math.floor(time*30))
  if(bucket!==this.bucket){
   this.bucket=bucket;this.back.clear();this.front.clear()
   for(const path of hangangMythicPaths(id,time,seed,reduced)){
    const g=path.layer==='back'?this.back:this.front
    g.lineStyle(path.width,path.color,path.alpha);g.fillStyle(path.color,path.alpha);g.beginPath()
    path.points.forEach(([x,y],i)=>{const px=x-body.originX,py=y-body.originY;if(i)g.lineTo(px,py);else g.moveTo(px,py)})
    if(path.closed)g.closePath();if(path.fill)g.fillPath();else g.strokePath()
   }
  }
  for(const [g,offset] of [[this.back,-.02],[this.front,.02]] as const)g.setPosition(body.x,body.y).setRotation(body.rotation).setScale(body.displayWidth*(body.flipX?-1:1),body.displayHeight).setDepth(body.depth+offset).setAlpha(body.alpha).setVisible(body.visible)
 }
 destroy(){this.back.destroy();this.front.destroy()}
}
