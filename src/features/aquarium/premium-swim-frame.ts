import sharedCommonLayouts from './shared-wonders-frame-layouts.json'
import starruinsBluegoldLayouts from './starruins-bluegold-frame-layouts.json'

const blinkSheets=new Set([
 'fish/epic/pongdang-shark_sprite.png',
 'fish/epic/pongdang-whale_sprite.png',
 'fish/mythic/pongi-explorer_sprite.png',
])

const currentSheets=new Set([
 'fish/normal/mistbread-sponge_sprite.png',
 'fish/normal/whisper-pipefish_sprite.png',
 'fish/normal/dream-thread-worm_sprite.png',
 'fish/rare/mist-whisker-catfish_sprite.png',
 'fish/rare/moonshadow-flounder_sprite.png',
 'fish/epic/lunea-knight_sprite.png',
 'fish/epic/lunea-archivist_sprite.png',
 'fish/mythic/lunea-mistmoon-goddess_sprite.png',
 'fish/epic/sunwave-shark_sprite.png','fish/epic/wavefin-whale_sprite.png',
 'fish/epic/sunwave-shark-glide_sprite.png','fish/epic/wavefin-whale-glide_sprite.png',
 'fish/mythic/pongi-explorer-cruise_sprite.png',
 'fish/epic/pongdang-native-shark_sprite.png','fish/epic/pongdang-native-whale_sprite.png',
])

// These sheets reserve frames 1/2 for half-closed/closed eyes.
// Swim between open-eyed frames; blink briefly every 4–6 seconds per individual.
export function premiumSwimFrame(path:string|null,time:number,seed:number,fallback:number,reduced=false){
 if(path==='fish/rare/cloud-humpback_sprite.png')return reduced?0:[0,1,2,3,2,1][((Math.floor(time*4+seed)%6)+6)%6]
 if(path&&Object.hasOwn(starruinsBluegoldLayouts,path)){
  return reduced?0:[0,1,2,3,2,1][((Math.floor(time*3+seed)%6)+6)%6]
 }
 if(path&&Object.hasOwn(sharedCommonLayouts,path)){
  // Reverse through the intermediate poses rather than snapping from 3 to 0.
  return reduced?0:[0,1,2,3,2,1][((Math.floor(time*4+seed)%6)+6)%6]
 }
 if(path&&currentSheets.has(path)){
  return reduced?0:Math.floor(time*4+seed)%4
 }
 if(!path||!blinkSheets.has(path))return fallback
 if(reduced)return 0
 const interval=4+(seed%1000)/500
 const phase=(time+(seed%1000)/1000*interval)%interval
 if(phase<.07)return 1
 if(phase<.15)return 2
 if(phase<.22)return 1
 return Math.floor(time*2.5+seed)%2===0?0:3
}
