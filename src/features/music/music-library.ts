export type MusicTrack = {id:string; title:string; customName:string}
export const defaultTracks:MusicTrack[]=['28kGcceYcOI','fqSVyUeiduI','icKtd3wUBug'].map(id=>({id,title:'',customName:''}))
export function youtubeId(value:string){
 try{
  const url=new URL(value)
  if(url.protocol!=='https:'&&url.protocol!=='http:')return null
  const host=url.hostname.toLowerCase()
  const id=host==='youtu.be'?url.pathname.split('/')[1]:['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host)?url.pathname==='/watch'?url.searchParams.get('v'): /^\/(shorts|embed|live)\//.test(url.pathname)?url.pathname.split('/')[2]:null:null
  return id&&/^[\w-]{11}$/.test(id)?id:null
 }catch{return null}
}
export function readTracks(key:string):MusicTrack[]{
 try{const value=JSON.parse(localStorage.getItem(key)??'null');if(Array.isArray(value))return value.filter((t):t is MusicTrack=>t&&typeof t.id==='string'&&/^[\w-]{11}$/.test(t.id)&&typeof t.title==='string'&&typeof t.customName==='string') }catch{/* Use defaults when storage is unavailable. */}
 return defaultTracks.map(track=>({...track}))
}
export async function youtubeTitle(id:string,signal?:AbortSignal){
 const response=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,{signal})
 if(!response.ok)throw new Error('제목을 가져오지 못했어요.')
 const data=await response.json() as {title?:string}
 if(!data.title)throw new Error('제목을 가져오지 못했어요.')
 return data.title
}
