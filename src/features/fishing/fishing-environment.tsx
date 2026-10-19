import { useState } from 'react'

export const fishingEnvironments={
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
const platformMaterials:Record<string,string>={siren:'marble',pongdang:'wood',whitenight:'ice',primal:'roots',coral:'limestone',mistmoon:'wet-stone',starruins:'ruins',dreamabyss:'basalt',bluegrove:'riverstone',cloudferry:'cloud-stone',scrapisle:'metal'}
export function fishingEnvironment(regionId:string){
 const id=regionId in fishingEnvironments?regionId as keyof typeof fishingEnvironments:'pongdang'
 return {id,...fishingEnvironments[id],src:`/fishing/environments/${id==='primal'?'pongdang':id}.png`,platformSrc:platformMaterials[id]?`/fishing/platforms/${id}.png`:null,material:platformMaterials[id]}
}
// One painting per region. Its upper water and lower platform are independently
// framed so neither responsive cropping nor a tall phone can move the shoreline.
const width=1024,height=1536
export function FishingSea({regionId}:{regionId:string}){
 const theme=fishingEnvironment(regionId),[failed,setFailed]=useState<string|null>(null),[loaded,setLoaded]=useState<string|null>(null)
 return <svg viewBox={`0 0 ${width} ${theme.waterEnd}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" data-fishing-sea={theme.id}>
  <rect width={width} height={height} fill={theme.water} className={loaded!==theme.src&&failed!==theme.src?"motion-safe:animate-pulse":""}/>{failed!==theme.src&&<image href={theme.src} width={width} height={height} className="transition-opacity duration-300 motion-reduce:transition-none" opacity={loaded===theme.src?1:0} onLoad={()=>setLoaded(theme.src)} onError={()=>setFailed(theme.src)}/>}
 </svg>
}
export function FishingPlatform({regionId,y,platformHeight=160}:{regionId:string;y:number;platformHeight?:number}){
 const theme=fishingEnvironment(regionId),[failed,setFailed]=useState<string|null>(null),[loaded,setLoaded]=useState<string|null>(null)
 if(theme.platformSrc)return <svg x={-4} y={y} width={408} height={platformHeight} viewBox="0 0 1200 480" preserveAspectRatio="xMidYMin slice" overflow="hidden" data-fishing-platform={theme.id} data-platform-material={theme.material}>
  {failed!==theme.platformSrc?<image className="transition-opacity duration-300 motion-reduce:transition-none" opacity={loaded===theme.platformSrc?1:0} onLoad={()=>setLoaded(theme.platformSrc)} href={theme.platformSrc} width="1200" height="480" preserveAspectRatio="xMidYMax slice" onError={()=>setFailed(theme.platformSrc)}/>:<>
   <path d="M0 75 140 55 265 80 430 58 615 82 780 50 980 77 1200 58V480H0Z" fill={theme.deck}/>
   <path d={theme.material==='wood'?'M0 160H1200M0 280H1200M0 400H1200':theme.material==='roots'?'M0 100Q170 180 110 480M1200 85Q1030 200 1100 480':theme.material==='metal'||theme.material==='ruins'?'M0 190H1200M0 350H1200M240 75V190M780 190V350M410 350V480':'M130 95 230 160 195 245M230 160 380 185M840 80 770 160 875 220'} fill="none" stroke={theme.edge} strokeWidth={theme.material==='roots'?24:4} opacity=".5"/>
  </>}
 </svg>
 return <svg x={-4} y={y} width={408} height={platformHeight} viewBox={`0 ${theme.deckStart} ${width} ${height-theme.deckStart}`} preserveAspectRatio="xMidYMin slice" overflow="hidden" data-fishing-platform={theme.id}>
  <rect x="0" y={theme.deckStart} width={width} height={height-theme.deckStart} fill={theme.deck}/>
  {failed!==theme.src&&<image href={theme.src} width={width} height={height} onError={()=>setFailed(theme.src)}/>}
  {failed===theme.src&&<path d={`M0 ${theme.deckStart+4}h1024m-800 0v440m250-440v440m250-440v440`} fill="none" stroke={theme.edge} strokeWidth="5" opacity=".4"/>}
 </svg>
}
