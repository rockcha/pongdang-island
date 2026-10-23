import {WoodTurntableIcon} from './wood-turntable-icon'
import {useMusic} from './music-provider'

export function MusicToggleButton(){
 const {tracks,activeId,playing,loading,error,play,pause}=useMusic()
 const track=tracks.find(item=>item.id===activeId)??tracks[0]
 const label=playing?'음악 일시정지':'음악 재생'
 return <button type="button" aria-label={label} aria-pressed={playing} title={!track?'음악을 먼저 추가해 주세요':label} disabled={!playing&&(loading||!!error||!track)} onClick={()=>{if(playing)pause();else if(track)play(track.id)}} className="relative flex size-10 min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 hover:bg-muted">
  <WoodTurntableIcon playing={playing}/>
 </button>
}
