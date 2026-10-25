export type AudioChannel='music'|'effects'
export const audioVolumeChanged='pongdang-audio-volume-changed'
const memory:Partial<Record<AudioChannel,number>>={}
export function audioVolume(channel:AudioChannel){
 if(memory[channel]!==undefined)return memory[channel]!
 try{const raw=localStorage.getItem('pongdang:volume:'+channel);const n=raw===null?100:Number(raw);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):100}catch{return 100}
}
export function saveAudioVolume(channel:AudioChannel,value:number){
 if(!Number.isFinite(value))return false
 const n=Math.max(0,Math.min(100,Math.round(value)));memory[channel]=n
 let saved=true;try{localStorage.setItem('pongdang:volume:'+channel,String(n))}catch{saved=false}
 window.dispatchEvent(new Event(audioVolumeChanged));return saved
}
