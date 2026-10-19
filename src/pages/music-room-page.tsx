import {useState} from 'react'
import {Play,Pause,Plus,Trash2,Pencil,Repeat,ChevronDown,Music2} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog'
import {useMusic} from '@/features/music/music-provider'
import {youtubeId,youtubeTitle,type MusicTrack} from '@/features/music/music-library'
import {toast} from 'sonner'
import {Select} from '@base-ui/react/select'

const trackTitle=(track:MusicTrack)=>track.customName||track.title||'유튜브 음악'
const inputClass='mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function AddMusicDialog(){
 const music=useMusic()
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 return <Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger render={<Button variant="ghost" size="sm" disabled={music.loading||!!music.error}/>}><Plus className="size-4"/>음악 추가</DialogTrigger>
  <DialogContent>
   <DialogHeader><DialogTitle>음악 추가</DialogTitle><DialogDescription>좋아하는 유튜브 음악을 담아 보세요.</DialogDescription></DialogHeader>
   <form className="space-y-4" onSubmit={async event=>{
    event.preventDefault();if(busy)return
    const id=youtubeId(url.trim());setError('')
    if(!id){setError('올바른 유튜브 영상 링크를 입력해 주세요.');return}
    if(music.tracks.some(track=>track.id===id)){setError('이미 담겨 있는 음악이에요.');return}
    setBusy(true)
    try{
     let title='';try{title=await youtubeTitle(id,AbortSignal.timeout(10000))}catch{/* Resolve title when playback starts. */}
     await music.add({id,title,customName:name.trim()});setUrl('');setName('');setOpen(false)
     toast.success('음악을 추가했어요.')
    }catch{setError('음악을 저장하지 못했어요. 다시 시도해 주세요.')}finally{setBusy(false)}
   }}>
    <label className="block text-xs font-medium">유튜브 링크<input autoFocus type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={inputClass}/></label>
    <label className="block text-xs font-medium">이름 <span className="font-normal text-muted-foreground">선택</span><input value={name} maxLength={150} onChange={e=>setName(e.target.value)} placeholder="비워두면 영상 제목을 사용해요" className={inputClass}/></label>
    {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
    <Button type="submit" disabled={busy} className="w-full">{busy?'추가하는 중…':'추가하기'}</Button>
   </form>
  </DialogContent>
 </Dialog>
}

function RenameMusic({track}:{track:MusicTrack}){
 const music=useMusic(),[open,setOpen]=useState(false),[name,setName]=useState(track.customName),[busy,setBusy]=useState(false),[error,setError]=useState('')
 return <Dialog open={open} onOpenChange={value=>{setOpen(value);if(value)setName(track.customName)}}>
  <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="음악 이름 변경"/>}><Pencil className="size-4"/></DialogTrigger>
  <DialogContent><DialogHeader><DialogTitle>음악 이름 변경</DialogTitle><DialogDescription>이름을 비우면 원래 영상 제목이 표시돼요.</DialogDescription></DialogHeader>
   <form className="space-y-4" onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{await music.rename(track.id,name.trim());setOpen(false)}catch{setError('이름을 저장하지 못했어요.')}finally{setBusy(false)}}}>
    <label className="block text-xs">음악 이름<input autoFocus value={name} maxLength={150} onChange={e=>setName(e.target.value)} placeholder={track.title||'영상 제목 사용'} className={inputClass}/></label>
    {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}<Button type="submit" disabled={busy} className="w-full">{busy?'저장 중…':'저장'}</Button>
   </form>
  </DialogContent>
 </Dialog>
}

export function MusicRoomPage(){
 const music=useMusic(),[deleting,setDeleting]=useState(false)
 const current=music.tracks.find(track=>track.id===music.activeId)??music.tracks[0]
 const others=music.tracks.filter(track=>track.id!==current?.id)
 const playing=music.playing&&music.activeId===current?.id
 return <section aria-label="음악 감상" className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-3">
  <div className="flex shrink-0 items-center gap-2">
   <Select.Root value={null} onValueChange={value=>{if(value)music.play(value)}} disabled={music.loading||!!music.error||!others.length}>
    <Select.Trigger aria-label="음악 선택" className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-[#a6795440] bg-[#f2e5d4] px-3 text-left text-sm text-[#70492d] outline-none focus-visible:ring-2 focus-visible:ring-[#a67954] disabled:opacity-60">
     <span className="truncate">{music.loading?'불러오는 중…':current?trackTitle(current):'음악 선택'}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0"/>
    </Select.Trigger>
    <Select.Portal><Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[60]">
     <Select.Popup className="w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#a6795450] bg-[#fbf4e9] p-1 text-[#70492d] shadow-lg outline-none">
      <Select.List className="max-h-[min(45dvh,var(--available-height))] overflow-y-auto">
       {others.map(track=><Select.Item key={track.id} value={track.id} className="cursor-pointer rounded-lg px-3 py-2.5 text-sm outline-none data-highlighted:bg-[#e9d4b9]"><Select.ItemText>{trackTitle(track)}</Select.ItemText></Select.Item>)}
      </Select.List>
     </Select.Popup>
    </Select.Positioner></Select.Portal>
   </Select.Root>
   <AddMusicDialog/>
  </div>
  {music.error&&<div role="alert" className="flex shrink-0 items-center justify-between gap-2 text-xs text-destructive"><span>{music.error}</span><Button variant="ghost" size="sm" onClick={music.reload}>다시 시도</Button></div>}
  {current?<div className="flex min-h-0 flex-1 flex-col gap-3">
   <div className="music-cover relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-secondary">
    <img key={current.id} src={`https://i.ytimg.com/vi/${current.id}/hqdefault.jpg`} alt={trackTitle(current)+' 썸네일'} className="absolute inset-0 h-full w-full object-cover" onError={event=>{if(!event.currentTarget.dataset.fallback){event.currentTarget.dataset.fallback='true';event.currentTarget.src='/fallback-image.svg'}}}/>
    {playing&&<div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent"><div className="music-equalizer absolute bottom-4 left-1/2 flex h-6 -translate-x-1/2 items-end gap-1">{[0,1,2,3,4].map(index=><span key={index} style={{animationDelay:`-${index*.19}s`}} className="w-1 rounded-full bg-white/90"/>)}</div></div>}
   </div>
   <div className="shrink-0 text-center"><h2 className="line-clamp-2 text-sm font-medium leading-5">{trackTitle(current)}</h2><p role="status" className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><Repeat className="size-3"/>{playing?'반복 재생 중':music.activeId===current.id?'일시정지 · 한 곡 반복':'한 곡 반복'}</p></div>
   <div className="flex shrink-0 items-center justify-center gap-5 pb-1">
    <RenameMusic key={current.id} track={current}/>
    <Button size="icon" disabled={music.loading||!!music.error} aria-label={playing?'음악 일시정지':'음악 재생'} aria-pressed={playing} onClick={()=>playing?music.pause():music.play(current.id)} className="size-12 rounded-full">{playing?<Pause className="size-5 fill-current"/>:<Play className="ml-0.5 size-5 fill-current"/>}</Button>
    <Button variant="ghost" size="icon" disabled={deleting||music.loading||!!music.error} aria-label="현재 음악 삭제" onClick={async()=>{setDeleting(true);try{await music.remove(current.id)}catch{toast.error('음악을 삭제하지 못했어요.')}finally{setDeleting(false)}}}><Trash2 className="size-4"/></Button>
   </div>
  </div>:<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><Music2 className="size-10 opacity-50"/><p className="text-sm">{music.loading?'음악을 불러오고 있어요.':'좋아하는 음악을 추가해 보세요.'}</p></div>}
 </section>
}
