import {cleanup,render} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {fenceConnections,fenceSegments,FarmFenceRails,ConnectedFenceArt} from '@/features/farm/fence-art'
import {TopviewArt} from '@/features/farm/topview-art'
import type {TopviewObject} from '@/features/farm/topview-model'

afterEach(cleanup)
it('connects mixed fence directions across corners and junctions, and disconnects after moving or removing a neighbor',()=>{
 const center:TopviewObject={id:1,kind:'fence',x:5,y:5}
 const objects:TopviewObject[]=[center,{id:2,kind:'fenceWhite',x:6,y:5},{id:3,kind:'fenceDark',x:5,y:6},{id:4,kind:'fence',x:5,y:4},{id:5,kind:'flowers',x:4,y:5},{id:6,kind:'fence',x:6,y:6}]
 expect(fenceConnections(objects,center)).toEqual({north:true,east:true,south:true,west:false})
 const {container,rerender}=render(<TopviewArt kind="fence" flipped fenceConnections={fenceConnections(objects,center)}/>)
 expect(container.querySelector('[data-farm-connected-fence="nes"]')).toBeTruthy()
 expect(container.querySelectorAll('[data-fence-arm]')).toHaveLength(3)
 expect(container.querySelector('[data-art-flipped]')).toBeNull()
 const moved=objects.filter(o=>o.id!==3).map(o=>o.id===2?{...o,x:7}:o)
 expect(fenceConnections(moved,center)).toEqual({north:true,east:false,south:false,west:false})
 rerender(<TopviewArt kind="fence" fenceConnections={fenceConnections([center],center)}/>)
 expect(container.querySelector('[data-farm-connected-fence]')).toBeNull()
 expect(container.querySelector('[data-farm-decoration="fence"]')).toBeTruthy()
})
it('draws one continuous span per neighboring pair behind one shared post per fence',()=>{
 const objects:TopviewObject[]=Array.from({length:6},(_,id)=>({id,kind:'fence',x:id%3,y:Math.floor(id/3)}))
 expect(fenceSegments(objects)).toHaveLength(7)
 const {container}=render(<svg><FarmFenceRails objects={objects}/>{objects.map(object=><ConnectedFenceArt key={object.id} postsOnly connections={fenceConnections(objects,object)}/>)}</svg>)
 expect(container.querySelectorAll('[data-fence-span]')).toHaveLength(7)
 expect(container.querySelectorAll('[data-farm-fence-rails] image')).toHaveLength(14)
 expect(container.querySelectorAll('[data-farm-fence-rails] svg[width="40"]')).toHaveLength(14)
 expect(container.querySelectorAll('[data-farm-connected-fence] image')).toHaveLength(6)
 expect(fenceSegments(objects.filter(o=>o.id!==1))).toHaveLength(4)
})
