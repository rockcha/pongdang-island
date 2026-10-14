import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FishingDialog } from '@/features/fishing/fishing-dialog'
import { createFishingPresentation, fishingScenes, oceanTrivia, fishingFailureReasons, pickRandom } from '@/features/fishing/fishing-presentation'
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
const presentation={id:'one',scene:fishingScenes[0],trivia:oceanTrivia[0],failure:fishingFailureReasons[0]}
const result={operation_id:'one',region_id:'pongdang',bait_id:'bait',rarity:null,created_at:'2026-10-14T00:00:00Z'}
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('holds a completed result for three seconds then shows the selected failure reason',async()=>{
 vi.useFakeTimers()
 const close=vi.fn()
 render(<FishingDialog open onClose={close} presentation={presentation} result={result} pending={false} error="" onRetry={vi.fn()}/>)
 await act(async()=>{})
 expect(screen.getByText(presentation.trivia.text)).toBeTruthy()
 expect(screen.queryByText('낚시 실패')).toBeNull()
 expect(screen.queryByRole('button',{name:'확인'})).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(2999)})
 expect(screen.queryByText('낚시 실패')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(1)})
 expect(screen.getByText('낚시 실패')).toBeTruthy()
 expect(screen.getByText(presentation.failure)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 expect(close).toHaveBeenCalledOnce()
})
it('keeps waiting after the animation until the server responds and then reveals rarity',async()=>{
 vi.useFakeTimers()
 const props={open:true,onClose:vi.fn(),presentation,result:null,pending:true,error:'',onRetry:vi.fn()}
 const view=render(<FishingDialog {...props}/>)
 await act(async()=>{vi.advanceTimersByTime(4000)})
 expect(screen.getByText('퐁이가 낚시하는 중…')).toBeTruthy()
 view.rerender(<FishingDialog {...props} result={{...result,rarity:'epic',species:{id:'star-pongul',kind:'fish',name:'별무늬 퐁울복',description:'별빛 친구',rarity:'epic',thumbnail_path:'fish/thumbnail.png',sprite_sheet_path:null,swim_y_min:0.2,swim_y_max:0.7,speed:0.05,size:72,sell_price:600}}} pending={false}/>)
 expect(screen.getByText('별무늬 퐁울복 획득!')).toBeTruthy()
})
it('selects all three sprite ranges and samples only known trivia and reasons',()=>{
 expect(pickRandom(fishingScenes,()=>0).id).toBe('pier')
 expect(pickRandom(fishingScenes,()=>0.5).id).toBe('float')
 expect(pickRandom(fishingScenes,()=>0.999).id).toBe('rock')
 const value=createFishingPresentation()
 expect(fishingScenes).toContain(value.scene)
 expect(oceanTrivia).toContain(value.trivia)
 expect(fishingFailureReasons).toContain(value.failure)
})
