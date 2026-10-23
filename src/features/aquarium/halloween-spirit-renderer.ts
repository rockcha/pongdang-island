import type Phaser from 'phaser'
import {halloweenSpiritUrl,halloweenSpirits} from './halloween-spirits'

const key='effect:halloween-spirit'
/** One shared texture, two noninteractive sprites per creature, no per-frame loads. */
export class HalloweenSpiritRenderer {
 private sprites:Phaser.GameObjects.Image[]=[]
 private scene:Phaser.Scene
 constructor(scene:Phaser.Scene){this.scene=scene}
 static queue(scene:Phaser.Scene){
  if(!scene.textures.exists(key))scene.load.image(key,halloweenSpiritUrl)
 }
 draw(id:string,time:number,seed:number,reduced:boolean,body:Phaser.GameObjects.Sprite,size:number){
  if(!this.scene.textures.exists(key))return
  const poses=halloweenSpirits(id,time,seed,reduced)
  const radians=body.rotation,c=Math.cos(radians),s=Math.sin(radians)
  poses.forEach((pose,index)=>{
   const sprite=this.sprites[index]??(this.sprites[index]=this.scene.add.image(0,0,key).setAlpha(.88))
   const x=pose.x*size*(body.flipX?-1:1),y=pose.y*size
   sprite.setPosition(body.x+x*c-y*s,body.y+x*s+y*c)
    .setDisplaySize(size*pose.size,size*pose.size)
    .setAngle(body.angle+pose.angle).setFlipX(body.flipX)
    .setDepth(body.depth+(pose.front ? .1 : -.1))
  })
 }
 destroy(){this.sprites.forEach(sprite=>sprite.destroy());this.sprites=[]}
}
