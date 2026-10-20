import Phaser from 'phaser'
import {BOARD,BRICK,BrickPractice} from './brick-breaker-model'
import type {BrickScore,BrickImpact} from './brick-breaker-model'

export type BrickController={start:()=>void;launch:()=>void;next:()=>void;bank:()=>void;pause:(paused:boolean)=>void;destroy:()=>void}
const ink=0x183f4a
const palette=[0x8bd2c5,0xf4d792,0xeaa78d,0x9eafda]

const artwork={
 'brick-pongi':'/arcade/brick-breaker/pongi-sprite.png',
 'brick-shark':'/arcade/brick-breaker/shark-sprite.png',
 'brick-item':'/arcade/brick-breaker/item.png',
 'brick-torpedo':'/arcade/brick-breaker/torpedo.png',
 'brick-tile-1':'/arcade/brick-breaker/tile-1.png',
 'brick-tile-2':'/arcade/brick-breaker/tile-2.png',
 'brick-tile-3':'/arcade/brick-breaker/tile-3.png',
 'brick-tile-4':'/arcade/brick-breaker/tile-4.png',
} as const
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
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
 let failed=false,generation=0,logicalHeight:number=BOARD.height
 const sprites=new Map<string,Phaser.GameObjects.Image>()
 let game:Phaser.Game
 class BrickScene extends Phaser.Scene{
  private paint!:Phaser.GameObjects.Graphics
  private boardPaint!:Phaser.GameObjects.Graphics
  private tiles=new Map<number,Phaser.GameObjects.Image>()
  private impacts=new Map<number,BrickImpact&{at:number}>()
  private effectClock=0
  private generation=-1
  private paddle!:Phaser.GameObjects.Image
  private ball!:Phaser.GameObjects.Arc
  private arrows?:Phaser.Types.Input.Keyboard.CursorKeys
  private keys?:{left:Phaser.Input.Keyboard.Key;right:Phaser.Input.Keyboard.Key;space:Phaser.Input.Keyboard.Key}
  private paddleOrigins:{x:number;y:number}[]=[]
  constructor(){super('brick-breaker')}
  preload(){
   this.load.on('loaderror',()=>{failed=true;onError?.()})
   for(const [key,url] of Object.entries(artwork))this.load.image(key,url)
  }
  resizeBoard(){
   if(!this.boardPaint)return
   const width=this.scale.width,height=this.scale.height,zoom=width/BOARD.width
   logicalHeight=height/zoom
   if(Math.abs(logicalHeight-model.height)>0.1)model.resize(logicalHeight)
   this.cameras.main.setViewport(0,0,width,height).setZoom(zoom).centerOn(BOARD.width/2,logicalHeight/2)
   const bg=this.boardPaint;bg.clear();bg.lineStyle(1,0xcdded6,0.6)
   for(let y=26;y<logicalHeight;y+=32){bg.beginPath();bg.moveTo(8,y);bg.lineTo(352,y);bg.strokePath()}
   bg.lineStyle(2,0xb8cec5);bg.strokeRoundedRect(7,10,346,logicalHeight-18,12)
  }
  create(){
   if(disposed){this.game.destroy(true);return}
   if(failed)return
   this.paddleOrigins=sheetFrames(this,'brick-pongi',true);sheetFrames(this,'brick-shark')
   this.cameras.main.setBackgroundColor('#edf5f0')
   for(let hp=1;hp<=4;hp++)trimTileFrame(this,'brick-tile-'+hp)
   this.boardPaint=this.add.graphics().setDepth(0)
   this.paint=this.add.graphics().setDepth(2)
   this.resizeBoard()
   this.scale.on('resize',()=>this.resizeBoard())
   this.paddle=this.add.image(180,model.paddleY,'brick-pongi',0).setDisplaySize(102,78).setDepth(3)
   this.ball=this.add.circle(180,450,6,0xffffff).setStrokeStyle(2,ink).setDepth(4)
   this.arrows=this.input.keyboard?.createCursorKeys()
   if(this.input.keyboard)this.keys={left:this.input.keyboard.addKey('A'),right:this.input.keyboard.addKey('D'),space:this.input.keyboard.addKey('SPACE')}
   this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{if(started&&!paused)model.move(this.cameras.main.getWorldPoint(pointer.x,pointer.y).x)})
   this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(started&&!paused){model.move(this.cameras.main.getWorldPoint(pointer.x,pointer.y).x);model.launch()}})
   this.input.keyboard?.on('keydown-SPACE',(event:KeyboardEvent)=>{if(parent.contains(document.activeElement)||document.activeElement===document.body){event.preventDefault();if(started&&!paused)model.launch()}})
   this.input.keyboard?.on('keydown-P',()=>{if(started&&model.phase==='playing'){paused=true;onPause()}})
   this.input.keyboard?.disableGlobalCapture()
   this.events.once('shutdown',()=>{sprites.clear();this.tiles.clear();this.impacts.clear()})
   onReady?.()
  }
  update(time:number,delta:number){
   if(disposed||!this.paint)return
   if(this.generation!==generation){this.generation=generation;this.impacts.clear();for(const image of this.tiles.values())image.destroy();this.tiles.clear()}
   if(!paused)this.effectClock+=Math.min(delta,100)
   if(started&&!paused){
    const direction=(this.arrows?.right.isDown||this.keys?.right.isDown?1:0)-(this.arrows?.left.isDown||this.keys?.left.isDown?1:0)
    if(direction)model.move(model.paddleX+direction*420*Math.min(delta/1000,0.05))
    model.step(delta/1000)
   }
   this.paint.clear()
   for(const hit of model.drainImpacts())this.impacts.set(hit.brickId,{...hit,at:this.effectClock})
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
    if(reduced)continue
    const radius=4+t*(hit.destroyed?25:12)
    this.paint.lineStyle(1.3,0xffffff,(1-t)*0.8);this.paint.strokeCircle(hit.x,hit.y,radius)
    for(let i=0;i<(hit.destroyed?6:3);i++){
     const angle=i*Math.PI*2/(hit.destroyed?6:3)+id*0.8,x=hit.x+Math.cos(angle)*radius,y=hit.y+Math.sin(angle)*radius*0.6
     this.paint.fillStyle(hit.destroyed?palette[(id%4)]:0xffffff,1-t);this.paint.fillRect(x-1.5,y-1.5,hit.destroyed?3:2,hit.destroyed?3:2)
    }
   }
   const frame=reduced?0:Math.floor(time/220)%4,origin=this.paddleOrigins[frame]
   this.paddle.setFrame(frame).setOrigin(origin.x,origin.y).setPosition(model.paddleX,model.paddleY).setAlpha(model.invulnerable>0&&Math.floor(model.invulnerable*12)%2?0.35:1)
   this.ball.setPosition(model.ball.x,model.ball.y).setVisible(model.phase==='playing'||model.phase==='ready')
   const live=new Set<string>()
   const sprite=(key:string,texture:string,x:number,y:number,w:number,h:number)=>{live.add(key);let image=sprites.get(key);if(!image){image=this.add.image(x,y,texture,texture==='brick-shark'?0:undefined).setDepth(2);sprites.set(key,image)}image.setPosition(x,y).setDisplaySize(w,h);return image}
   for(const d of model.drops){
    if(d.warning>0){this.paint.lineStyle(2,0xd38a65,0.5);this.paint.beginPath();this.paint.moveTo(d.x,d.y);this.paint.lineTo(d.x,model.paddleY);this.paint.strokePath()}
    sprite('drop'+d.id,d.kind==='shark'?'brick-shark':'brick-item',d.x,d.y,d.kind==='shark'?48:29,d.kind==='shark'?48:29).setFrame(d.kind==='shark'?(reduced?0:Math.floor(time/120)%4):'__BASE').setAlpha(d.warning>0?0.45:1)
   }
   for(const s of model.shots)sprite('shot'+s.id,'brick-torpedo',s.x,s.y,26,26)
   for(const [key,image] of sprites)if(!live.has(key)){image.destroy();sprites.delete(key)}
   const score=model.score(),signature=JSON.stringify(score)
   if(signature!==lastScore){lastScore=signature;onScore(score)}
  }
 }
 game=new Phaser.Game({type:Phaser.AUTO,parent,width:parent.clientWidth,height:parent.clientHeight,backgroundColor:'#edf5f0',scene:BrickScene,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},input:{activePointers:2},audio:{noAudio:true},banner:false})
 game.canvas.setAttribute('aria-label','퐁이 벽돌깨기 게임 화면. 좌우 방향키 또는 화면을 드래그해 이동하고 스페이스로 공을 발사하세요.')
 game.canvas.setAttribute('role','img');game.canvas.style.touchAction='none'
 const resize=new ResizeObserver(()=>{if(!disposed&&parent.clientWidth>0&&parent.clientHeight>0)game.scale.resize(parent.clientWidth,parent.clientHeight)});resize.observe(parent)
 return {start:()=>{model=new BrickPractice();model.resize(logicalHeight);generation++;started=true;paused=false;lastScore='';onScore(model.score())},launch:()=>model.launch(),next:()=>{model.nextRound();generation++},bank:()=>model.bank(),pause:value=>{paused=value},destroy:()=>{disposed=true;resize.disconnect();sprites.clear();game.destroy(true)}}
}
