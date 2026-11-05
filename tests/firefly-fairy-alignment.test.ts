// @vitest-environment node
import {expect,it} from 'vitest'
import sharp from 'sharp'
import {swimFrameLayout} from '../src/features/aquarium/swim-frame-layout'
import {mythicSwimAsset,mythicSwimLayout} from '../src/features/aquarium/mythic-swim'

// Reviewed face, cheek and shoulder patches exclude moving wings, petals and
// the queen's lifted lantern. Compare actual pixels, not the correction table.
const cases=[
 {path:'fish/epic/firefly-evening-lullaby-fairy_v1_sprite.png',columns:2,patches:[[470,300,40,40],[450,315,35,35],[420,350,35,35]]},
 {path:'fish/mythic/firefly-millennium-lantern-queen_swim8_v1_sprite.png',columns:4,patches:[[288,204,25,25],[265,225,25,25],[280,215,25,25]]},
]
it.each(cases)('anchors $path to its anatomy throughout the animation',async({path,columns,patches})=>{
 const asset=mythicSwimAsset(path,'mythic')
 const file=asset?'public'+asset.url:'assets/storage-upload/new/20261029-032100/'+path
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const cell=info.width/columns
 for(let frame=0;frame<columns*2;frame++){
  const layout=asset?mythicSwimLayout(asset.path,frame)!:swimFrameLayout(path,frame)
  const dx=Math.round((layout.originX-.5)*cell),dy=Math.round((layout.originY-.5)*cell)
  for(const [px,py,pw,ph] of patches){
   // Allow two source pixels of local drawing deformation around the shared
   // body anchor (under one display pixel), not whole-frame translation.
   let best=Infinity
   for(let ey=-2;ey<=2;ey++)for(let ex=-2;ex<=2;ex++){
   let error=0,samples=0
   for(let y=0;y<ph;y+=3)for(let x=0;x<pw;x+=3){
    const a=((py+y)*info.width+px+x)*4
    const b=((Math.floor(frame/columns)*cell+py+y+dy+ey)*info.width+frame%columns*cell+px+x+dx+ex)*4
    if(data[a+3]<180)continue
    for(let channel=0;channel<4;channel++){error+=(data[a+channel]-data[b+channel])**2;samples++}
   }
   expect(samples).toBeGreaterThan(100)
   best=Math.min(best,Math.sqrt(error/samples))
   }
   expect(best,`frame ${frame}, anatomy patch ${px},${py}`).toBeLessThan(38)
  }
 }
})
