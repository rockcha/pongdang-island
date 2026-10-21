import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {toast} from 'sonner'
import {readTracks,youtubeTitle,type MusicTrack} from './music-library'
import {loadMusic,editMusic} from './api'
import {claimPlayback,playbackEvent} from './playback-ownership'

type Player={playVideo():void;pauseVideo():void;destroy():void;getVideoData():{title?:string}}
type PlayerEvent={target:Player;data:number}
type YouTube={Player:new(element:HTMLElement,options:Record<string,unknown>)=>Player}
declare global{interface Window{YT?:YouTube;onYouTubeIframeAPIReady?:()=>void}}
let apiPromise:Promise<YouTube>|undefined
function loadYouTube(){
 if(window.YT?.Player)return Promise.resolve(window.YT)
 if(!apiPromise)apiPromise=new Promise<YouTube>((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady
  const timeout=window.setTimeout(()=>{apiPromise=undefined;reject(new Error('유튜브 연결 시간이 초과됐어요. 다시 재생해 주세요.'))},15000)
  window.onYouTubeIframeAPIReady=()=>{previous?.();clearTimeout(timeout);resolve(window.YT!)}
  document.getElementById('youtube-music-api')?.remove()
  const script=document.createElement('script');script.id='youtube-music-api';script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timeout);apiPromise=undefined;reject(new Error('유튜브에 연결하지 못했어요.'))};document.head.append(script)
 })
 return apiPromise
}
type MusicContextValue={setPlayerSlot:(slot:HTMLDivElement|null)=>void;tracks:MusicTrack[];activeId:string|null;playing:boolean;loading:boolean;error:string;reload():void;add(track:MusicTrack):Promise<void>;remove(id:string):Promise<void>;rename(id:string,name:string):Promise<void>;play(id:string):void;pause():void;stop():void}
const MusicContext=createContext<MusicContextValue|null>(null)
export function useMusic(){const value=useContext(MusicContext);if(!value)throw new Error('MusicProvider required');return value}
export function MusicProvider({children,storageKey,userId}:{children:ReactNode;storageKey:string;userId?:string}){
 const [tracks,setTracks]=useState(()=>readTracks(storageKey))
 const [activeId,setActiveId]=useState<string|null>(null)
 const [playing,setPlaying]=useState(false)
 const [attempt,setAttempt]=useState(0)
 const host=useRef<HTMLDivElement>(null),player=useRef<Player|null>(null)
 const wantsPlayback=useRef(true)
 useEffect(()=>{
  const relinquish=(event:Event)=>{if((event as CustomEvent).detail!=='library'){wantsPlayback.current=false;player.current?.pauseVideo();setPlaying(false)}}
  window.addEventListener(playbackEvent,relinquish)
  return()=>window.removeEventListener(playbackEvent,relinquish)
 },[])
 const [ready,setReady]=useState(!userId),[error,setError]=useState(''),[reloadId,setReloadId]=useState(0)
 const queue=useRef<Promise<unknown>>(Promise.resolve()),alive=useRef(true),tracksRef=useRef(tracks)
 tracksRef.current=tracks
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{
  if(!userId)return
  let cancelled=false;setReady(false);setError('')
  let imported:MusicTrack[]|null=null
  try{if(localStorage.getItem(storageKey)!==null)imported=readTracks(storageKey)}catch{}
  void loadMusic(imported).then(items=>{if(!cancelled){setTracks(items);setReady(true)}}).catch(()=>{if(!cancelled)setError('음악 목록에 연결하지 못했어요.')})
  return()=>{cancelled=true}
 },[userId,storageKey,reloadId])
 function mutate(action:'add'|'rename'|'delete'|'title',id:string,title='',name=''){
  if(!ready)return Promise.reject(new Error('음악 목록을 먼저 불러와 주세요.'))
  const task=queue.current.then(async()=>{
   if(!alive.current)return
   if(userId){const items=await editMusic(action,id,title,name);if(alive.current)setTracks(items)}
   else setTracks(items=>action==='delete'?items.filter(t=>t.id!==id):action==='add'?items.some(t=>t.id===id)?items:[...items,{id,title,customName:name}]:items.map(t=>t.id!==id?t:action==='title'?{...t,title}:{...t,customName:name}))
  })
  queue.current=task.catch(()=>{})
  return task
 }
 function cacheTitle(id:string,title:string){
  if(!ready||!title||tracksRef.current.find(t=>t.id===id)?.title===title)return
  void mutate('title',id,title).catch(()=>{})
 }
 const [slot,setPlayerSlot]=useState<HTMLDivElement|null>(null)
 const [bounds,setBounds]=useState<DOMRect|null>(null)
 const [clip,setClip]=useState('inset(0px)')
 useEffect(()=>{
  // Browser/player interruptions must not replace an explicit playback choice.
  const resume=()=>{if(document.visibilityState==='visible'&&wantsPlayback.current)player.current?.playVideo()}
  window.addEventListener('focus',resume)
  document.addEventListener('visibilitychange',resume)
  return()=>{window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume)}
 },[])
 useEffect(()=>{
  if(!slot){setBounds(null);return}
  const update=()=>{
   const rect=slot.getBoundingClientRect(),section=slot.closest('section')?.getBoundingClientRect()
   setBounds(rect)
   setClip(`inset(${Math.max(0,(section?.top??0)-rect.top)}px 0px ${Math.max(0,rect.bottom-Math.min(section?.bottom??window.innerHeight,window.innerHeight))}px 0px)`)
  }
  update();const observer=new ResizeObserver(update);observer.observe(slot)
  window.addEventListener('scroll',update,true);window.addEventListener('resize',update)
  return()=>{observer.disconnect();window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update)}
 },[slot])
 useEffect(()=>{if(ready)try{localStorage.setItem(storageKey,JSON.stringify(tracks))}catch{/* DB remains the source of truth. */}},[tracks,storageKey,ready])
 useEffect(()=>{
  if(!ready)return
  const controller=new AbortController()
  for(const track of tracks.filter(t=>!t.title))void youtubeTitle(track.id,controller.signal).then(title=>cacheTitle(track.id,title)).catch(()=>{})
  return()=>controller.abort()
 },[tracks,ready])
 useEffect(()=>{
  if(!activeId||!host.current)return
  let cancelled=false
  setPlaying(false)
  const element=document.createElement('div');host.current.append(element)
  void loadYouTube().then(YT=>{
   if(cancelled)return
   player.current=new YT.Player(element,{width:'100%',height:'100%',videoId:activeId,playerVars:{autoplay:1,loop:1,playlist:activeId,playsinline:1,origin:window.location.origin},events:{
    onReady:({target}:PlayerEvent)=>{if(cancelled)return;if(wantsPlayback.current)target.playVideo();else target.pauseVideo();const title=target.getVideoData().title;if(title)cacheTitle(activeId,title)},
    onStateChange:({data,target}:PlayerEvent)=>{if(cancelled)return;if(data===1&&!wantsPlayback.current){target.pauseVideo();setPlaying(false);return}setPlaying(data===1);const title=target.getVideoData().title;if(title)cacheTitle(activeId,title)},
    onAutoplayBlocked:()=>{if(!cancelled){setPlaying(false);toast.info('음악 재생 버튼을 다시 눌러 주세요.')}},
    onError:()=>{if(!cancelled){setPlaying(false);toast.error('이 영상은 재생할 수 없어요. 다른 곡을 선택해 주세요.')}}
   }})
  }).catch(error=>{if(!cancelled)toast.error(error.message)})
  return()=>{cancelled=true;player.current?.destroy();player.current=null;element.remove()}
 },[activeId,attempt])
 const pause=()=>{wantsPlayback.current=false;player.current?.pauseVideo?.();setPlaying(false)}
 const stop=()=>{pause();setActiveId(null)}
 const play=(id:string)=>{claimPlayback('library');wantsPlayback.current=true;if(activeId===id&&player.current)player.current.playVideo?.();else{setActiveId(id);setAttempt(n=>n+1)}}
 return <MusicContext.Provider value={{setPlayerSlot,tracks,activeId,playing,play,pause,stop,loading:!ready&&!error,error,reload:()=>setReloadId(n=>n+1),add:track=>mutate('add',track.id,track.title,track.customName),remove:async id=>{await mutate('delete',id);if(id===activeId)stop()},rename:(id,name)=>mutate('rename',id,'',name)}}>
  {children}
  {activeId&&<div ref={host} aria-label="음악 플레이어" aria-hidden={!bounds} className="fixed z-30 overflow-hidden rounded-xl bg-black" style={{top:bounds?.top??0,left:bounds?.left??0,width:bounds?.width??320,height:bounds?.height??224,clipPath:clip,visibility:bounds?'visible':'hidden',pointerEvents:bounds?'auto':'none'}}/>}
 </MusicContext.Provider>
}
