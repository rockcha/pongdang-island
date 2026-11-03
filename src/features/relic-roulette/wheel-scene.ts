import Phaser from 'phaser'
import {createGameAudio,type GameAudio} from '@/features/fishing/game-audio'
import {readFishingSound} from '@/features/fishing/sound-preference'
import {landingSegment,pointerStep,rouletteGrades,rouletteSegments,rouletteSpinDuration,rotationProgress,segmentCenter,segmentStart,type RouletteGrade} from './model'

export type WheelController={spin:(grade:RouletteGrade,operation:string)=>Promise<void>;destroy:()=>void}
const colors={none:0xe7d6c1,rare:0x78b7d8,epic:0xb18bd5,mythic:0xefbd58}
const ink={none:'#785b43',rare:'#244c66',epic:'#50356e',mythic:'#704811'}

export function mountRelicWheel(parent:HTMLElement,reducedMotion:boolean,readSound:()=>boolean=()=>false):WheelController{
  let scene:RelicWheel|undefined,destroyed=false,finish:(()=>void)|undefined,audio:GameAudio|undefined
  let resolveReady!:()=>void
  const ready=new Promise<void>(resolve=>{resolveReady=resolve})
  const stopAudio=()=>{audio?.pause();audio?.removeAttribute('src');audio=undefined}
  class RelicWheel extends Phaser.Scene{
    wheel!:Phaser.GameObjects.Container
    pointer!:Phaser.GameObjects.Container
    sections:Phaser.GameObjects.Container[]=[]
    labels:Phaser.GameObjects.Container[]=[]
    lamps:Phaser.GameObjects.Arc[]=[]
    lampGlows:Phaser.GameObjects.Arc[]=[]
    highlight!:Phaser.GameObjects.Graphics
    centerIcon?:Phaser.GameObjects.Image
    centerDetail!:Phaser.GameObjects.Text
    pointerAngle=0
    pointerVelocity=0
    running?:{grade:RouletteGrade;operation:string;start:number;from:number;distance:number;lastRotation:number;audioEnded:boolean}

    preload(){this.load.image('roulette-center-relic','/app-icons/relic.png')}
    create(){
      scene=this
      const cx=320,cy=310
      this.add.ellipse(cx,594,330,17,0x995e36,.07)
      this.add.circle(cx,cy,263,0xf7eddf).setStrokeStyle(1,0xe2ccb2)
      this.add.circle(cx,cy,254,0xfffbf5).setStrokeStyle(2,0xc19b72)
      this.wheel=this.add.container(cx,cy)
      for(const segment of rouletteSegments){
        const group=this.add.container(0,0),g=this.add.graphics()
        const from=Phaser.Math.DegToRad(segmentStart(segment.index)-90),to=Phaser.Math.DegToRad(segmentStart(segment.index)+segment.weight*3.6-90)
        g.fillStyle(colors[segment.kind]).beginPath().moveTo(0,0).arc(0,0,238,from,to).closePath().fillPath()
        // Thin boundaries preserve the true size of the smallest sector.
        g.lineStyle(.8,0xfffcf7,.95).beginPath().moveTo(0,0).lineTo(Math.cos(from)*238,Math.sin(from)*238).strokePath()
        group.add(g)
        if(segment.kind==='none'||segment.kind==='rare'){
          const a=Phaser.Math.DegToRad(segmentCenter(segment.index)-90)
          const caption=this.add.container(Math.cos(a)*155,Math.sin(a)*155)
          const label=this.add.text(0,0,rouletteGrades[segment.kind].label,{fontFamily:'"Gowun Dodum", sans-serif',fontSize:'31px',fontStyle:'bold',color:ink[segment.kind]}).setOrigin(.5)
          caption.add(label);group.add(caption)
          this.labels.push(caption)
        }
        this.sections.push(group);this.wheel.add(group)
      }
      // Small sectors are identified by matching colour keys beneath the wheel;
      // fitting text inside them would obscure their actual angular proportions.
      this.highlight=this.add.graphics();this.wheel.add(this.highlight)
      const rim=this.add.graphics().lineStyle(4,0xb08356).strokeCircle(0,0,242).lineStyle(1,0xfffcf7).strokeCircle(0,0,237)
      this.wheel.add(rim)
      for(let i=0;i<24;i++){
        const a=i*Math.PI/12
        this.wheel.add(this.add.circle(Math.cos(a)*248,Math.sin(a)*248,2.8,0xbc966e).setStrokeStyle(1,0xfffaf2))
      }
      for(let i=0;i<32;i++){
        const a=i*Math.PI/16-Math.PI/2,x=cx+Math.cos(a)*261,y=cy+Math.sin(a)*261
        this.lampGlows.push(this.add.circle(x,y,7,0xefbd58,1).setAlpha(0))
        this.lamps.push(this.add.circle(x,y,2.7,0xc3a17c,.5).setStrokeStyle(1,0xfffbf5,.8))
      }
      this.add.circle(cx,cy+2,76,0x704827,.08)
      this.add.circle(cx,cy,73,0xfffbf5).setStrokeStyle(2,0xd0ac85)
      this.add.circle(cx,cy,64,0xfff8ee).setStrokeStyle(1,0xead7c2)
      if(this.textures.exists('roulette-center-relic'))this.centerIcon=this.add.image(cx,cy-6,'roulette-center-relic').setDisplaySize(78,78)
      else this.add.star(cx,cy,4,12,30,0xb0845a)
      this.centerDetail=this.add.text(cx,cy+43,'',{fontFamily:'"Gowun Dodum", sans-serif',fontSize:'14px',color:'#9c8068'}).setOrigin(.5)
      // The triangle hangs from a fixed pivot. The spring reacts to rim pegs.
      this.pointer=this.add.container(cx,42)
      const shadow=this.add.triangle(2,6,-12,4,12,4,0,49,0x654123,.12).setOrigin(0,0)
      const arrow=this.add.graphics().fillStyle(0x995e36).lineStyle(2,0xfffbf5).beginPath().moveTo(-12,4).lineTo(12,4).lineTo(0,49).closePath().fillPath().strokePath()
      this.pointer.add([shadow,arrow])
      this.add.circle(cx,43,6,0xb0845a).setStrokeStyle(2,0xfffbf5)
      this.wheel.angle=28
      resolveReady()
    }
    update(_time:number,delta:number){
      const running=this.running
      if(running){
        const elapsed=performance.now()-running.start
        if(!readSound()||!readFishingSound()||document.hidden)stopAudio()
        const progress=running.audioEnded?1:Math.min(1,elapsed/rouletteSpinDuration)
        const head=(elapsed/1000*(27-11*progress))%32
        for(let i=0;i<32;i++){
          const distance=(head-i+32)%32,energy=reducedMotion ? .7 : Math.max(0,1-distance/6)
          this.lamps[i].setFillStyle(energy>.05?0xe8ae43:0xc3a17c,.4+energy*.6)
          this.lampGlows[i].setFillStyle(0xefbd58).setAlpha(energy*.42)
        }
        this.centerIcon?.setAlpha(reducedMotion?1:.85+Math.sin(elapsed*.009)*.15)
        const rotation=running.from+running.distance*rotationProgress(progress*rouletteSpinDuration)
        if(!reducedMotion){
          this.wheel.rotation=Phaser.Math.DegToRad(rotation)
          const hits=Math.floor(rotation/15)-Math.floor(running.lastRotation/15)
          if(hits>0){this.pointerVelocity-=Math.min(370,110+hits*35);this.pointerAngle=Math.max(-28,this.pointerAngle-4)}
        }
        running.lastRotation=rotation
        if(progress>=1){
          this.wheel.rotation=Phaser.Math.DegToRad(running.from+running.distance)
          this.running=undefined;stopAudio();this.reveal(running.grade)
          finish?.();finish=undefined
        }
      }
      if(!reducedMotion){
        const next=pointerStep(this.pointerAngle,this.pointerVelocity,delta)
        this.pointerAngle=next.angle;this.pointerVelocity=next.velocity
        this.pointer.angle=Phaser.Math.Clamp(this.pointerAngle,-32,12)
      }
      for(const label of this.labels)label.rotation=-this.wheel.rotation
    }
    reveal(grade:RouletteGrade){
      const index=landingSegment(grade,''),segment=rouletteSegments[index]
      this.sections.forEach((section,i)=>section.setAlpha(i===index?1:.36))
      const from=Phaser.Math.DegToRad(segmentStart(index)-90),to=Phaser.Math.DegToRad(segmentStart(index)+segment.weight*3.6-90)
      this.highlight.clear().fillStyle(0xffffff,.3).beginPath().moveTo(0,0).arc(0,0,237,from,to).closePath().fillPath()
      this.highlight.lineStyle(10,colors[grade],1).beginPath().arc(0,0,235,from,to).strokePath()
      this.highlight.lineStyle(3,0xffffff,.95).beginPath().moveTo(Math.cos(from)*75,Math.sin(from)*75).lineTo(Math.cos(from)*238,Math.sin(from)*238).arc(0,0,238,from,to).lineTo(Math.cos(to)*75,Math.sin(to)*75).strokePath()
      this.centerIcon?.setAlpha(1)
      this.centerDetail.setText(grade==='none'?'꽝':`${rouletteGrades[grade].label} 당첨`).setColor(ink[grade])
      this.lamps.forEach(lamp=>lamp.setFillStyle(colors[grade],1))
      this.lampGlows.forEach(glow=>glow.setFillStyle(colors[grade]).setAlpha(.24))
      if(!reducedMotion){
        this.tweens.add({targets:this.highlight,alpha:.4,duration:550,yoyo:true,repeat:2})
        this.tweens.add({targets:this.lampGlows,alpha:.04,duration:550,yoyo:true,repeat:2})
        const count=grade==='mythic'?42:grade==='epic'?28:grade==='rare'?18:8
        for(let i=0;i<count;i++){
          const a=Math.random()*Math.PI*2,r=110+Math.random()*160
          const spark=this.add.star(320,310,4,1.3,3+Math.random()*3,colors[grade])
          this.tweens.add({targets:spark,x:320+Math.cos(a)*r,y:310+Math.sin(a)*r,alpha:0,duration:550+Math.random()*550,onComplete:()=>spark.destroy()})
        }
      }
      parent.dataset.landed=grade
      parent.dispatchEvent(new CustomEvent('roulette-landed',{detail:{grade,at:performance.now()}}))
    }
    async turn(grade:RouletteGrade,operation:string){
      this.tweens.killTweensOf(this.highlight);this.highlight.clear().setAlpha(1)
      this.tweens.killTweensOf(this.lampGlows)
      this.sections.forEach(section=>section.setAlpha(1));this.centerDetail.setText('')
      delete parent.dataset.landed;stopAudio()
      if(readSound()&&readFishingSound()&&!document.hidden){
        const sound=createGameAudio('/sounds/relic-roulette-spin.mp3');audio=sound;sound.volume=1
        // The shared audio engine resolves play only after decoding and starting.
        let timer:ReturnType<typeof setTimeout>|undefined
        try{await Promise.race([sound.play(),new Promise<void>(resolve=>{timer=setTimeout(()=>{stopAudio();resolve()},1500)})])}catch{stopAudio()}finally{clearTimeout(timer)}
      }
      if(destroyed){stopAudio();return}
      const index=landingSegment(grade,operation),stop=(360-segmentCenter(index))%360
      const from=Phaser.Math.RadToDeg(this.wheel.rotation),normalized=((from%360)+360)%360
      const distance=360*3+(stop-normalized+360)%360
      await new Promise<void>(resolve=>{
        finish=resolve
        this.running={grade,operation,start:performance.now(),from,distance,lastRotation:from,audioEnded:false}
        audio?.addEventListener('ended',()=>{if(this.running?.operation===operation)this.running.audioEnded=true},{once:true})
        parent.dispatchEvent(new CustomEvent('roulette-spin-start',{detail:{at:this.running.start,duration:rouletteSpinDuration,sound:!!audio}}))
      })
    }
  }
  const game=new Phaser.Game({type:Phaser.AUTO,parent,width:640,height:620,transparent:true,antialias:true,scene:RelicWheel,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true},banner:false})
  return {async spin(grade,operation){await ready;if(!destroyed)await scene?.turn(grade,operation)},destroy(){destroyed=true;resolveReady();stopAudio();finish?.();game.destroy(true)}}
}
