import {render,cleanup} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {cropKinds} from '@/features/farm/crop-catalog'
import {FarmPlotArt,plotGrowthImage} from '@/features/farm/plot-art'
afterEach(cleanup)
it('keeps the sown image until 50 percent, uses one shared stem, then distinct mature crop images',()=>{
 const ready=new Set<string>()
 for(const crop of cropKinds){
  expect(plotGrowthImage('empty',crop)).toContain('/empty.png')
  expect(plotGrowthImage('growing',crop,0)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.2499)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.25)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.4999)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.5)).toContain('/stem.png')
  expect(plotGrowthImage('growing',crop,.999)).toContain('/stem.png')
  const mature=plotGrowthImage('ready',crop,1);expect(mature).toContain(`/${crop}-ready.png`);ready.add(mature)
  expect(plotGrowthImage('rotten',crop,1)).toBe(mature)
 }
 expect(ready.size).toBe(7)
})
it('renders exactly one image per plot and keeps the same square frame at every growth stage',()=>{
 const {container,rerender}=render(<FarmPlotArt stage="growing" crop="wheat" progress={0}/>)
 for(const progress of [0,.25,.5,1]){
  rerender(<FarmPlotArt stage="growing" crop="wheat" progress={progress}/>)
  expect(container.querySelectorAll('image')).toHaveLength(1)
  expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 512 512')
 }
})
