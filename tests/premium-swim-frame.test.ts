import {expect,it} from 'vitest'
import {premiumSwimFrame} from '@/features/aquarium/premium-swim-frame'

it.each(['fish/normal/mistbread-sponge_sprite.png','fish/normal/whisper-pipefish_sprite.png','fish/normal/dream-thread-worm_sprite.png','fish/rare/mist-whisker-catfish_sprite.png','fish/rare/moonshadow-flounder_sprite.png','fish/epic/lunea-knight_sprite.png','fish/epic/lunea-archivist_sprite.png','fish/mythic/lunea-mistmoon-goddess_sprite.png'])('animates all four current-response frames for %s',path=>{
 expect([0,.25,.5,.75].map(t=>premiumSwimFrame(path,t,0,0))).toEqual([0,1,2,3])
 expect(premiumSwimFrame(path,.75,0,3,true)).toBe(0)
})

it('keeps a short blink and resumes open-eye swimming',()=>{
 const path='fish/epic/pongdang-shark_sprite.png'
 expect([0,.08,.16,.23].map(t=>premiumSwimFrame(path,t,0,0))).toEqual([1,2,1,0])
 const frames=Array.from({length:400},(_,i)=>premiumSwimFrame(path,i*.01,0,0))
 expect(frames.filter(frame=>frame===2)).toHaveLength(8)
 expect(new Set(frames)).toEqual(new Set([0,1,2,3]))
 expect(premiumSwimFrame(path,4.08,0,0)).toBe(2)
 expect(premiumSwimFrame(path,.08,500,0)).not.toBe(2)
 expect(premiumSwimFrame(path,.08,0,2,true)).toBe(0)
 expect(premiumSwimFrame('old-sheet.png',.08,0,3)).toBe(3)
})

it.each(['fish/epic/sunwave-shark_sprite.png','fish/epic/wavefin-whale_sprite.png',
 'fish/epic/sunwave-shark-glide_sprite.png','fish/epic/wavefin-whale-glide_sprite.png',
 'fish/mythic/pongi-explorer-cruise_sprite.png','fish/epic/pongdang-native-shark_sprite.png',
 'fish/epic/pongdang-native-whale_sprite.png'])('plays every propulsion frame without blink-only skipping for %s',path=>{
 expect([0,.25,.5,.75,1].map(t=>premiumSwimFrame(path,t,0,0))).toEqual([0,1,2,3,0])
 expect(premiumSwimFrame(path,.5,0,2,true)).toBe(0)
})
