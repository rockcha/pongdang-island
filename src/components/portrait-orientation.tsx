import {useEffect} from 'react'
import {Smartphone} from 'lucide-react'

/** The manifest handles installed apps; browser tabs may refuse orientation locking. */
export function PortraitOrientation(){
 useEffect(()=>{
  const mobile=window.matchMedia('(pointer: coarse)')
  async function lock(){
   if(!mobile.matches||document.documentElement.hasAttribute('data-aquarium-wide'))return
   const orientation=screen.orientation as ScreenOrientation & {lock?:(value:'portrait-primary')=>Promise<void>}
   try{await orientation?.lock?.('portrait-primary')}catch{/* Browser tabs can require fullscreen or disallow locking. */}
  }
  void lock()
  document.addEventListener('pointerup',lock)
  document.addEventListener('fullscreenchange',lock)
  window.addEventListener('aquarium-wide-change',lock)
  return()=>{document.removeEventListener('pointerup',lock);document.removeEventListener('fullscreenchange',lock);window.removeEventListener('aquarium-wide-change',lock)}
 },[])
 return <div className="portrait-orientation-notice" role="status"><Smartphone className="size-12" aria-hidden="true"/><p>휴대폰을 세로로 돌려주세요</p><p className="text-sm text-muted-foreground">퐁당섬은 세로 화면으로 즐길 수 있어요.</p></div>
}
