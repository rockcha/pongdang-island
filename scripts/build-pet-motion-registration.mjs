import fs from 'node:fs'
import sharp from 'sharp'
const root='src/features/pets',read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const measured=read('assets/storage-upload/new/20261110-160000/motion-landmarks.json').pets
const tables={idle:read(`${root}/pet-calm-idle-layouts.json`),happy:read(`${root}/pet-sprite-layouts.json`),eat:read(`${root}/pet-eating-layouts.json`),needs:read(`${root}/pet-needs-layouts.json`)}
const blinks=read(`${root}/pet-needs-blink-layouts.json`),out={},review={}
for(const [id,poses] of Object.entries(measured)){
  const source={}
  for(const [kind,suffix] of [['idle','idle8_v2'],['happy','happy8_v1'],['eat','eat8_v1'],['needs','needs8_v1']]){
    const sheet=tables[kind][`${id}-${kind}`],cell=sheet.cell
    const {data,info}=await sharp(`public/pets/${id}_${suffix}_sprite.png`).extract({left:0,top:0,width:cell,height:cell}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    let floor=0
    for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)if(data[(y*cell+x)*info.channels+3]>=128)floor=Math.max(floor,y)
    const eyes=poses[kind].map(([x,y])=>[x*cell/400,y*cell/400]),mid=[(eyes[0][0]+eyes[1][0])/2,(eyes[0][1]+eyes[1][1])/2],distance=Math.hypot(eyes[1][0]-eyes[0][0],eyes[1][1]-eyes[0][1])
    source[kind]={sheet,floor,eyes,mid,distance}
  }
  const ref=source.idle,eyeX=(ref.mid[0]-ref.sheet.anchor[0])*ref.sheet.scale,eyeY=(ref.mid[1]-ref.sheet.anchor[1])*ref.sheet.scale,floorY=(ref.floor-ref.sheet.anchor[1])*ref.sheet.scale
  out[id]={};review[id]={}
  for(const [kind,p] of Object.entries(source)){
    const scale=ref.distance*ref.sheet.scale/p.distance
    const x=eyeX-p.mid[0]*scale
    // Split small anatomical differences between face and feet. One rigid
    // transform per sheet, shared by every frame; never recenter per pose.
    const y=((eyeY-p.mid[1]*scale)+(floorY-p.floor*scale))/2
    out[id][kind]={scale,anchor:[-x/scale,-y/scale]}
    review[id][kind]={cell:p.sheet.cell,eyes:p.eyes,floor:p.floor,eyeDistance:p.distance*scale,eyeCenter:[eyeX,y+p.mid[1]*scale],floorY:y+p.floor*scale,eyeResidual:y+p.mid[1]*scale-eyeY,floorResidual:y+p.floor*scale-floorY}
  }
  const original=source.needs.sheet,aligned=out[id].needs,blink=blinks[`${id}-needs-blink`]
  const ratio=original.scale/blink.scale
  out[id].needsBlink={scale:blink.scale*aligned.scale/original.scale,anchor:blink.anchor.map((v,i)=>v+(aligned.anchor[i]-original.anchor[i])*ratio)}
}
fs.writeFileSync(`${root}/pet-motion-registration.json`,JSON.stringify(out,null,2)+'\n')
fs.writeFileSync('assets/storage-upload/new/20261110-160000/motion-registration-review.json',JSON.stringify(review,null,2)+'\n')
console.log('Registered four pets against one idle face size, center and floor. Blink patches inherit the needs transform.')
