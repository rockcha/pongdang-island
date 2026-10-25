import {useEffect,useState} from 'react'
import {Smartphone} from 'lucide-react'
import {Button} from './ui/button'
export function PortraitOrientation(){
 const [show,setShow]=useState(false),[dismissed,setDismissed]=useState(false)
 useEffect(()=>{
  const update=()=>{
   const keyboard=document.activeElement?.matches('input,textarea,[contenteditable="true"]')
   const landscape=window.innerWidth>window.innerHeight&&screen.orientation?.type?.startsWith('landscape')
   setShow(!!landscape&&!keyboard&&window.matchMedia('(pointer: coarse)').matches&&!document.documentElement.hasAttribute('data-aquarium-wide'))
   if(!landscape)setDismissed(false)
  }
  const restore=()=>{update();if(!document.documentElement.hasAttribute('data-aquarium-wide')&&window.matchMedia('(pointer: coarse)').matches){const orientation=screen.orientation as ScreenOrientation&{lock?:(value:string)=>Promise<void>};void orientation?.lock?.('portrait-primary')?.catch(()=>{})}}
  update();window.addEventListener('resize',update);window.addEventListener('aquarium-wide-change',restore);document.addEventListener('fullscreenchange',update);screen.orientation?.addEventListener?.('change',update)
  return()=>{window.removeEventListener('resize',update);window.removeEventListener('aquarium-wide-change',restore);document.removeEventListener('fullscreenchange',update);screen.orientation?.removeEventListener?.('change',update)}
 },[])
 return show&&!dismissed?<div className="portrait-orientation-notice" role="status"><Smartphone className="size-12" aria-hidden="true"/><p>세로 화면을 권장해요</p><p className="text-sm text-muted-foreground">화면이 돌아오지 않으면 계속하기를 눌러 주세요.</p><Button onClick={()=>{setDismissed(true);try{screen.orientation?.unlock?.()}catch{}}}>계속하기</Button></div>:null
}
