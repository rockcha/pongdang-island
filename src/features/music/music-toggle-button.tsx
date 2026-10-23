import {useEffect,useState} from 'react'
import {Popover} from '@base-ui/react/popover'
import {Link} from 'react-router'
import {Music2,Pause,Play,SkipBack,SkipForward,Volume2,X,ChevronRight,Square} from 'lucide-react'
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog'
import {WoodTurntableIcon} from './wood-turntable-icon'
import {useMusic} from './music-provider'

const control='flex size-10 shrink-0 items-center justify-center rounded-full text-primary outline-none hover:bg-primary/7 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35'
export function MusicToggleButton(){
 const music=useMusic()
 const [open,setOpen]=useState(false)
 const [mobile,setMobile]=useState(()=>typeof window.matchMedia==='function'&&window.matchMedia('(max-width: 639px)').matches)
 useEffect(()=>{if(typeof window.matchMedia!=='function')return;const media=window.matchMedia('(max-width: 639px)');const change=()=>setMobile(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[])
 const {tracks,activeId,playing,loading,error,volume,setVolume,play,pause,stop,reload}=music
 const selected=tracks.findIndex(track=>track.id===activeId)
 const track=tracks[selected]??tracks[0]
 const title=track?.customName||track?.title||'제목을 불러오는 중…'
 const unavailable=loading||!!error||!track
 function skip(direction:number){if(tracks.length)play(tracks[((selected<0?(direction>0?-1:0):selected)+direction+tracks.length)%tracks.length].id)}
 const trigger=<button type="button" aria-label="내 음악 열기" title="내 음악" className="relative flex size-10 min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><WoodTurntableIcon playing={playing}/></button>
 const body=<>
  <div className="flex shrink-0 items-center gap-3 border-b border-primary/10 px-5 pb-4 pt-5 pr-12">
   <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/60 [&>svg]:size-11"><WoodTurntableIcon playing={playing}/></span>
   <div className="min-w-0"><p className="mb-1 text-[10px] tracking-wider text-muted-foreground">{playing?'지금 재생 중':'나만의 플레이리스트'}</p><p className="line-clamp-2 text-sm leading-5 text-primary">{track?title:'좋아하는 음악을 담아 보세요'}</p></div>
  </div>
  <div className="max-h-56 min-h-0 overflow-y-auto overscroll-contain px-3 py-2">
   {loading?<p role="status" className="px-2 py-6 text-center text-xs text-muted-foreground">음악을 불러오고 있어요…</p>:error?<div role="alert" className="space-y-2 px-2 py-5 text-center text-xs"><p className="text-muted-foreground">{error}</p><button type="button" onClick={reload} className="min-h-9 text-primary underline">다시 불러오기</button></div>:!tracks.length?<p className="px-2 py-6 text-center text-xs text-muted-foreground">저장한 곡이 없어요. 음악실에서 첫 곡을 추가해 주세요.</p>:<ul aria-label="저장한 곡" className="space-y-1">{tracks.map((item,index)=>{
    const current=item.id===activeId
    return <li key={item.id}><button type="button" aria-label={`${item.customName||item.title||`저장한 음악 ${index+1}`} 재생`} aria-current={current?'true':undefined} onClick={()=>play(item.id)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${current?'bg-primary/7 text-primary':'text-foreground'}`}><span className="flex w-4 shrink-0 justify-center text-[10px] tabular-nums text-muted-foreground">{current?<Music2 aria-hidden="true" className="size-3.5 text-primary"/>:String(index+1).padStart(2,'0')}</span><span className="min-w-0 flex-1 truncate text-xs">{item.customName||item.title||`저장한 음악 ${index+1}`}</span>{current&&playing&&<span className="shrink-0 text-[9px] text-primary">재생 중</span>}</button></li>
   })}</ul>}
  </div>
  <div className="shrink-0 border-t border-primary/10 px-5 pb-4 pt-3">
   <div className="mb-3 flex items-center justify-center gap-4"><button type="button" aria-label="이전 곡" className={control} disabled={unavailable} onClick={()=>skip(-1)}><SkipBack className="size-4"/></button><button type="button" aria-label={playing?'음악 일시정지':'음악 재생'} className={control+' size-11 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'} disabled={!playing&&unavailable} onClick={()=>{if(playing)pause();else if(track)play(track.id)}}>{playing?<Pause className="size-4"/>:<Play className="ml-0.5 size-4"/>}</button><button type="button" aria-label="다음 곡" className={control} disabled={unavailable} onClick={()=>skip(1)}><SkipForward className="size-4"/></button></div>
   <button type="button" onClick={stop} disabled={!activeId} className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-xs text-muted-foreground hover:bg-secondary/50 disabled:opacity-35"><Square aria-hidden="true" className="size-3.5"/>재생 종료</button>
   <label className="flex items-center gap-3 text-muted-foreground"><Volume2 aria-hidden="true" className="size-4 shrink-0"/><span className="sr-only">음악 볼륨</span><input type="range" min="0" max="100" value={volume} onChange={event=>setVolume(Number(event.target.value))} className="h-5 min-w-0 flex-1 cursor-pointer accent-primary"/><span aria-hidden="true" className="w-6 text-right text-[10px] tabular-nums">{volume}</span></label>
   <Link to="/music-room" onClick={()=>setOpen(false)} className="mt-3 flex min-h-8 items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary">음악실에서 곡 추가<ChevronRight className="size-3"/></Link>
  </div>
 </>
 if(mobile)return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={trigger}/><DialogContent className="notification-sheet bottom-0 left-0 top-auto flex max-h-[80dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-3xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)]"><DialogTitle className="sr-only">내 음악</DialogTitle><DialogDescription className="sr-only">저장한 곡을 선택하고 음악 재생과 볼륨을 조절하세요.</DialogDescription>{body}</DialogContent></Dialog>
 return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger render={trigger}/><Popover.Portal><Popover.Positioner side="bottom" align="center" sideOffset={10} collisionPadding={12} className="z-[100]"><Popover.Popup className="relative flex max-h-[min(36rem,var(--available-height))] w-80 max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-primary/15 bg-popover text-popover-foreground shadow-xl outline-none"><Popover.Title className="sr-only">내 음악</Popover.Title><Popover.Description className="sr-only">저장한 곡을 선택하고 음악 재생과 볼륨을 조절하세요.</Popover.Description><Popover.Close aria-label="내 음악 닫기" className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-primary/7 focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4"/></Popover.Close>{body}</Popover.Popup></Popover.Positioner></Popover.Portal></Popover.Root>
}
