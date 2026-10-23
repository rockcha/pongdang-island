import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {playPurchaseSound,playSaleSound,playRewardSound} from '@/features/gold/purchase-sound'
import {saveFishingSound} from '@/features/fishing/sound-preference'
let players:FakeAudio[]=[]
class FakeAudio extends EventTarget{
 volume=1;play=vi.fn(()=>Promise.resolve());pause=vi.fn();load=vi.fn();removeAttribute=vi.fn()
 constructor(public src:string){super();players.push(this)}
}
beforeEach(()=>{players=[];localStorage.clear();vi.useFakeTimers();vi.stubGlobal('Audio',FakeAudio)})
afterEach(()=>{vi.runOnlyPendingTimers();vi.useRealTimers();vi.unstubAllGlobals();localStorage.clear()})
it('plays the uploaded sound only once for each confirmed operation',async()=>{
 playPurchaseSound('purchase-1');await Promise.resolve()
 expect(players[0].src).toBe('/sounds/buy.mp3');expect(players[0].play).toHaveBeenCalledOnce()
 playPurchaseSound('purchase-1');expect(players).toHaveLength(1)
 playPurchaseSound('purchase-2');expect(players).toHaveLength(2);expect(players[0].pause).toHaveBeenCalled()
 players[1].dispatchEvent(new Event('ended'));expect(players[1].removeAttribute).toHaveBeenCalledWith('src')
})
it('respects mute and stops immediately if sound is switched off',()=>{
 saveFishingSound(false);playPurchaseSound('muted-purchase');expect(players).toHaveLength(0)
 saveFishingSound(true);playPurchaseSound('audible-purchase');expect(players).toHaveLength(1)
 saveFishingSound(false);expect(players[0].pause).toHaveBeenCalled()
})
it('ignores playback errors so successful purchases stay successful',async()=>{
 playPurchaseSound('blocked-purchase');players[0].dispatchEvent(new Event('error'))
 expect(players[0].pause).toHaveBeenCalled()
 await Promise.resolve()
})
it('plays sell audio once per completed sale and stops it when muted',()=>{
 playSaleSound('sale-1');expect(players[0].src).toBe('/sounds/sell.mp3')
 expect(players[0].play).toHaveBeenCalledOnce()
 playSaleSound('sale-1');expect(players).toHaveLength(1)
 saveFishingSound(false);expect(players[0].pause).toHaveBeenCalled()
 playSaleSound('sale-muted');expect(players).toHaveLength(1)
})
it('chimes once for simultaneous rewards, deduplicates retries and lets trade audio take priority',()=>{
 playRewardSound('reward-1');expect(players[0].src).toBe('/sounds/add.mp3')
 playRewardSound('reward-2');expect(players).toHaveLength(1)
 players[0].dispatchEvent(new Event('ended'))
 playRewardSound('reward-1');expect(players).toHaveLength(1)
 playRewardSound('reward-3');expect(players).toHaveLength(2)
 playPurchaseSound('reward-purchase');expect(players[1].pause).toHaveBeenCalled()
 expect(players[2].src).toBe('/sounds/buy.mp3')
 playRewardSound('reward-during-trade');expect(players).toHaveLength(3)
})
it('mutes reward sounds with the shared sound setting',()=>{
 saveFishingSound(false);playRewardSound('muted-reward');expect(players).toHaveLength(0)
 saveFishingSound(true);playRewardSound('audible-reward');expect(players[0].src).toBe('/sounds/add.mp3')
 saveFishingSound(false);expect(players[0].pause).toHaveBeenCalled()
})
