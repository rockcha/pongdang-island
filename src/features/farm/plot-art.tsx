import type {CropKind} from './crop-catalog'
import {farmPlotImages,farmPlotViewBox} from './plot-art-assets'

export type PlotStage='empty'|'growing'|'ready'|'rotten'
export function plotGrowthImage(stage:PlotStage,crop:CropKind,progress=0){
 if(stage==='empty')return farmPlotImages.empty
 if(stage==='ready'||stage==='rotten'||progress>=1)return farmPlotImages[`${crop}-ready`]
 return progress>=.5?farmPlotImages.stem:farmPlotImages.sown
}
export function FarmPlotArt({stage,crop,progress=0}:{stage:PlotStage;crop:CropKind;progress?:number}){
 const mature=stage==='ready'||stage==='rotten'||progress>=1,image=plotGrowthImage(stage,crop,progress)
 return <svg className={stage==='rotten'?'farm-crop-rotten':undefined} viewBox={farmPlotViewBox} aria-hidden="true" data-plot-stage={mature?stage==='rotten'?'rotten':'ready':stage==='empty'?'empty':progress<.5?'sown':'stem'}>
  <image href={image} width="512" height="512"/>
 </svg>
}
