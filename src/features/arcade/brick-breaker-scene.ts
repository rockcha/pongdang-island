import Phaser from 'phaser'
import {BrickSession} from './brick-breaker-replay'
import type {BrickReplay} from './brick-breaker-replay'
import {brickTargetDirection} from './brick-target-input'
import {gameIsCovered} from './game-interaction'
import {dashHeadOrigins} from './brick-breaker-anchors'
import {WAVE_SHOT,DASH_SHOT,STAR_SHOT,TORPEDO_DISPLAY_SIZE,TORPEDO_HAZARD} from './brick-breaker-config'
import {BOARD,BRICK,BrickPractice,isItem,pufferRadius,pufferFrame} from './brick-breaker-model'
import type {BrickScore,BrickImpact,DropFeedback,DropKind} from './brick-breaker-model'
import {brickCamera,brickViewport,dropArtwork,brickMaterials} from './brick-breaker-artwork'

export type BrickMode='paid'|'practice'|'lab'
export type BrickController={start:(mode?:BrickMode,seed?:number,replay?:BrickReplay)=>void;replay:()=>BrickReplay;stop:()=>void;setDirection:(direction:-1|0|1)=>void;setTarget:(position:number|null)=>void;launch:()=>void;next:()=>void;bank:()=>void;previewSkill:(kind:DropKind)=>void;pause:(paused:boolean)=>void;destroy:()=>void}
const ink=0x183f4a
const palette=[0x8bd2c5,0xf4d792,0xeaa78d,0x9eafda]

const artwork={
 'brick-background':'/arcade/brick-breaker/background-underwater.png',
 'brick-pongi':'/arcade/brick-breaker/pongi-sprite.png',
 'brick-shark':'/arcade/brick-breaker/shark-sprite.png',
 'brick-item':'/arcade/brick-breaker/item.png',
 'brick-missile':'/arcade/brick-breaker/torpedo.png',
 'brick-wave-icon':'/arcade/brick-breaker/wave-icon.png',
 'brick-dash-icon':'/arcade/brick-breaker/pongi-dash-icon.png',
 'brick-tile-1':brickMaterials[1],
 'brick-tile-2':brickMaterials[2],
 'brick-tile-3':brickMaterials[3],
 'brick-tile-4':brickMaterials[4],
 ...Object.fromEntries(Object.entries(dropArtwork).map(([kind,asset])=>['brick-'+kind,asset.src])),
} as const
function prepareTexture(scene:Phaser.Scene,key:string){
 const source=scene.textures.get(key).getSourceImage() as HTMLImageElement
 // POT render copies enable mipmaps in Phaser 4. The original PNGs stay intact;
 // filtering their fine outlines avoids shimmer when 600px frames render at 48px.
 const canvas=document.createElement('canvas')
 canvas.width=2**Math.floor(Math.log2(Math.min(1024,source.width)))
 canvas.height=2**Math.floor(Math.log2(Math.min(1024,source.height)))
 const context=canvas.getContext('2d');if(!context)return
 context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high'
 context.drawImage(source,0,0,canvas.width,canvas.height)
 scene.textures.renameTexture(key,key+':original')
 scene.textures.addCanvas(key,canvas)
 scene.textures.remove(key+':original')
}
function sheetFrames(scene:Phaser.Scene,key:string,plank=false):{x:number;y:number}[]{
 const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement
 const w=Math.floor(source.width/2),h=Math.floor(source.height/2)
 for(let frame=0;frame<4;frame++)texture.add(frame,0,(frame%2)*w,Math.floor(frame/2)*h,w,h)
 if(!plank)return []
 // Anchor each generated frame at the widest plank rows. Transparent padding
 // may differ between cells; the collision surface must stay perfectly still.
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return Array.from({length:4},()=>({x:0.5,y:0.25}))
 context.drawImage(source,0,0)
 const pixels=context.getImageData(0,0,canvas.width,canvas.height).data
 return Array.from({length:4},(_,frame)=>{
  const ox=(frame%2)*w,oy=Math.floor(frame/2)*h,rows:{x:number;y:number;width:number}[]=[]
  for(let y=0;y<h;y++){let left=w,right=-1;for(let x=0;x<w;x++)if(pixels[((oy+y)*canvas.width+ox+x)*4+3]>128){left=Math.min(left,x);right=x}if(right>=left)rows.push({x:(left+right)/2,y,width:right-left+1})}
  const widest=Math.max(...rows.map(row=>row.width)),anchor=rows.filter(row=>row.width>=widest*0.97)
  return anchor.length?{x:anchor.reduce((sum,row)=>sum+row.x,0)/anchor.length/w,y:anchor.reduce((sum,row)=>sum+row.y,0)/anchor.length/h}:{x:0.5,y:0.25}
 })
}

function shortPaddleTexture(scene:Phaser.Scene,origins:{x:number;y:number}[]){
 const source=scene.textures.get('brick-pongi').getSourceImage() as HTMLCanvasElement
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height
 const context=canvas.getContext('2d')!;context.drawImage(source,0,0)
 const w=canvas.width/2,h=canvas.height/2
 // Render-only copy: conceal plank ends without scaling Pongi or changing PNGs.
 for(let frame=0;frame<4;frame++){
  const ox=frame%2*w,oy=Math.floor(frame/2)*h,cx=origins[frame].x*w,cy=origins[frame].y*h
  const half=54/102*w/2,band=9/78*h
  context.clearRect(ox,oy+cy-band,cx-half,band*2)
  context.clearRect(ox+cx+half,oy+cy-band,w-cx-half,band*2)
 }
 scene.textures.addCanvas('brick-pongi-short',canvas);sheetFrames(scene,'brick-pongi-short')
}

function trimTileFrame(scene:Phaser.Scene,key:string){
 const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return
 context.drawImage(source,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data
 let left=canvas.width,top=canvas.height,right=0,bottom=0
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 if(right>=left)texture.add('tile',0,left,top,right-left+1,bottom-top+1)
}

export function createBrickGame(parent:HTMLElement,onScore:(score:BrickScore)=>void,onPause:()=>void,onReady?:()=>void,onError?:()=>void):BrickController{
 let model=new BrickPractice(),started=false,paused=false,disposed=false,lastScore=''
 let paidSession:BrickSession|null=null
 const command=(action:'launch'|'next')=>{if(paidSession)paidSession.command(action);else if(action==='launch')model.launch();else model.nextRound()}
 let heldDirection:-1|0|1=0
 let touchTarget:number|null=null
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
 let failed=false,generation=0,logicalHeight:number=BOARD.height
 let viewport=brickViewport(parent.clientWidth,parent.clientHeight,window.devicePixelRatio)
 const sprites=new Map<string,Phaser.GameObjects.Image>()
 let game:Phaser.Game
 const canInteract=()=>started&&!paused&&!document.hidden&&!gameIsCovered(parent)
 class BrickScene extends Phaser.Scene{
  private paint!:Phaser.GameObjects.Graphics
  private boardPaint!:Phaser.GameObjects.Graphics
  private backgroundImage!:Phaser.GameObjects.Image
  private inkPaint!:Phaser.GameObjects.Graphics
  private tiles=new Map<number,Phaser.GameObjects.Image>()
  private impacts=new Map<number,BrickImpact&{at:number}>()
  private explosions:(BrickImpact&{at:number})[]=[]
  private waveBursts:{x:number;y:number;at:number}[]=[]
  private songBursts:{y:number;at:number}[]=[]
  private anchorBursts:{x:number;y:number;at:number}[]=[]
  private torpedoBursts:{x:number;y:number;at:number}[]=[]
  private torpedoLabels=new Map<number,Phaser.GameObjects.Text>()
  private feedback:(DropFeedback&{at:number;x:number;y:number})|null=null
  private feedbackText!:Phaser.GameObjects.Text
  private effectClock=0
  private generation=-1
  private paddle!:Phaser.GameObjects.Image
  private widePlank!:Phaser.GameObjects.Image
  private shieldBubble!:Phaser.GameObjects.Image
  private ball!:Phaser.GameObjects.Arc
  private extraBall!:Phaser.GameObjects.Arc
  private arrows?:Phaser.Types.Input.Keyboard.CursorKeys
  private keys?:{left:Phaser.Input.Keyboard.Key;right:Phaser.Input.Keyboard.Key;space:Phaser.Input.Keyboard.Key}
  private paddleOrigins:{x:number;y:number}[]=[]
  private dashOrigins=Array.from({length:4},()=>({x:0.5,y:0.5}))
  private jellyOrigins=Array.from({length:4},()=>({x:0.5,y:0.5}))
  constructor(){super('brick-breaker')}
  preload(){
   this.load.on('loaderror',()=>{failed=true;onError?.()})
   for(const [key,url] of Object.entries(artwork))this.load.image(key,url)
  }
  resizeBoard(){
   if(!this.boardPaint)return
   const camera=brickCamera(viewport.pixelWidth,viewport.pixelHeight)
   logicalHeight=BOARD.height
   this.game.canvas.style.width=`${viewport.width}px`;this.game.canvas.style.height=`${viewport.height}px`
   this.scale.updateBounds()
   if(Math.abs(logicalHeight-model.height)>0.1)model.resize(logicalHeight)
   this.cameras.main.setViewport(camera.x,camera.y,camera.width,camera.height).setZoom(camera.zoom).centerOn(BOARD.width/2,BOARD.height/2)
   this.cameras.main.preRender()
   const frame=this.backgroundImage.frame,cover=Math.max(BOARD.width/frame.width,logicalHeight/frame.height)
   this.backgroundImage.setPosition(BOARD.width/2,logicalHeight/2).setScale(cover)
   const bg=this.boardPaint;bg.clear();bg.fillStyle(0x142d34,0.26);bg.fillRect(0,0,BOARD.width,logicalHeight)
   bg.lineStyle(1,0x45636a);bg.strokeRoundedRect(7,10,346,logicalHeight-18,12)
  }
  create(){
   if(disposed){this.game.destroy(true);return}
   if(failed)return
   for(const key of Object.keys(artwork))if(key!=='brick-background')prepareTexture(this,key)
   this.paddleOrigins=sheetFrames(this,'brick-pongi',true)
   shortPaddleTexture(this,this.paddleOrigins)
   for(const [kind,asset] of Object.entries(dropArtwork))if(asset.sheet)sheetFrames(this,'brick-'+kind)
   const dashSource=this.textures.get('brick-dash').getSourceImage() as HTMLCanvasElement
   const anchorCanvas=document.createElement('canvas');anchorCanvas.width=dashSource.width;anchorCanvas.height=dashSource.height
   const anchorContext=anchorCanvas.getContext('2d',{willReadFrequently:true})
   if(anchorContext){anchorContext.drawImage(dashSource,0,0);this.dashOrigins=dashHeadOrigins(anchorContext.getImageData(0,0,anchorCanvas.width,anchorCanvas.height).data,anchorCanvas.width,anchorCanvas.height)}
   const jellySource=this.textures.get('brick-jelly').getSourceImage() as HTMLCanvasElement
   anchorCanvas.width=jellySource.width;anchorCanvas.height=jellySource.height
   if(anchorContext){anchorContext.drawImage(jellySource,0,0);this.jellyOrigins=dashHeadOrigins(anchorContext.getImageData(0,0,anchorCanvas.width,anchorCanvas.height).data,anchorCanvas.width,anchorCanvas.height)}
   this.cameras.main.setBackgroundColor('#183139')
   for(let hp=1;hp<=4;hp++)trimTileFrame(this,'brick-tile-'+hp)
   trimTileFrame(this,'brick-wide')
   this.backgroundImage=this.add.image(0,0,'brick-background').setDepth(-1)
   this.boardPaint=this.add.graphics().setDepth(0)
   this.paint=this.add.graphics().setDepth(2)
   this.inkPaint=this.add.graphics().setDepth(5)
   this.feedbackText=this.add.text(0,0,'',{fontFamily:'Gowun Dodum, sans-serif',fontSize:'11px',padding:{x:0,y:0},resolution:2}).setDepth(6).setVisible(false)
   this.resizeBoard()
   this.scale.on('resize',()=>this.resizeBoard())
   this.paddle=this.add.image(180,model.paddleY,'brick-pongi',0).setDisplaySize(102,78).setDepth(3)
   this.widePlank=this.add.image(180,model.paddleY,'brick-wide','tile').setDepth(3.1).setVisible(false)
   this.shieldBubble=this.add.image(180,model.paddleY,'brick-shield').setDepth(2.8).setAlpha(0.55).setVisible(false)
   this.ball=this.add.circle(180,450,6,0xffffff).setStrokeStyle(2,ink).setDepth(4)
   this.extraBall=this.add.circle(180,450,6,0xe8dfff).setStrokeStyle(2,0x86739d).setDepth(4).setVisible(false)
   this.arrows=this.input.keyboard?.createCursorKeys()
   if(this.input.keyboard)this.keys={left:this.input.keyboard.addKey('A'),right:this.input.keyboard.addKey('D'),space:this.input.keyboard.addKey('SPACE')}
   this.input.keyboard?.on('keydown-SPACE',(event:KeyboardEvent)=>{if(canInteract()&&(parent.contains(document.activeElement)||document.activeElement===document.body)){event.preventDefault();command('launch')}})
   this.input.keyboard?.on('keydown-P',()=>{if(started&&model.phase==='playing'){heldDirection=0;touchTarget=null;paused=true;onPause()}})
   this.input.keyboard?.disableGlobalCapture()
   this.events.once('shutdown',()=>{sprites.clear();this.tiles.clear();this.impacts.clear();this.explosions=[]})
   onReady?.()
  }
  update(time:number,delta:number){
   if(disposed||!this.paint)return
   resizeViewport()
   if(started&&!paused&&(document.hidden||gameIsCovered(parent))){heldDirection=0;touchTarget=null;paused=true;this.input.keyboard?.resetKeys();onPause()}
   if(this.generation!==generation){this.generation=generation;this.impacts.clear();this.explosions=[];this.waveBursts=[];this.songBursts=[];this.anchorBursts=[];this.torpedoBursts=[];for(const label of this.torpedoLabels.values())label.destroy();this.torpedoLabels.clear();this.feedback=null;this.cameras.main.shakeEffect.reset();this.feedbackText.setVisible(false);for(const image of this.tiles.values())image.destroy();this.tiles.clear()}
   if(!paused)this.effectClock+=Math.min(delta,100)
   if(started&&!paused){
    const inputSeconds=Math.min(delta/1000,0.05)
    const direction=touchTarget!==null?brickTargetDirection(model.paddleX,touchTarget,inputSeconds):heldDirection||((this.arrows?.right.isDown||this.keys?.right.isDown?1:0)-(this.arrows?.left.isDown||this.keys?.left.isDown?1:0))
    if(paidSession){paidSession.command('direction',direction as -1|0|1);if(paidSession.ticks<216000)paidSession.advance(inputSeconds);else{paused=true;onPause()}}
    else{if(direction)model.moveInput(model.paddleX+direction*420*inputSeconds,inputSeconds);model.step(delta/1000)}
   }
   this.paint.clear()
   for(const song of model.drainSongs())this.songBursts.push({...song,at:this.effectClock})
   const slams=model.drainAnchorSlams()
   for(const slam of slams)this.anchorBursts.push({...slam,at:this.effectClock})
   if(slams.length&&!reduced)this.cameras.main.shake(210,0.0045,true)
   const blasts=model.drainTorpedoBlasts()
   for(const blast of blasts)this.torpedoBursts.push({...blast,at:this.effectClock})
   if(blasts.length&&!reduced)this.cameras.main.shake(240,0.005,true)
   let ballHit=model.drainPaddleHit()
   for(const hit of model.drainImpacts()){
    if(hit.source==='ball')ballHit=true
    const effect={...hit,at:this.effectClock};this.impacts.set(hit.brickId,effect)
    if(hit.source==='wave')this.waveBursts.push({x:hit.x,y:hit.y,at:this.effectClock})
    if(hit.source==='dash'&&!reduced)this.cameras.main.shake(90,0.0011,false)
    if(hit.source==='torpedo')this.explosions.push(effect)
   }
   // A tiny tap; never restart an ongoing shake or override hazard feedback.
   if(ballHit&&!reduced)this.cameras.main.shake(65,0.0007,false)
   const feedback=model.drainFeedback()
   if(!reduced&&feedback.length&&!slams.length&&!blasts.length)this.cameras.main.shake(
    feedback.some(event=>event.kind==='hazard')?110:80,
    feedback.some(event=>event.kind==='hazard')?0.0018:0.001,false)
   if(feedback.length){this.feedback={...(feedback.findLast(event=>event.kind==='hazard')??feedback[feedback.length-1]),at:this.effectClock,x:model.paddleX,y:model.paddleY};this.feedbackText.setText(this.feedback.message)
    const label=this.feedbackText,point=this.feedback
    point.x=Math.max(9,Math.min(BOARD.width-label.width-9,point.x-label.width/2))
    point.y=Math.max(8,point.y-label.height-22)}
   const aliveBricks=new Set<number>()
   for(const brick of model.bricks){
    aliveBricks.add(brick.id)
    let tile=this.tiles.get(brick.id)
    if(!tile){tile=this.add.image(0,0,'brick-tile-'+brick.hp,'tile').setDepth(1);this.tiles.set(brick.id,tile)}
    const hit=this.impacts.get(brick.id),t=hit?(this.effectClock-hit.at)/180:1,pulse=hit&&!reduced?Math.sin(Math.min(1,t)*Math.PI):0
    tile.setTexture('brick-tile-'+brick.hp,'tile').setPosition(brick.x+BRICK.width/2,brick.y+BRICK.height/2+pulse*1.5).setDisplaySize(BRICK.width*(1+pulse*0.05),BRICK.height*(1-pulse*0.1))
    if(hit&&t<1){this.paint.fillStyle(0xffffff,(1-t)*0.3);this.paint.fillRoundedRect(brick.x,brick.y,BRICK.width,BRICK.height,4)}
   }
   for(const [id,image] of this.tiles)if(!aliveBricks.has(id)){image.destroy();this.tiles.delete(id)}
   for(const [id,hit] of this.impacts){
    const t=(this.effectClock-hit.at)/(hit.destroyed?300:180)
    if(t>=1){this.impacts.delete(id);continue}
    if(reduced||hit.source==='torpedo')continue
    const radius=4+t*(hit.destroyed?25:12)
    this.paint.lineStyle(1.3,0xffffff,(1-t)*0.8);this.paint.strokeCircle(hit.x,hit.y,radius)
    for(let i=0;i<(hit.destroyed?6:3);i++){
     const angle=i*Math.PI*2/(hit.destroyed?6:3)+id*0.8,x=hit.x+Math.cos(angle)*radius,y=hit.y+Math.sin(angle)*radius*0.6
     this.paint.fillStyle(hit.destroyed?palette[(id%4)]:0xffffff,1-t);this.paint.fillRect(x-1.5,y-1.5,hit.destroyed?3:2,hit.destroyed?3:2)
    }
   }
   this.explosions=this.explosions.filter(hit=>this.effectClock-hit.at<(reduced?180:440))
   for(const hit of this.explosions){
    const t=(this.effectClock-hit.at)/(reduced?180:440),fade=1-t
    if(reduced){this.paint.fillStyle(0xffd68a,fade*0.65);this.paint.fillCircle(hit.x,hit.y,8);continue}
    const burst=Math.sin(Math.min(1,t/0.55)*Math.PI/2),radius=5+burst*19
    // Warm fireball lobes and a bright core, then a soft puff and flying sparks.
    this.paint.fillStyle(0xff994f,fade*0.18);this.paint.fillCircle(hit.x,hit.y,radius*1.5)
    for(let i=0;i<7;i++){
     const angle=i*Math.PI*2/7,reach=radius*0.48
     this.paint.fillStyle(i%2?0xffb44f:0xf47745,fade*0.85)
     this.paint.fillCircle(hit.x+Math.cos(angle)*reach,hit.y+Math.sin(angle)*reach,radius*(0.4+fade*0.15))
    }
    this.paint.fillStyle(0xffdf86,fade);this.paint.fillCircle(hit.x,hit.y,radius*0.52)
    this.paint.fillStyle(0xfffaf0,Math.max(0,1-t*2.8));this.paint.fillCircle(hit.x,hit.y,3+fade*5)
    this.paint.lineStyle(1.5,0xffd899,fade);this.paint.strokeCircle(hit.x,hit.y,6+t*33)
    for(let i=0;i<8;i++){
     const angle=i*Math.PI/4+hit.brickId*0.7,reach=9+t*38
     this.paint.lineStyle(1.6,i%2?0xffc35e:0xfff2ca,fade)
     this.paint.lineBetween(hit.x+Math.cos(angle)*(reach-4),hit.y+Math.sin(angle)*(reach-4),hit.x+Math.cos(angle)*reach,hit.y+Math.sin(angle)*reach)
    }
    if(t>0.4)for(let i=0;i<3;i++){
     this.paint.fillStyle(0x82949a,fade*0.3)
     this.paint.fillCircle(hit.x+(i-1)*(5+t*8),hit.y-t*14,3+t*5)
    }
   }
   this.waveBursts=this.waveBursts.filter(wave=>this.effectClock-wave.at<(reduced?180:430))
   for(const wave of this.waveBursts){
    const t=(this.effectClock-wave.at)/(reduced?180:430),fade=1-t
    this.paint.fillStyle(0x8de3e9,fade*0.15);this.paint.fillCircle(wave.x,wave.y,15)
    this.paint.lineStyle(1.5,0xa3ebec,fade*0.9);this.paint.strokeCircle(wave.x,wave.y,4+t*15)
    if(!reduced)for(let i=0;i<6;i++){
     const angle=i*Math.PI/3,reach=0.3+t*0.7
     this.paint.fillStyle(i%2?0xe3fff4:0x8de3e9,fade)
     this.paint.fillCircle(wave.x+Math.cos(angle)*18*reach,wave.y+Math.sin(angle)*14*reach,1.5)
    }
   }
   const frame=reduced?0:Math.floor(time/220)%4,origin=this.paddleOrigins[frame]
   this.widePlank.setVisible(model.wideSeconds>0||model.shrinkSeconds>0).setPosition(model.paddleX,model.paddleY).setDisplaySize(model.paddleWidth,14)
   this.shieldBubble.setVisible(model.shield).setPosition(model.paddleX,model.paddleY+7).setDisplaySize(90,90)
   if(model.stickySeconds>0){
    this.paint.fillStyle(0xb6b18b,0.85);this.paint.fillRoundedRect(model.paddleX-28,model.paddleY-7,56,7,3)
    for(const [offset,length] of [[-19,10],[3,15],[21,8]])this.paint.fillRoundedRect(model.paddleX+offset,model.paddleY-4,4,length,2)
   }
   this.paddle.setTexture(model.shrinkSeconds>0?'brick-pongi-short':'brick-pongi',frame).setOrigin(origin.x,origin.y).setPosition(model.paddleX,model.paddleY)
   const primary=model.balls[0]
   this.ball.setVisible(!!primary&&started&&(model.phase==='playing'||model.phase==='ready'))
   if(primary)this.ball.setPosition(primary.x,primary.y)
   const extra=model.balls[1];this.extraBall.setVisible(!!extra&&model.phase==='playing');if(extra)this.extraBall.setPosition(extra.x,extra.y)
   if(model.fastSeconds>0)for(const b of model.balls){
    this.paint.lineStyle(3,0xff765e,0.55);const speed=Math.hypot(b.vx,b.vy)||1
    this.paint.lineBetween(b.x,b.y,b.x-b.vx/speed*18,b.y-b.vy/speed*18)
   }
   this.ball.setFillStyle(model.fastSeconds>0?0xffb19a:0xffffff)
   this.extraBall.setFillStyle(model.fastSeconds>0?0xffb19a:0xe8dfff)
   if(model.labMode&&model.previewSeconds>0){
    const t=1-model.previewSeconds/2,x=model.paddleX,y=model.paddleY
    if(model.previewKind==='split')for(const direction of [-1,1]){
     this.paint.fillStyle(0xe8dfff,1-t);this.paint.fillCircle(x+direction*t*55,y-16-t*110,6)
    }
    if(model.previewKind==='magnet'){
     this.paint.lineStyle(2,0xaadce9,1-t);this.paint.strokeCircle(x,y-15,12+t*18)
    }
    if(model.previewKind==='heart'){
     this.paint.lineStyle(2,0xf09b91,1-t);this.paint.strokeCircle(x,y-16-t*30,12+t*8)
    }
    if(model.previewKind==='seaweed')for(let i=0;i<4;i++){
     this.paint.lineStyle(2,0xffb19a,1-t);this.paint.lineBetween(x-24+i*16,y-18-t*70,x-24+i*16,y-32-t*70)
    }
   }
   this.inkPaint.clear()
   if(model.inkSeconds>0)for(const patch of model.inkPatches){
    const alpha=Math.min(1,model.inkSeconds/0.5)
    this.inkPaint.fillStyle(0x191523,alpha);this.inkPaint.fillCircle(patch.x,patch.y,patch.radius)
    for(let i=0;i<7;i++){
     const angle=i*Math.PI*2/7
     this.inkPaint.fillCircle(patch.x+Math.cos(angle)*patch.radius*0.7,patch.y+Math.sin(angle)*patch.radius*0.65,patch.radius*0.45)
    }
    this.inkPaint.fillStyle(0x514263,alpha*0.5);this.inkPaint.fillEllipse(patch.x-12,patch.y-16,22,9)
   }
   const live=new Set<string>()
   const sprite=(key:string,texture:string,x:number,y:number,w:number,h:number)=>{live.add(key);let image=sprites.get(key);if(!image){image=this.add.image(x,y,texture,texture==='brick-shark'?0:undefined).setDepth(2);sprites.set(key,image)}image.setPosition(x,y).setDisplaySize(w,h);return image}
   this.songBursts=this.songBursts.filter(song=>this.effectClock-song.at<2400)
   for(const song of this.songBursts){
    const age=this.effectClock-song.at,t=Math.min(1,age/1600)
    const fade=1-Math.max(0,(age-600)/1800)**2
    this.paint.fillStyle(0xa4eaf1,fade*0.16);this.paint.fillRoundedRect(BRICK.left-5,song.y-BRICK.height/2-4,BRICK.columns*(BRICK.width+BRICK.gapX)-BRICK.gapX+10,BRICK.height+8,6)
    for(let i=0;i<3;i++){
     const progress=reduced?0.5:Math.min(1,t*1.6+i*0.12)
     this.paint.lineStyle(2,0xb8f3f7,fade*(1-i*0.2))
     this.paint.strokeEllipse(BOARD.width/2,song.y,40+progress*300,10+progress*35)
    }
    sprite('whale-song-'+song.at,'brick-whale',BOARD.width/2+(reduced?0:(t-0.5)*50),song.y+55,88,66).setAlpha(fade).setDepth(2.5)
   }
   if(model.scoreMultiplier>1){
    this.paint.lineStyle(1.5,0xffd681,0.65)
    this.paint.strokeCircle(model.paddleX,model.paddleY+7,35)
   }
   if(this.feedback){
    const t=(this.effectClock-this.feedback.at)/550
    if(t<1){
     const color=this.feedback.kind==='item'?0x72eaa0:0xff6874,fade=(1-t)**2
     const radius=reduced?37:31+t*15,x=model.paddleX,y=model.paddleY+7
     this.paint.fillStyle(color,fade*0.12);this.paint.fillCircle(x,y,radius)
     this.paint.lineStyle(2,color,fade*0.65);this.paint.strokeCircle(x,y,radius)
     if(!reduced)for(let i=0;i<6;i++){
      const angle=i*Math.PI/3-Math.PI/2
      this.paint.fillStyle(color,fade*0.8)
      this.paint.fillCircle(x+Math.cos(angle)*(radius+4),y+Math.sin(angle)*(radius+4),1.5)
     }
    }
   }
   this.anchorBursts=this.anchorBursts.filter(slam=>this.effectClock-slam.at<500)
   for(const slam of this.anchorBursts){
    const t=(this.effectClock-slam.at)/500,fade=1-t
    this.paint.lineStyle(2,0xe1e1cf,fade*0.8);this.paint.strokeEllipse(slam.x,slam.y,12+t*90,5+t*20)
    if(!reduced)for(let i=0;i<8;i++){
     const angle=Math.PI+i*Math.PI/7
     this.paint.fillStyle(i%2?0xb8ccd0:0xe3dfc3,fade)
     this.paint.fillCircle(slam.x+Math.cos(angle)*t*42,slam.y+Math.sin(angle)*t*28,2*(1-t)+0.5)
    }
   }
   this.torpedoBursts=this.torpedoBursts.filter(blast=>this.effectClock-blast.at<700)
   for(const blast of this.torpedoBursts){
    const t=(this.effectClock-blast.at)/700,fade=1-t,radius=reduced?TORPEDO_HAZARD.radius:12+Math.min(1,t*3)*(TORPEDO_HAZARD.radius-12)
    this.paint.fillStyle(0xff654d,fade*0.18);this.paint.fillCircle(blast.x,blast.y,radius)
    this.paint.lineStyle(3,0xffc482,fade);this.paint.strokeCircle(blast.x,blast.y,radius)
   }
   for(const d of model.drops){
    if(d.kind==='poison'){
     const age=d.age??0
     if(d.bottle){
      const tilt=Math.min(1,Math.max(0,(age-0.65)/0.6)),alpha=Math.min(1,age/0.65,Math.max(0,(4.2-age)/0.7))
      sprite('poison-bottle-'+d.id,'brick-poison',d.x,d.y,37,37).setRotation(-tilt*1.95).setAlpha(alpha)
     }else{
      this.paint.lineStyle(3,0x96d555,0.25);this.paint.lineBetween(d.x,d.y-23,d.x,d.y-4)
      this.paint.fillStyle(0x83c94a,0.95);this.paint.fillEllipse(d.x,d.y,10,17)
      this.paint.fillStyle(0xd5f39b,0.8);this.paint.fillEllipse(d.x-2,d.y-3,3,6)
     }
     continue
    }
    if(d.kind==='torpedo'){
     const remaining=Math.max(0,TORPEDO_HAZARD.countdown-(d.age??0)),targetX=d.targetX??d.x,targetY=d.targetY??model.paddleY
     this.paint.fillStyle(0xff494f,remaining<=3?0.12:0.05);this.paint.fillCircle(targetX,targetY,TORPEDO_HAZARD.radius)
     this.paint.lineStyle(1.5,0xff6269,remaining<=3?0.85:0.4);this.paint.strokeCircle(targetX,targetY,TORPEDO_HAZARD.radius)
     let label=this.torpedoLabels.get(d.id)
     if(!label){label=this.add.text(0,0,'',{fontFamily:'Gowun Dodum, sans-serif',fontSize:'18px',fontStyle:'bold',color:'#fff4df',backgroundColor:'#5e242b',padding:{x:5,y:2},resolution:2}).setOrigin(0.5,1).setDepth(7);this.torpedoLabels.set(d.id,label)}
     label.setText(String(Math.ceil(remaining))).setPosition(Math.max(25,Math.min(BOARD.width-25,d.x)),Math.max(35,d.y-23)).setColor(remaining<=3?'#ffb2a2':'#fff4df')
    }
    const item=isItem(d.kind),color=item?0x55e999:0xff6269,radius=item?17:23,pulse=reduced?0:Math.sin(this.effectClock/170+d.id)*1.5
    this.paint.fillStyle(color,0.05);this.paint.fillCircle(d.x,d.y,radius+9+pulse)
    this.paint.fillStyle(color,0.11);this.paint.fillCircle(d.x,d.y,radius+3+pulse)
    this.paint.lineStyle(1.3,color,0.65);this.paint.strokeCircle(d.x,d.y,radius+pulse)
    if(!reduced)for(let i=0;i<3;i++){
     const progress=(this.effectClock/650+i/3)%1
     this.paint.fillStyle(color,(1-progress)*0.45)
     this.paint.fillCircle(d.x+Math.sin(i*2+d.id)*9,d.y-radius-progress*21,1.5+(1-progress))
    }
    if(d.warning>0){
     const targetX=d.targetX??d.x,targetY=d.targetY??model.paddleY
     this.paint.lineStyle(2,0xff494f,0.8);this.paint.lineBetween(d.x,d.y,targetX,targetY)
     this.paint.strokeCircle(targetX,targetY,7)
    }
    if(d.kind==='anchor')for(let y=10;y<d.y-16;y+=10){
     this.paint.lineStyle(1.6,0x8e9c9e,0.9)
     this.paint.strokeEllipse(d.x,y,(Math.floor(y/10)%2)?5:3,9)
    }
    const frame=d.kind==='puffer'?(reduced?2:pufferFrame(d.age??0)):reduced?0:Math.floor(this.effectClock/(d.kind==='jelly'?220:120))%4
    const size=d.kind==='puffer'?(reduced?40*pufferRadius(d.age??0)/18:40):d.kind==='shark'?48:d.kind==='anchor'?46:d.kind==='jelly'?44:d.kind==='torpedo'?44:32
    const rotation=d.kind==='shark'?Math.atan2(-(d.vx??0),d.vy??440):(d.kind==='puffer'||d.kind==='jelly')&&!reduced?Math.sin((d.age??0)*2.4)*0.12:d.kind==='urchin'&&!reduced?(d.rotation??0):0
    if(d.kind==='shark'&&d.warning<=0&&!reduced){
     const vx=d.vx??0,vy=d.vy??440,speed=Math.hypot(vx,vy)||1,length=Math.min(96,(d.age??0)*speed)
     for(let i=7;i>=1;i--){
      const offset=i*12
      if(offset>length)continue
      const trailSize=size*(1-i*0.065)
      sprite(`shark-trail-${d.id}-${i}`,'brick-shark',d.x-vx/speed*offset,d.y-vy/speed*offset,trailSize,trailSize)
       .setFrame((frame+4-i%4)%4).setDisplaySize(trailSize,trailSize).setRotation(rotation).setAlpha((8-i)*0.035).setDepth(1.8)
      this.paint.fillStyle(0xc2f1f2,(1-i/8)*0.35)
      this.paint.fillCircle(d.x-vx/speed*offset,d.y-vy/speed*offset,1+i*0.25)
     }
    }
    const staticPickup=d.kind==='wave'||d.kind==='dash'
    const dropImage=sprite('drop'+d.id,staticPickup?'brick-'+d.kind+'-icon':'brick-'+d.kind,d.x,d.y,size,size)
     .setFrame(!staticPickup&&dropArtwork[d.kind].sheet?frame:'__BASE').setOrigin(0.5).setAlpha(d.warning>0?0.45:1).setRotation(rotation)
    if(d.kind==='jelly')dropImage.setDisplaySize(size*dropImage.frame.width/dropImage.frame.height,size).setOrigin(this.jellyOrigins[frame].x,this.jellyOrigins[frame].y)
   }
   for(const shot of model.shots){
    if(!reduced){
     const length=Math.min(72,Math.max(0,model.paddleY-14-shot.y))
     for(let i=7;i>=1;i--){
      const offset=i*9
      if(offset>length)continue
      const size=TORPEDO_DISPLAY_SIZE*(1-i*0.075)
      sprite(`missile-trail-${shot.id}-${i}`,'brick-missile',shot.x,shot.y+offset,size,size)
       .setAlpha((8-i)*0.03).setDepth(1.8)
      this.paint.fillStyle(0xb9f4f2,(1-offset/72)*0.5)
      this.paint.fillCircle(shot.x+Math.sin(this.effectClock/100+i)*2,shot.y+offset,1.5+i*0.2)
     }
    }
    sprite('shot'+shot.id,'brick-missile',shot.x,shot.y,TORPEDO_DISPLAY_SIZE,TORPEDO_DISPLAY_SIZE)
   }
   for(const shot of model.starShots){
    if(shot.delay>0)continue
    if(!reduced){
     const length=Math.min(70,shot.age*STAR_SHOT.speed)
     for(let i=7;i>=1;i--){
      const offset=i*9
      if(offset>length)continue
      const size=STAR_SHOT.displaySize*(1-i*0.065)
      sprite(`star-trail-${shot.id}-${i}`,'brick-star',shot.x-shot.vx/STAR_SHOT.speed*offset,shot.y-shot.vy/STAR_SHOT.speed*offset,size,size)
       .setRotation((shot.age-offset/STAR_SHOT.speed)*20).setAlpha((8-i)*0.035).setDepth(1.9)
      this.paint.lineStyle(2*(1-i/8),0xffd7a0,(1-i/8)*0.55)
      this.paint.lineBetween(shot.x-shot.vx/STAR_SHOT.speed*(offset-9),shot.y-shot.vy/STAR_SHOT.speed*(offset-9),shot.x-shot.vx/STAR_SHOT.speed*offset,shot.y-shot.vy/STAR_SHOT.speed*offset)
     }
    }
    sprite('star'+shot.id,'brick-star',shot.x,shot.y,STAR_SHOT.displaySize,STAR_SHOT.displaySize)
     .setRotation(reduced?0:shot.age*20).setDepth(3)
   }
   for(const shot of model.waveShots){
    const frame=reduced?0:Math.floor(shot.age*1000/WAVE_SHOT.frameMs)%4
    if(!reduced){
     // Keep the wake behind the upward-moving bolt and inside its travelled path.
     const length=Math.min(128,shot.age*WAVE_SHOT.speed)
     for(let i=9;i>=1;i--){
      const offset=i*12
      if(offset>length)continue
      const size=WAVE_SHOT.displaySize*(1-i*0.065)
      sprite(`wave-trail-${shot.id}-${i}`,'brick-wave',shot.x,shot.y+offset,size,size)
       .setFrame((frame+4-i%4)%4).setDisplaySize(size,size).setAlpha((10-i)*0.022).setDepth(1.8)
     }
     for(const side of [-1,1])for(let i=0;i<12;i++){
      const from=i/12,to=(i+1)/12,phase=shot.age*16
      const x1=shot.x+Math.sin(phase+from*8+side)*side*(4+from*4)
      const x2=shot.x+Math.sin(phase+to*8+side)*side*(4+to*4)
      this.paint.lineStyle(2.5*(1-from)+0.5,side===1?0xa8fff0:0x55cfe9,(1-from)*0.55)
      this.paint.lineBetween(x1,shot.y+from*length,x2,shot.y+to*length)
     }
    }
    sprite('wave'+shot.id,'brick-wave',shot.x,shot.y,WAVE_SHOT.displaySize,WAVE_SHOT.displaySize).setFrame(frame).setDisplaySize(WAVE_SHOT.displaySize,WAVE_SHOT.displaySize)
   }
   for(const shot of model.dashShots){
    const frame=reduced?0:Math.floor(shot.age*1000/DASH_SHOT.frameMs)%4
    if(!reduced){
     const length=Math.min(100,shot.age*DASH_SHOT.speed)
     for(let i=7;i>=1;i--){
      const offset=i*13
      if(offset>length)continue
      const size=DASH_SHOT.displaySize*(1-i*0.06)
      const trailFrame=(frame+4-i%4)%4,origin=this.dashOrigins[trailFrame]
      sprite(`dash-trail-${shot.id}-${i}`,'brick-dash',shot.x,shot.y+offset,size,size)
       .setFrame(trailFrame).setOrigin(origin.x,origin.y).setDisplaySize(size,size).setAlpha((8-i)*0.035).setDepth(1.9)
     }
     for(const side of [-1,1]){
      this.paint.lineStyle(2,0xffdbab,0.45)
      this.paint.lineBetween(shot.x+side*13,shot.y+12,shot.x+side*19,shot.y+length)
     }
    }
    sprite('dash'+shot.id,'brick-dash',shot.x,shot.y,DASH_SHOT.displaySize,DASH_SHOT.displaySize)
     .setFrame(frame).setOrigin(this.dashOrigins[frame].x,this.dashOrigins[frame].y).setDisplaySize(DASH_SHOT.displaySize,DASH_SHOT.displaySize).setDepth(3.2)
   }
   for(const [key,image] of sprites)if(!live.has(key)){image.destroy();sprites.delete(key)}
   for(const [id,label] of this.torpedoLabels)if(!model.drops.some(drop=>drop.id===id)){label.destroy();this.torpedoLabels.delete(id)}
   if(this.feedback){
    const age=this.effectClock-this.feedback.at
    if(age>=1600){this.feedback=null;this.feedbackText.setVisible(false)}
    else{
     const item=this.feedback.kind==='item',alpha=age<1100?1:1-(age-1100)/500
     const label=this.feedbackText.setVisible(true).setColor(item?'#a0f3bd':'#ffb1b5').setAlpha(alpha)
     label.setPosition(this.feedback.x,this.feedback.y)
    }
   }
   const score=model.score(),signature=JSON.stringify(score)
   if(signature!==lastScore){lastScore=signature;onScore(score)}
  }
 }
 function resizeViewport(){
  if(disposed||!game||parent.clientWidth<=0||parent.clientHeight<=0)return
  const next=brickViewport(parent.clientWidth,parent.clientHeight,window.devicePixelRatio)
  if(next.width===viewport.width&&next.height===viewport.height&&next.pixelWidth===viewport.pixelWidth&&next.pixelHeight===viewport.pixelHeight)return
  viewport=next;game.scale.setZoom(1/viewport.ratio);game.scale.resize(viewport.pixelWidth,viewport.pixelHeight)
 }
 game=new Phaser.Game({type:Phaser.AUTO,parent,width:viewport.pixelWidth,height:viewport.pixelHeight,backgroundColor:'#183139',scene:BrickScene,scale:{mode:Phaser.Scale.NONE,zoom:1/viewport.ratio},render:{antialias:true,antialiasGL:true,pixelArt:false,mipmapFilter:'LINEAR_MIPMAP_LINEAR'},input:{activePointers:2},audio:{noAudio:true},banner:false})
 game.canvas.setAttribute('aria-label','퐁이 벽돌깨기 게임 화면. 퐁이 아래 조작 영역을 좌우로 문지르거나 방향키로 이동하고 발사 버튼 또는 스페이스로 공을 발사하세요.')
 game.canvas.setAttribute('role','img');game.canvas.style.touchAction='none'
 const resize=new ResizeObserver(resizeViewport);resize.observe(parent)
 function reset(mode:BrickMode,seed?:number,replay?:BrickReplay){heldDirection=0;touchTarget=null;paidSession=mode==='paid'?new BrickSession(seed??0):null;if(paidSession&&replay){let i=0;for(let tick=0;tick<=replay.ticks;tick++){while(i<replay.inputs.length&&replay.inputs[i].tick===tick){const input=replay.inputs[i++];paidSession.apply(input.action,input.value)}if(tick<replay.ticks)paidSession.step()}paidSession.inputs=replay.inputs.map(input=>({...input}));paidSession.command('direction',0)}model=paidSession?.model??new BrickPractice();if(paidSession){model.drainImpacts();model.drainFeedback();model.drainSongs();model.drainAnchorSlams();model.drainTorpedoBlasts();model.drainPaddleHit()}model.resize(logicalHeight);if(mode==='lab')model.enterLaboratory();generation++;started=true;paused=false;lastScore='';onScore(model.score())}
 function preview(kind:DropKind){
  if(!started||!model.labMode)return
  const x=model.paddleX,direction=heldDirection
  reset('lab');model.move(x);heldDirection=direction
  model.previewSkill(kind);onScore(model.score())
 }
 return {start:(mode='practice',seed,replay)=>reset(mode,seed,replay),replay:()=>paidSession?.replay()??{ticks:0,inputs:[]},stop:()=>{heldDirection=0;touchTarget=null;paidSession=null;started=false;paused=true;model=new BrickPractice();generation++;lastScore='';onScore(model.score())},setDirection:direction=>{heldDirection=direction===0||canInteract()?direction:0},setTarget:position=>{touchTarget=position!==null&&Number.isFinite(position)&&canInteract()?Math.max(0,Math.min(1,position))*BOARD.width:null},launch:()=>{if(canInteract())command('launch')},next:()=>{heldDirection=0;touchTarget=null;if(paidSession)paidSession.command('direction',0);command('next');generation++},bank:()=>model.bank(),previewSkill:preview,pause:value=>{heldDirection=0;touchTarget=null;paused=value},destroy:()=>{heldDirection=0;touchTarget=null;disposed=true;resize.disconnect();sprites.clear();game.destroy(true)}}
}
