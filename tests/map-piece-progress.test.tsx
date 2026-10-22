import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {MapPieceArtwork,MapPieceProgress} from '@/features/regions/map-piece-progress'
import type {Region} from '@/features/regions/api'
afterEach(cleanup)
const region={id:'nyamnyam',name:'냠냠 한상바다',map_image_path:'/map.png',mapPieceCount:4,mapPieces:[1,3],unlocked:false} as Region
it('reveals only the exact discovered quadrants and completes without seams',()=>{
 const view=render(<MapPieceProgress region={region}/>)
 expect(screen.getByRole('img',{name:'냠냠 한상바다 지도 2/4조각 수집'})).toBeTruthy()
 expect(view.container.querySelectorAll('[data-found="true"]')).toHaveLength(2)
 expect(screen.queryByLabelText('지도 조각 수집 현황')).toBeNull()
 expect(view.container.querySelector('[data-map-piece="1"]')?.getAttribute('style')).toContain('inset(0% 50% 50% 0%)')
 expect(view.container.querySelector('[data-map-piece="3"]')?.getAttribute('style')).toContain('inset(50% 50% 0% 0%)')
 view.rerender(<MapPieceProgress region={{...region,mapPieces:[1,2,3,4],unlocked:true}}/>)
 expect(view.container.querySelectorAll('[data-found="true"]')).toHaveLength(4)
 expect(screen.queryByText('지도 조각 4/4')).toBeNull()
})
it('uses the map image and collected quadrants in the top thumbnail',()=>{
 const view=render(<MapPieceArtwork region={region} compact/>)
 expect(view.container.querySelector('[role="img"]')?.className).toContain('size-16')
 expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/map.png')
 expect(view.container.querySelectorAll('[data-found="true"]')).toHaveLength(2)
 expect(screen.queryByText('지도 조각 2/4')).toBeNull()
})
it('keeps legacy maps out of the piece display',()=>{
 const view=render(<MapPieceProgress region={{...region,mapPieceCount:null}}/>)
 expect(view.container.childElementCount).toBe(0)
})
