import {useEffect,useState} from 'react'
import {audioVolume,saveAudioVolume,audioVolumeChanged,type AudioChannel} from './audio-preferences'
import {Button} from '@/components/ui/button'
import {playRelicEquipSound} from '@/features/gold/purchase-sound'
export function AudioSettings(){
 const [values,setValues]=useState(()=>({music:audioVolume('music'),effects:audioVolume('effects')})),[error,setError]=useState(false)
 useEffect(()=>{const sync=()=>setValues({music:audioVolume('music'),effects:audioVolume('effects')});window.addEventListener(audioVolumeChanged,sync);return()=>window.removeEventListener(audioVolumeChanged,sync)},[])
 return <section aria-label="음량 조절" className="space-y-5 rounded-2xl border border-border/60 bg-card/70 p-5"><h2 className="text-sm font-medium">음량 조절</h2>{([['music','배경음악'],['effects','효과음']] as [AudioChannel,string][]).map(([channel,label])=><label key={channel} className="block space-y-3 text-xs"><span className="flex justify-between"><span>{label}</span><span className="tabular-nums">{values[channel]}%</span></span><input type="range" aria-label={label+' 음량'} min={0} max={100} value={values[channel]} className="h-9 w-full accent-primary" onChange={e=>{const value=Number(e.target.value);setValues(v=>({...v,[channel]:value}));setError(!saveAudioVolume(channel,value))}}/></label>)}<Button variant="outline" size="sm" onClick={()=>playRelicEquipSound(crypto.randomUUID())}>효과음 미리 듣기</Button><p className="text-[11px] leading-5 text-muted-foreground">즉시 적용되며 이 브라우저에 저장돼요. 음소거한 소리는 재생되지 않아요.</p>{error&&<p role="alert" className="text-xs text-destructive">음량을 적용했지만 저장하지 못했어요.</p>}</section>
}
