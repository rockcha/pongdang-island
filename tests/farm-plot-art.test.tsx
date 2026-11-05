import {render,cleanup} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {cropKinds} from '@/features/farm/crop-catalog'
import {FarmPlotArt,plotGrowthImage,type PlotStage} from '@/features/farm/plot-art'
import {farmPlotImages} from '@/features/farm/plot-art-assets'
afterEach(cleanup)
it('keeps the sown image until 50 percent, uses one shared stem, then distinct mature crop images',()=>{
 const ready=new Set<string>()
 for(const crop of cropKinds){
  expect(plotGrowthImage('empty',crop)).toBeNull()
  expect(plotGrowthImage('growing',crop,0)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.2499)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.25)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.4999)).toContain('/sown.png')
  expect(plotGrowthImage('growing',crop,.5)).toContain('/stem.png')
  expect(plotGrowthImage('growing',crop,.999)).toContain('/stem.png')
  const mature=plotGrowthImage('ready',crop,1);expect(mature).toContain(`/${crop}-ready.png`);ready.add(mature)
  expect(plotGrowthImage('rotten',crop,1)).toBe(mature)
 }
 expect(ready.size).toBe(cropKinds.length)
})
it('uses a flooded base for planted rice while keeping all plot layers aligned',()=>{
 const {container,rerender}=render(<FarmPlotArt stage="growing" crop="wheat" progress={0}/>)
 for(const crop of cropKinds)for(const stage of ['empty','growing','ready','rotten'] as PlotStage[])for(const progress of [0,.25,.5,1]){
  rerender(<FarmPlotArt stage={stage} crop={crop} progress={progress}/>)
  const soil=container.querySelector('[data-plot-layer="soil"]')!,foreground=container.querySelector('[data-plot-layer="crop"]')
  expect(soil.getAttribute('href')).toBe(crop==='paddy'&&stage!=='empty'?farmPlotImages['paddy-soil']:farmPlotImages.empty)
  expect(soil.getAttribute('class')).toBeNull()
  expect(container.querySelector('svg')?.classList.contains('farm-crop-rotten')).toBe(stage==='rotten')
  expect(container.querySelectorAll('image')).toHaveLength(stage==='empty'?1:2)
  if(stage!=='empty'){
   expect(foreground?.getAttribute('href')).toBe(plotGrowthImage(stage,crop,progress))
   expect(foreground?.getAttribute('class')).toBeNull()
  }
  for(const image of container.querySelectorAll('image')){
   expect(['x','y','width','height'].map(key=>image.getAttribute(key))).toEqual(['0','0','512','512'])
  }
  expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 512 512')
 }
})
