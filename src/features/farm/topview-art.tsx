import type {FarmTool} from './topview-model'
import {type CropKind} from './crop-catalog'
import {farmBuildingArtPath} from './building-art'
import {FarmPlotArt} from './plot-art'
import {farmAnimalArt} from './animal-art'
import {farmDecorationArt} from './decoration-art'
import {isFarmAnimal} from './animal-catalog'

// Orthogonal ground footprints with a visible front face, shared by every test object.
export function TopviewArt({kind,stage='empty',crop='wheat',progress}:{kind:FarmTool;stage?:'empty'|'growing'|'ready'|'rotten';crop?:CropKind;progress?:number}){
 if(isFarmAnimal(kind)){const art=farmAnimalArt[kind];return <svg viewBox={art.viewBox} aria-hidden="true"><image href={art.path} width="512" height="512"/></svg>}
 const building=farmBuildingArtPath(kind)
 if(building)return <svg viewBox="0 0 120 120" aria-hidden="true"><image href={building} width="120" height="120" preserveAspectRatio="xMidYMid meet"/></svg>
 const decoration=farmDecorationArt[kind as keyof typeof farmDecorationArt]
 if(decoration)return <svg viewBox={decoration.viewBox} preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-farm-decoration={kind}><image href={decoration.path} width="512" height="512"/></svg>
 if(kind==='plot')return <FarmPlotArt stage={stage} crop={crop} progress={progress}/>
 if(kind==='sheep')return <LegacyAnimalArt kind={kind}/>
 return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="3" width="38" height="34" rx="4" fill="#9e754d"/>{[10,21,32].map(x=><g key={x}><path d={`M${x} 7v26`} stroke="#6f5138" strokeWidth="2"/>{stage!=='empty'&&[13,25].map(y=><g key={y}><path d={`M${x} ${y}l-5-4m5 4 5-4`} stroke={stage==='ready'&&crop==='wheat'?'#d9bc63':'#78984c'} strokeWidth="3" strokeLinecap="round"/>{stage==='ready'&&<circle cx={x} cy={y+2} r="3" fill={crop==='potato'?'#b9a17b':'#d8b65a'}/>}</g>)}</g>)}</svg>
}

function LegacyAnimalArt({kind}:{kind:'cow'|'chicken'|'sheep'}){
 return <svg viewBox="0 0 80 66" aria-hidden="true"><ellipse cx="40" cy="56" rx="27" ry="6" fill="#29472d" opacity=".15"/>{kind==='chicken'?<><ellipse cx="36" cy="37" rx="18" ry="16" fill="#fff3d1" stroke="#a88d61" strokeWidth="1.6"/><path d="m22 32-9-11 3 20" fill="#f4d6a0"/><circle cx="52" cy="25" r="11" fill="#fff3d1" stroke="#a88d61"/><path d="m60 25 10 4-11 4" fill="#d99c43"/><path d="M47 15q-4-10 2-9 4-7 7 2 8-2 5 9" fill="#b85a47"/><circle cx="55" cy="23" r="2" fill="#493d2f"/><path d="M29 52v7m13-7v7" stroke="#b98b42" strokeWidth="3"/><path d="M29 35q12 14 18 0" fill="none" stroke="#d6bd8d" strokeWidth="2"/></>:<><path d="M23 44v14m13-13v13m18-13v13m10-16v14" stroke={kind==='cow'?'#806e57':'#a58d6d'} strokeWidth="6" strokeLinecap="round"/><ellipse cx="38" cy="31" rx="27" ry="20" fill={kind==='cow'?'#f2ead9':'#f5eedc'} stroke="#b6a17d" strokeWidth="1.5"/>{kind==='cow'?<><path d="M23 15q20-7 15 12t-18 3M42 39q13-11 21 1l-8 8H42" fill="#596354"/><path d="m61 21 5-10 3 14m-18-2-5-10-1 15" fill="#ceba8e" stroke="#a78a61"/></>:Array.from({length:7},(_,i)=><circle key={i} cx={19+i*6} cy={22+(i%2)*7} r="9" fill="#fff5dd"/>)}<ellipse cx="60" cy="35" rx="13" ry="15" fill={kind==='cow'?'#eee4d2':'#b5a48b'}/><ellipse cx="63" cy="44" rx="12" ry="7" fill={kind==='cow'?'#d7ac97':'#a39177'}/><path d="m49 26-8-6 3 12m27-7 8-5-3 12" fill="#a08b6d"/><circle cx="56" cy="34" r="1.8" fill="#443c31"/><circle cx="67" cy="34" r="1.8" fill="#443c31"/></>}</svg>
}
