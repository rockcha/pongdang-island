import {nyamnyamArt} from '@/features/regions/nyamnyam-art'
import {plunderArt} from '@/features/regions/plunder-art'
import {mechsanctumArt} from '@/features/regions/mechsanctum-art'
import {fireflyArt} from '@/features/regions/firefly-art'
import {pharaohArt} from '@/features/regions/pharaoh-art'
import { memo,useState } from 'react'

export const fishingEnvironments={
 pharaoh:{name:'파라오의 황금해',water:'#c28b38',deck:'#d5b786',edge:'#a87530',waterEnd:1536,deckStart:1065},
 firefly:{name:'반딧불 요정여울',water:'#287e76',deck:'#98693e',edge:'#e0c27d',waterEnd:1536,deckStart:1065},
 mechsanctum:{name:'기계신의 성소',water:'#236d70',deck:'#806846',edge:'#d6b77a',waterEnd:1536,deckStart:1065},
 plunder:{name:'약탈자의 항로',water:'#125965',deck:'#51372a',edge:'#c39450',waterEnd:1536,deckStart:1065},
 nyamnyam:{name:'냠냠 한상바다',water:'#28bace',deck:'#deb97c',edge:'#966a39',waterEnd:1536,deckStart:1065},
 siren:{name:'세이렌의 해협',water:'#3bb9b0',deck:'#e9ddc4',edge:'#b39559',waterEnd:990,deckStart:1065},
 primal:{name:'태고의 원시섬',water:'#3f9f95',deck:'#a59470',edge:'#586c43',waterEnd:1048,deckStart:1058},
 mukhyang:{name:'묵향 해역',water:'#c8d6d2',deck:'#384644',edge:'#86978a',waterEnd:1170,deckStart:1260},
 scrapisle:{name:'녹빛 고물섬',water:'#578c78',deck:'#66817b',edge:'#a7815d',waterEnd:990,deckStart:1065},
 cloudferry:{name:'지브리의 구름나루',water:'#60bfb5',deck:'#e8e6db',edge:'#bac9c7',waterEnd:990,deckStart:1065},
 whitenight:{name:'백야의 빙해',water:'#4c9cba',deck:'#d8edf7',edge:'#8ab9d1',waterEnd:990,deckStart:1065},
 bluegrove:{name:'푸른골 해역',water:'#38b5cd',deck:'#b7c4c3',edge:'#829b98',waterEnd:990,deckStart:1065},
 pongdang:{name:'퐁당섬 앞바다',water:'#529dc7',deck:'#b88b61',edge:'#e4c695',waterEnd:1048,deckStart:1058},
 coral:{name:'산호빛 여울',water:'#51b2ba',deck:'#dbcdb5',edge:'#c79a8b',waterEnd:1100,deckStart:1128},
 mistmoon:{name:'안개달 해역',water:'#6678ad',deck:'#5a657b',edge:'#a2adc1',waterEnd:980,deckStart:1064},
 starruins:{name:'별잠 유적',water:'#468ea5',deck:'#7b9495',edge:'#c4b88e',waterEnd:1078,deckStart:1128},
 dreamabyss:{name:'꿈먹는 심연',water:'#403f75',deck:'#292c43',edge:'#8072b8',waterEnd:1020,deckStart:1092},
} as const
const platformMaterials:Record<string,string>={plunder:'wood',nyamnyam:'bamboo',siren:'marble',pongdang:'wood',whitenight:'ice',primal:'roots',coral:'limestone',mistmoon:'wet-stone',starruins:'ruins',dreamabyss:'basalt',bluegrove:'riverstone',cloudferry:'cloud-stone',scrapisle:'metal'}
export function fishingEnvironment(regionId:string){
 const id=regionId in fishingEnvironments?regionId as keyof typeof fishingEnvironments:'pongdang'
 if(id==='pharaoh')return {id,...fishingEnvironments[id],src:pharaohArt.fishing.water,frontSrc:pharaohArt.fishing.scenery,frontWaterEnd:1536,platformFallbackSrc:pharaohArt.fishing.scenery,platformSrc:pharaohArt.fishing.platform,material:'sandstone'}
 if(id==='firefly')return {id,...fishingEnvironments[id],src:fireflyArt.fishing.water,frontSrc:fireflyArt.fishing.scenery,frontWaterEnd:1536,platformFallbackSrc:fireflyArt.fishing.scenery,platformSrc:fireflyArt.fishing.platform,material:'wood'}
 if(id==='mechsanctum')return {id,...fishingEnvironments[id],src:mechsanctumArt.fishing.water,frontSrc:mechsanctumArt.fishing.scenery,frontWaterEnd:1536,platformFallbackSrc:mechsanctumArt.fishing.scenery,platformSrc:mechsanctumArt.fishing.platform,material:'metal'}
 return {id,...fishingEnvironments[id],
  src:id==='plunder'?plunderArt.fishing.water:id==='nyamnyam'?nyamnyamArt.scenery:id==='whitenight'?'/fishing/environments/whitenight.png':`/fishing/close-water/${id}.png`,
  waterEnd:id==='whitenight'?fishingEnvironments[id].waterEnd:1536,
  frontSrc:id==='plunder'?plunderArt.fishing.scenery:id==='nyamnyam'?nyamnyamArt.scenery:id==='mukhyang'?'/fishing/environments/mukhyang.png':`/fishing/scenery/${id}.png`,
  frontWaterEnd:id==='mukhyang'?1170:1536,
  platformFallbackSrc:id==='plunder'?plunderArt.fishing.scenery:id==='nyamnyam'?'/fishing/environments/pongdang.png':`/fishing/environments/${id}.png`,
  platformSrc:id==='plunder'?plunderArt.fishing.platform:id==='nyamnyam'?nyamnyamArt.platform:platformMaterials[id]?`/fishing/platforms/${id}.png`:null,material:platformMaterials[id]}
}
// Standby landscapes and close, oblique fishing views have independent source crops.
// Platforms keep their own source so changing camera never changes the terrain.
const width=1024,height=1536
export function FishingSea({regionId,view='top'}:{regionId:string;view?:'front'|'top'}){
 const theme=fishingEnvironment(regionId),[failed,setFailed]=useState<string|null>(null),[loaded,setLoaded]=useState<string|null>(null)
 const src=view==='front'?theme.frontSrc:theme.src
 const opacity=view==='top'&&theme.id==='whitenight'?.72:1
 return <svg viewBox={`0 0 ${width} ${view==='front'?theme.frontWaterEnd:theme.waterEnd}`} preserveAspectRatio={view==='front'?'xMidYMin slice':'xMidYMid slice'} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" data-fishing-sea={theme.id} data-fishing-view={view}>
  <rect width={width} height={height} fill={theme.water} />{failed!==src&&<image href={src} width={width} height={height} className="transition-opacity duration-300 motion-reduce:transition-none" opacity={loaded===src?opacity:0} onLoad={()=>setLoaded(src)} onError={()=>setFailed(src)}/>}
 </svg>
}
export const FishingStandby=memo(function FishingStandby({regionId}:{regionId:string}){
 return <div className="absolute inset-0">
  <FishingSea regionId={regionId} view="front"/>
  <svg viewBox="0 0 400 180" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 w-full" style={{height:'clamp(160px,32%,220px)'}} aria-hidden="true"><FishingPlatform regionId={regionId} y={0} platformHeight={180}/></svg>
 </div>
})
export function FishingPlatform({regionId,y,platformHeight=160}:{regionId:string;y:number;platformHeight?:number}){
 const theme=fishingEnvironment(regionId),[failed,setFailed]=useState<string|null>(null),[loaded,setLoaded]=useState<string|null>(null)
 const keepEdges=theme.id==='plunder'||theme.id==='nyamnyam'||theme.id==='mechsanctum'||theme.id==='firefly'||theme.id==='pharaoh'
 if(theme.platformSrc)return <svg x={-4} y={y} width={408} height={platformHeight} viewBox="0 0 1200 480" preserveAspectRatio={keepEdges?'none':'xMidYMin slice'} overflow="hidden" data-fishing-platform={theme.id} data-platform-material={theme.material}>
  {failed!==theme.platformSrc?<image className="transition-opacity duration-300 motion-reduce:transition-none" opacity={loaded===theme.platformSrc?1:0} onLoad={()=>setLoaded(theme.platformSrc)} href={theme.platformSrc} width="1200" height="480" preserveAspectRatio={keepEdges?'xMidYMax meet':'xMidYMax slice'} onError={()=>setFailed(theme.platformSrc)}/>:<>
   <path d="M0 75 140 55 265 80 430 58 615 82 780 50 980 77 1200 58V480H0Z" fill={theme.deck}/>
   <path d={theme.material==='wood'?'M0 160H1200M0 280H1200M0 400H1200':theme.material==='roots'?'M0 100Q170 180 110 480M1200 85Q1030 200 1100 480':theme.material==='metal'||theme.material==='ruins'?'M0 190H1200M0 350H1200M240 75V190M780 190V350M410 350V480':'M130 95 230 160 195 245M230 160 380 185M840 80 770 160 875 220'} fill="none" stroke={theme.edge} strokeWidth={theme.material==='roots'?24:4} opacity=".5"/>
  </>}
 </svg>
 return <svg x={-4} y={y} width={408} height={platformHeight} viewBox={`0 ${theme.deckStart} ${width} ${height-theme.deckStart}`} preserveAspectRatio="xMidYMin slice" overflow="hidden" data-fishing-platform={theme.id}>
  <rect x="0" y={theme.deckStart} width={width} height={height-theme.deckStart} fill={theme.deck}/>
  {failed!==theme.platformFallbackSrc&&<image href={theme.platformFallbackSrc} width={width} height={height} onError={()=>setFailed(theme.platformFallbackSrc)}/>}
  {failed===theme.platformFallbackSrc&&<path d={`M0 ${theme.deckStart+4}h1024m-800 0v440m250-440v440m250-440v440`} fill="none" stroke={theme.edge} strokeWidth="5" opacity=".4"/>}
 </svg>
}
