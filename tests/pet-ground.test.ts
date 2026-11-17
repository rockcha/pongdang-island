import sharp from 'sharp'
import {expect,it} from 'vitest'
import {petSpecies,petUsesAtlas} from '@/features/pets/pet-catalog'
import {petSpriteSheetUrl} from '@/features/pets/pet-sprite-sheets'
import {petFrameDrawLayout} from '@/features/pets/pet-draw-layout'

it.each(petSpecies)('keeps $name grounded across all resting, eating and interaction frames',async pet=>{
  const atlas=petUsesAtlas(pet.id)
  const kinds=atlas?['happy'] as const:['idle','happy','eat','needs'] as const
  const grounds:number[]=[]
  for(const kind of kinds){
    const sheet=atlas?'atlas16':kind==='idle'?'idle8':kind==='needs'?'needs8':kind==='eat'?'eat8':'happy8'
    const {data,info}=await sharp(`public${petSpriteSheetUrl(pet.id,sheet)}`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    const cell=info.width/4
    for(let frame=0;frame<(atlas?16:8);frame++){
      const rows:number[]=[]
      let top=Infinity,bottom=0
      for(let y=0;y<cell;y++){
        let occupied=0
        for(let x=0;x<cell;x++){
          const alpha=data[((Math.floor(frame/4)*cell+y)*info.width+frame%4*cell+x)*4+3]
          if(alpha>=128)occupied++
          if(alpha>=32){top=Math.min(top,y);bottom=Math.max(bottom,y)}
        }
        if(occupied>=cell*.035)rows.push(y)
      }
      const draw=petFrameDrawLayout(pet.id,kind,frame)
      grounds.push(draw.y+rows.at(-1)!*draw.scale)
      expect(draw.y+top*draw.scale).toBeGreaterThanOrEqual(15)
      expect(draw.y+bottom*draw.scale).toBeLessThanOrEqual(580)
    }
  }
  expect(Math.max(...grounds)-Math.min(...grounds)).toBeLessThan(.001)
},30000)
