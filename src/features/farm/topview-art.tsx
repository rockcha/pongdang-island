import {canRotateFarmObject,canFlipFarmArt,objectArtHeight,topviewItems,TILE,type FarmTool,type FarmRotation} from './topview-model'
import {type CropKind} from './crop-catalog'
import {farmBuildingArtPath} from './building-art'
import {FarmPlotArt} from './plot-art'
import {farmAnimalArt} from './animal-art'
import {farmDecorationArt} from './decoration-art'
import {isFarmAnimal} from './animal-catalog'
import {FarmAnimalIdle} from './animal-idle'
import {ConnectedFenceArt,isFarmFence,type FenceConnections} from './fence-art'

// Orthogonal ground footprints with a visible front face, shared by every test object.
type ArtProps={kind:FarmTool;compact?:boolean;idle?:boolean;idlePhase?:number;stage?:'empty'|'growing'|'ready'|'rotten';crop?:CropKind;progress?:number;rotation?:FarmRotation;flipped?:boolean;fenceConnections?:FenceConnections;fenceNetwork?:boolean}
export function TopviewArt({rotation=0,flipped=false,...props}:ArtProps){
 if(isFarmFence(props.kind)&&props.fenceConnections&&Object.values(props.fenceConnections).some(Boolean))return <ConnectedFenceArt kind={props.kind} connections={props.fenceConnections} postsOnly={props.fenceNetwork}/>
 const angle=canRotateFarmObject(props.kind)?rotation:0,mirror=canFlipFarmArt(props.kind)&&flipped
 if(!angle&&!mirror)return <FarmBaseArt {...props}/>
 const width=topviewItems[props.kind].w*TILE,height=objectArtHeight(props.kind),sideways=angle===90||angle===270,outWidth=sideways?height:width,outHeight=sideways?width:height
 const turn=angle===90?`translate(${height} 0) rotate(90)`:angle===180?`translate(${width} ${height}) rotate(180)`:angle===270?`translate(0 ${width}) rotate(270)`:undefined
 return <svg viewBox={`0 0 ${outWidth} ${outHeight}`} aria-hidden="true" data-art-rotation={angle} data-art-flipped={mirror||undefined}><g transform={mirror?`translate(${outWidth} 0) scale(-1 1)`:undefined}><g transform={turn}><svg width={width} height={height}><FarmBaseArt {...props}/></svg></g></g></svg>
}
function FarmBaseArt({kind,compact=false,idle=false,idlePhase=0,stage='empty',crop='wheat',progress}:ArtProps){
 if(idle&&isFarmAnimal(kind))return <FarmAnimalIdle kind={kind} phase={idlePhase}/>
 if(isFarmAnimal(kind)){const art=farmAnimalArt[kind];return <svg viewBox={art.viewBox} aria-hidden="true"><image href={art.path} width="512" height="512"/></svg>}
 const building=farmBuildingArtPath(kind)
 if(building)return <svg viewBox={compact&&(kind==='seedShop'||kind==='store'||kind==='agriShop'||kind==='mediumBakery')?'0 60 120 60':'0 0 120 120'} aria-hidden="true"><image href={building} width="120" height="120" preserveAspectRatio="xMidYMid meet"/></svg>
 const decoration=farmDecorationArt[kind as keyof typeof farmDecorationArt]
 if(decoration)return <svg viewBox={decoration.viewBox} preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-farm-decoration={kind}><image href={decoration.path} width="512" height="512"/></svg>
 if(kind==='plot')return <FarmPlotArt stage={stage} crop={crop} progress={progress}/>
 return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="3" width="38" height="34" rx="4" fill="#9e754d"/>{[10,21,32].map(x=><g key={x}><path d={`M${x} 7v26`} stroke="#6f5138" strokeWidth="2"/>{stage!=='empty'&&[13,25].map(y=><g key={y}><path d={`M${x} ${y}l-5-4m5 4 5-4`} stroke={stage==='ready'&&crop==='wheat'?'#d9bc63':'#78984c'} strokeWidth="3" strokeLinecap="round"/>{stage==='ready'&&<circle cx={x} cy={y+2} r="3" fill={crop==='potato'?'#b9a17b':'#d8b65a'}/>}</g>)}</g>)}</svg>
}
