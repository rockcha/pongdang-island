import {useEffect,useRef,useState} from 'react'
import {Settings2,Volume2,VolumeX} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {audioVolume,audioVolumeChanged,saveAudioVolume,type AudioChannel} from '@/features/audio/audio-preferences'
import {readFishingSound,saveFishingSound,fishingSoundChanged} from '@/features/fishing/sound-preference'

const read=()=>({music:audioVolume('music'),effects:readFishingSound()?audioVolume('effects'):0})
export function ExplorationSoundSettings({onPreview}:{onPreview:()=>void}){
 const [open,setOpen]=useState(false),[values,setValues]=useState(read),[error,setError]=useState(false)
 const previous=useRef({music:60,effects:70})
 useEffect(()=>{
  const sync=()=>setValues(read())
  window.addEventListener(audioVolumeChanged,sync);window.addEventListener(fishingSoundChanged,sync)
  return()=>{window.removeEventListener(audioVolumeChanged,sync);window.removeEventListener(fishingSoundChanged,sync)}
 },[])
 function change(channel:AudioChannel,value:number){
  if(value>0)previous.current[channel]=value
  let saved=saveAudioVolume(channel,value)
  if(channel==='effects'&&value>0&&!readFishingSound())saved=saveFishingSound(true)&&saved
  setValues(read());setError(!saved)
 }
 function toggle(channel:AudioChannel){
  if(values[channel]>0){previous.current[channel]=values[channel];change(channel,0)}
  else change(channel,previous.current[channel])
 }
 return <>
  <button className="exploration-settings-button" aria-label="탐험 소리 설정" title="소리 설정" onClick={()=>setOpen(true)}><Settings2 size={17}/></button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="exploration-modal exploration-sound-settings"><DialogHeader><DialogTitle>소리 설정</DialogTitle><DialogDescription>탐험을 계속하면서 소리를 조절해요.</DialogDescription></DialogHeader>
   {(['music','effects'] as const).map(channel=>{const label=channel==='music'?'배경음악':'효과음';return <div className="exploration-sound-channel" key={channel}>
    <div><label htmlFor={`exploration-volume-${channel}`}>{label}</label><span>{values[channel]}%</span><button aria-label={`${label} ${values[channel]>0?'끄기':'켜기'}`} onClick={()=>toggle(channel)}>{values[channel]>0?<Volume2 size={18}/>:<VolumeX size={18}/>}</button></div>
    <input id={`exploration-volume-${channel}`} aria-label={`${label} 음량`} type="range" min={0} max={100} value={values[channel]} onChange={event=>change(channel,Number(event.target.value))}/>
   </div>})}
   <button className="exploration-sound-preview" disabled={values.effects===0} onClick={onPreview}><Volume2 size={15}/>효과음 미리 듣기</button>
   <p className="exploration-sound-note">변경한 음량은 즉시 적용되고 이 브라우저에 저장돼요. 다른 화면의 소리 설정과도 함께 적용돼요.</p>
   {error&&<p role="alert">음량은 적용했지만 브라우저에 저장하지 못했어요.</p>}
  </DialogContent></Dialog>
 </>
}
