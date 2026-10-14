// @vitest-environment node
import { expect, it } from 'vitest'
import { pickSailingScene, sailingScenes } from '@/features/regions/sailing-scenes'
it('selects all three departure scenes across equal probability ranges',()=>{
 expect(pickSailingScene(()=>0)).toBe(sailingScenes[0])
 expect(pickSailingScene(()=>0.34)).toBe(sailingScenes[1])
 expect(pickSailingScene(()=>0.999)).toBe(sailingScenes[2])
 expect(new Set(sailingScenes.map(scene=>scene.image)).size).toBe(3)
})
