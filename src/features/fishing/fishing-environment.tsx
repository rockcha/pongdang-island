import { useState } from 'react'

export const fishingEnvironments={
 pongdang:{name:'퐁당섬 앞바다',water:'#529dc7',deck:'#b88b61',edge:'#e4c695',waterEnd:1048,deckStart:1058},
 coral:{name:'산호빛 여울',water:'#51b2ba',deck:'#98765c',edge:'#dfb59a',waterEnd:1100,deckStart:1128},
 mistmoon:{name:'안개달 해역',water:'#6678ad',deck:'#43556c',edge:'#90a7bc',waterEnd:980,deckStart:1064},
 starruins:{name:'별잠 유적',water:'#468ea5',deck:'#627c8d',edge:'#a9bdbd',waterEnd:1078,deckStart:1128},
 dreamabyss:{name:'꿈먹는 심연',water:'#403f75',deck:'#292c43',edge:'#8072b8',waterEnd:1020,deckStart:1092},
} as const
export function fishingEnvironment(regionId:string){
 const id=regionId in fishingEnvironments?regionId as keyof typeof fishingEnvironments:'pongdang'
 return {id,...fishingEnvironments[id],src:`/fishing/environments/${id}.png`}
}
// One painting per region. Its upper water and lower platform are independently
// framed so neither responsive cropping nor a tall phone can move the shoreline.
const width=1024,height=1536
export function FishingSea({regionId}:{regionId:string}){
 const theme=fishingEnvironment(regionId),[failed,setFailed]=useState<string|null>(null)
 return <svg viewBox={`0 0 ${width} ${theme.waterEnd}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" data-fishing-sea={theme.id}>
  {failed!==theme.src&&<image href={theme.src} width={width} height={height} onError={()=>setFailed(theme.src)}/>}
 </svg>
}
export function FishingPlatform({regionId,y,platformHeight=160}:{regionId:string;y:number;platformHeight?:number}){
 const theme=fishingEnvironment(regionId),[failed,setFailed]=useState<string|null>(null)
 return <svg x={-4} y={y} width={408} height={platformHeight} viewBox={`0 ${theme.deckStart} ${width} ${height-theme.deckStart}`} preserveAspectRatio="xMidYMin slice" overflow="hidden" data-fishing-platform={theme.id}>
  <rect x="0" y={theme.deckStart} width={width} height={height-theme.deckStart} fill={theme.deck}/>
  {failed!==theme.src&&<image href={theme.src} width={width} height={height} onError={()=>setFailed(theme.src)}/>}
  {failed===theme.src&&<path d={`M0 ${theme.deckStart+4}h1024m-800 0v440m250-440v440m250-440v440`} fill="none" stroke={theme.edge} strokeWidth="5" opacity=".4"/>}
 </svg>
}
