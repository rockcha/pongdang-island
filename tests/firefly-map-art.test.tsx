import {cleanup,render} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {MapPieceArtwork} from '@/features/regions/map-piece-progress'
import {fishingEnvironment} from '@/features/fishing/fishing-environment'
import {fishingBannerPath} from '@/features/regions/fishing-banner'
import type {Region} from '@/features/regions/api'

afterEach(cleanup)
it('covers the entire map with eight equal non-overlapping fragments',()=>{
 const region={id:'firefly',name:'반딧불 요정여울',mapPieceCount:8,mapPieces:[1,2,3,4,5,6,7,8],map_image_path:'/regions/firefly/map-v1.png',unlocked:true} as Region
 const {container}=render(<MapPieceArtwork region={region}/>)
 const pieces=Array.from(container.querySelectorAll<HTMLElement>('[data-map-piece]'))
 expect(pieces).toHaveLength(8)
 const cells=pieces.map(piece=>{
  expect(piece.dataset.found).toBe('true')
  const [top,right,bottom,left]=piece.style.clipPath.match(/[\d.]+/g)!.map(Number)
  return {left,top,width:100-left-right,height:100-top-bottom}
 })
 expect(cells.every(c=>c.width===25&&c.height===50)).toBe(true)
 expect(cells.reduce((sum,c)=>sum+c.width*c.height,0)).toBe(10000)
 expect(new Set(cells.map(c=>`${c.left},${c.top}`)).size).toBe(8)
})
it('uses fairy scenery, close water and a separate wooden dock throughout fishing',()=>{
 const env=fishingEnvironment('firefly')
 expect(env).toMatchObject({id:'firefly',material:'wood',src:'/fishing/close-water/firefly-v1.png',frontSrc:'/regions/firefly/scenery-v1.png',platformSrc:'/fishing/platforms/firefly-v1.png'})
 expect(fishingBannerPath('firefly')).toBe(env.frontSrc)
})
