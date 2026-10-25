import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CatchReveal} from '@/features/fishing/catch-reveal'
import {FishingResultCard} from '@/features/fishing/fishing-result-card'
import type {Species} from '@/features/collection/api'
import type {FishingAttempt} from '@/features/fishing/api'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>path}))
vi.mock('@/features/fishing/fishing-audio',()=>({useFishingAudio:()=>{}}))
const species={id:'relic-shell-hourglass',kind:'relic',name:'조개 모래시계',description:'최대 제작 시간 +2시간',rarity:'rare',thumbnail_path:'relic.png'} as Species
afterEach(cleanup)
it('offers sharing only for mythic relic catches and excludes practice results',()=>{
 const share=vi.fn()
 const {rerender}=render(<CatchReveal species={{...species,rarity:'mythic'}} onShare={share} onDismiss={()=>{}}/>)
 expect(screen.getByRole('button',{name:'자랑하기'})).toBeTruthy()
 rerender(<CatchReveal species={{...species,rarity:'epic'}} onShare={share} onDismiss={()=>{}}/>)
 expect(screen.queryByRole('button',{name:'자랑하기'})).toBeNull()
 rerender(<CatchReveal species={{...species,rarity:'mythic'}} practice onShare={share} onDismiss={()=>{}}/>)
 expect(screen.queryByRole('button',{name:'자랑하기'})).toBeNull()
})
it('puts the relic icon before the title in the full catch reveal',()=>{
 render(<CatchReveal species={species} onDismiss={()=>{}}/>)
 const icon=screen.getByRole('img',{name:'유물'})
 expect(icon.nextSibling?.textContent).toContain('조개 모래시계')
 expect(icon.querySelector('img')?.getAttribute('src')).toBe('/app-icons/relic.png')
})
it('labels relic catches in compact result cards too',()=>{
 render(<FishingResultCard result={{species} as FishingAttempt} pending={false} error="" failure="" onRetry={()=>{}} onContinue={()=>{}}/>)
 expect(screen.getByRole('img',{name:'유물'}).parentElement?.textContent).toContain('조개 모래시계 획득!')
})
