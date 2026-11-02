import type Phaser from 'phaser'
import {hangangMythicPaths} from './hangang-mythic-effects'
export class HangangMythicRenderer{
 private back:Phaser.GameObjects.Graphics
 private front:Phaser.GameObjects.Graphics
 private bucket=''
 constructor(scene:Phaser.Scene){this.back=scene.add.graphics();this.front=scene.add.graphics()}
 draw(id:string,time:number,seed:number,reduced:boolean,body:Phaser.GameObjects.Sprite){
  const bucket=reduced?'reduced':`${Math.floor(time*30)}:${body.flipX}`
  if(bucket!==this.bucket){
   this.bucket=bucket;this.back.clear();this.front.clear()
   for(const path of hangangMythicPaths(id,time,seed,reduced)){
    const g=path.layer==='back'?this.back:this.front
    const px=(x:number)=>((body.flipX&&path.glyphCenter?2*path.glyphCenter[0]-x:x)-body.originX)
    g.lineStyle(path.width,path.color,path.alpha);g.fillStyle(path.color,path.alpha);g.beginPath()
    if(path.mesh){for(const t of path.mesh)g.fillTriangle(px(t[0][0]),t[0][1]-body.originY,px(t[1][0]),t[1][1]-body.originY,px(t[2][0]),t[2][1]-body.originY);continue}
    path.points.forEach(([x,y],i)=>{const py=y-body.originY;if(i)g.lineTo(px(x),py);else g.moveTo(px(x),py)})
    if(path.closed)g.closePath();if(path.fill)g.fillPath();else g.strokePath()
   }
  }
  for(const [g,offset] of [[this.back,-.02],[this.front,.02]] as const)g.setPosition(body.x,body.y).setRotation(body.rotation).setScale(body.displayWidth*(body.flipX?-1:1),body.displayHeight).setDepth(body.depth+offset).setAlpha(body.alpha).setVisible(body.visible)
 }
 destroy(){this.back.destroy();this.front.destroy()}
}
