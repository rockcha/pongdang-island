export type Point = {x:number;y:number}
export type OceanState = {player:Point;camera:Point;angle:number;moving:boolean}

// Keep the diver inside a central safe area, then move the camera without world bounds.
export function advanceOcean(state:OceanState,input:Point,width:number,height:number,seconds:number,speed:number):OceanState {
  const length=Math.hypot(input.x,input.y)
  const dx=length?input.x/length*speed*seconds:0,dy=length?input.y/length*speed*seconds:0
  const player={x:state.player.x+dx,y:state.player.y+dy}
  const camera={...state.camera}
  const marginX=width*.28,marginY=height*.28
  const sx=player.x-camera.x,sy=player.y-camera.y
  if(sx<marginX)camera.x=player.x-marginX
  if(sx>width-marginX)camera.x=player.x-width+marginX
  if(sy<marginY)camera.y=player.y-marginY
  if(sy>height-marginY)camera.y=player.y-height+marginY
  return {player,camera,angle:length?Math.atan2(input.y,input.x):state.angle,moving:!!length}
}

const random=(x:number,y:number,n:number)=>{const v=Math.sin(x*127.1+y*311.7+n*74.7)*43758.5453;return v-Math.floor(v)}
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}

export function drawOcean(ctx:CanvasRenderingContext2D,width:number,height:number,state:OceanState,time:number,submarine:boolean){
  const bg=ctx.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#147d95');bg.addColorStop(.5,'#075570');bg.addColorStop(1,'#062f4c');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height)
  // Rebuild only visible deterministic tiles: revisiting a location restores its scenery.
  const tile=360,{camera,player}=state
  for(let x=Math.floor(camera.x/tile)-1;x<=Math.ceil((camera.x+width)/tile);x++)for(let y=Math.floor(camera.y/tile)-1;y<=Math.ceil((camera.y+height)/tile);y++){
    const px=x*tile-camera.x,py=y*tile-camera.y
    ctx.save();ctx.translate(px,py)
    for(let n=0;n<9;n++){
      const bx=random(x,y,n)*tile,by=random(x,y,n+10)*tile
      ellipse(ctx,bx,by,1.5,1.5,'#9ee4da40')
    }
    const ax=60+random(x,y,20)*240,ay=60+random(x,y,21)*240
    ellipse(ctx,ax,ay+14,56,17,'#042d4260')
    ellipse(ctx,ax,ay,43,18,'#31777b');ellipse(ctx,ax-9,ay-8,23,12,'#438b89')
    for(let n=0;n<5;n++){
      const stem=ax-32+n*15,h=24+random(x,y,n+30)*55
      ctx.strokeStyle=n%2?'#48bca3':'#278f85';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(stem,ay);ctx.bezierCurveTo(stem-15,ay-h*.4,stem+Math.sin(time+n+x)*13,ay-h*.7,stem+Math.sin(time+n+x)*10,ay-h);ctx.stroke()
    }
    const fx=random(x,y,40)*tile+Math.sin(time*.4+x)*28,fy=random(x,y,41)*tile
    ctx.fillStyle=['#f4bc75','#7dd5ca','#b2b7ef'][Math.floor(random(x,y,42)*3)];ctx.beginPath();ctx.moveTo(fx-14,fy);ctx.lineTo(fx-24,fy-9);ctx.lineTo(fx-24,fy+9);ctx.fill();ellipse(ctx,fx,fy,17,8,ctx.fillStyle as string);ellipse(ctx,fx+9,fy-2,2,2,'#153949')
    ctx.restore()
  }
  ctx.save();ctx.globalAlpha=.055;ctx.fillStyle='#c8fff1'
  for(let i=-1;i<6;i++){const x=i*width/4-(camera.x*.12)%(width/4);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+45,0);ctx.lineTo(x+width*.35,height);ctx.lineTo(x+width*.12,height);ctx.fill()}ctx.restore()
  const sx=player.x-camera.x,sy=player.y-camera.y
  ctx.save();ctx.translate(sx,sy)
  if(state.moving)for(let i=0;i<5;i++){
    const distance=36+((time*55+i*13)%70)
    ctx.strokeStyle='#c3f8f17a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(-Math.cos(state.angle)*distance,-Math.sin(state.angle)*distance+Math.sin(i+time)*9,2+i*.65,0,Math.PI*2);ctx.stroke()
  }
  ctx.rotate(state.angle)
  if(submarine){
    ctx.fillStyle='#f2c66c';ctx.fillRect(-16,-27,32,13);ctx.fillRect(-8,-38,8,18);ctx.fillRect(-8,-38,20,6)
    ellipse(ctx,0,0,55,27,'#d89b43');ellipse(ctx,4,-4,49,23,'#f6cb71')
    ctx.fillStyle='#d3933e';ctx.fillRect(-64,-17,15,34);ellipse(ctx,-62,0,4,12+Math.sin(time*25)*5,'#e9d0a0')
    ellipse(ctx,15,0,19,19,'#9c733b');ellipse(ctx,15,0,14,14,'#a0e3df');ellipse(ctx,19,-4,5,6,'#e5ffef')
    ctx.fillStyle='#fff3b6';ctx.beginPath();ctx.moveTo(51,-9);ctx.lineTo(170,-45);ctx.lineTo(170,45);ctx.lineTo(51,9);ctx.globalAlpha=.12;ctx.fill();ctx.globalAlpha=1
  }else{
    // Small animated otter, drawn in game coordinates so all swimming directions work.
    const kick=state.moving?Math.sin(time*13)*9:Math.sin(time*3)*2
    ellipse(ctx,-36,0,26,10,'#956544');ellipse(ctx,-7,0,30,19,'#bf895d');ellipse(ctx,0,0,23,13,'#f5d6a4')
    ellipse(ctx,-15,-19-kick*.4,15,7,'#a9754f');ellipse(ctx,-15,19+kick*.4,15,7,'#a9754f')
    ellipse(ctx,15,-18,9,9,'#956544');ellipse(ctx,15,18,9,9,'#956544');ellipse(ctx,26,0,25,22,'#cf9b6a')
    ellipse(ctx,35,0,15,15,'#ffe2b3');ellipse(ctx,35,-10,3,3.5,'#272526');ellipse(ctx,35,10,3,3.5,'#272526');ellipse(ctx,47,0,4,4,'#513b32')
    ctx.fillStyle='#f5a58d';ctx.font='20px sans-serif';ctx.fillText('✦',11,-9)
  }
  ctx.restore()
}
