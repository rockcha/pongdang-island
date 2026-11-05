import {useId} from 'react'
import type {CropKind} from './crop-catalog'
import {farmPlotImages,farmPlotViewBox} from './plot-art-assets'

export type PlotStage='empty'|'growing'|'ready'|'rotten'
export function plotGrowthImage(stage:PlotStage,crop:CropKind,progress=0){
 if(stage==='empty')return null
 if(stage==='ready'||stage==='rotten'||progress>=1)return farmPlotImages[`${crop}-ready`]
 return progress>=.5?farmPlotImages.stem:farmPlotImages.sown
}
export function FarmPlotArt({stage,crop,progress=0}:{stage:PlotStage;crop:CropKind;progress?:number}){
 const outline=useId(),soften=outline+'-soften'
 const image=plotGrowthImage(stage,crop,progress)
 const visibleStage=stage==='empty'?'empty':stage==='rotten'?'rotten':stage==='ready'||progress>=1?'ready':progress<.5?'sown':'stem'
 return <svg className={stage==='rotten'?'farm-crop-rotten':undefined} viewBox={farmPlotViewBox} aria-hidden="true" data-plot-stage={visibleStage}>
  <defs>
   <filter id={soften} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2"/></filter>
   <mask id={outline} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect x="6" y="6" width="500" height="500" rx="28" fill="white" filter={`url(#${soften})`}/></mask>
  </defs>
  <image data-plot-layer="soil" href={farmPlotImages.empty} x="0" y="0" width="512" height="512" mask={`url(#${outline})`}/>
  {image&&<image data-plot-layer="crop" href={image} x="0" y="0" width="512" height="512"/>}
 </svg>
}
