import Phaser from 'phaser'
import {crimsonEmission,crimsonEmissionColor} from './crimson-emission'

export class CrimsonEmissionRenderer {
  private light?:Phaser.GameObjects.Sprite
  private scene:Phaser.Scene
  constructor(scene:Phaser.Scene){this.scene=scene}
  draw(body:Phaser.GameObjects.Sprite,time:number,seed:number,reduced:boolean){
    const alpha=crimsonEmission(time,seed,reduced)
    if(!this.light&&alpha>0){
      const light=this.scene.add.sprite(body.x,body.y,body.texture.key,body.frame.name)
        .setTint(crimsonEmissionColor).setTintMode(Phaser.TintModes.FILL).setBlendMode(Phaser.BlendModes.ADD)
      this.light=light
      if(this.scene.game.renderer.type===Phaser.WEBGL){
        light.enableFilters()
        light.filters!.external.addGlow(crimsonEmissionColor,1,0,1,false,6,6).setPaddingOverride(null)
      }
    }
    const light=this.light
    if(!light)return
    light.setVisible(body.visible&&alpha>0).setAlpha(alpha*body.alpha)
      .setTexture(body.texture.key,body.frame.name)
      .setOrigin(body.originX,body.originY).setPosition(body.x,body.y)
      .setScale(body.scaleX,body.scaleY).setRotation(body.rotation)
      .setFlip(body.flipX,body.flipY).setDepth(body.depth+.01)
  }
  destroy(){this.light?.destroy();this.light=undefined}
}
