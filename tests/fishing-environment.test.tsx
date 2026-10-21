import {cleanup,fireEvent,render} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>`/collectibles/${path}`}))
import {FishingSea,FishingPlatform,fishingEnvironments,fishingEnvironment} from '@/features/fishing/fishing-environment'
import {FishingWater} from '@/features/fishing/fishing-water'
import {newTensionGame,fishingBiteSeconds} from '@/features/fishing/tension-game'
afterEach(cleanup)
it('shows water contact through the casting impact on normal and reduced-motion displays',()=>{
 const game={...newTensionGame(()=>.5),phase:'waiting' as const,time:1.5}
 const props={game,visual:{time:1.5,tension:38,reel:0,ending:0},mood:'recover' as const,active:true,reduced:false,regionId:'pongdang'}
 const {container,rerender}=render(<FishingWater {...props}/>)
 expect(container.querySelector('[data-fishing-water-impact]')).toBeTruthy()
 rerender(<FishingWater {...props} reduced/>)
 expect(container.querySelector('[data-fishing-water-impact]')?.getAttribute('data-reduced-motion')).toBe('true')
 rerender(<FishingWater {...props} game={{...game,time:2}}/>)
 expect(container.querySelector('[data-fishing-water-impact]')).toBeNull()
 rerender(<FishingWater {...props} active={false}/>)
 expect(container.querySelector('[data-fishing-water-impact]')).toBeNull()
})
it('shows a chance-failure shadow retreating without bite or resistance effects',()=>{
 const game={...newTensionGame(()=>.5,{failureAt:3}),phase:'playing' as const,time:1}
 const props={game,visual:{time:1,tension:38,reel:0,ending:0},mood:'surge' as const,active:true,reduced:false,regionId:'pongdang'}
 const {container,rerender}=render(<FishingWater {...props}/>)
 const shadow=()=>container.querySelector('[data-fishing-shadow]')!
 const startPosition=shadow().getAttribute('transform')
 expect(Number(shadow().getAttribute('opacity'))).toBeGreaterThan(0)
 expect(container.querySelector('[data-fishing-resistance]')).toBeNull()
 rerender(<FishingWater {...props} game={{...game,time:2.8}} visual={{...props.visual,time:2.8}}/>)
 expect(shadow().getAttribute('transform')).not.toBe(startPosition)
 expect(Number(shadow().getAttribute('opacity'))).toBeLessThan(.22)
 rerender(<FishingWater {...props} game={{...game,phase:'lost',time:3}} visual={{...props.visual,ending:.5}}/>)
 expect(Number(shadow().getAttribute('opacity'))).toBe(0)
})
it('holds the float below the surface before smoothly resurfacing',()=>{
 const game=newTensionGame(()=>.5)
 const props={game:{...game,time:1.3},visual:{time:1.3,tension:38,reel:0,ending:0},mood:'warning' as const,active:true,reduced:false,regionId:'pongdang'}
 const {container,rerender}=render(<FishingWater {...props}/>)
 const opacity=()=>Number(container.querySelector('[data-fishing-float]')?.getAttribute('opacity'))
 expect(opacity()).toBeCloseTo(.12)
 rerender(<FishingWater {...props} game={{...game,time:1.65}}/>)
 expect(opacity()).toBeCloseTo(.12)
 rerender(<FishingWater {...props} game={{...game,time:2.15}}/>)
 expect(opacity()).toBeGreaterThan(.4);expect(opacity()).toBeLessThan(.8)
 rerender(<FishingWater {...props} game={{...game,time:2.7}}/>)
 expect(opacity()).toBe(1)
})
it('keeps the rod straight while scouting and bends only after the first pull starts',()=>{
 const game=newTensionGame(()=>.5)
 const props={game,visual:{time:2,tension:38,reel:0,ending:0},mood:'warning' as const,active:false,reduced:true,regionId:'pongdang'}
 const {container,rerender}=render(<FishingWater {...props}/>)
 const rod=()=>container.querySelector('path[stroke="#102b42"]')?.getAttribute('d')
 const straight=rod()
 rerender(<FishingWater {...props} active pulling game={{...game,phase:'playing',time:.5}}/>)
 expect(rod()).toBe(straight)
 rerender(<FishingWater {...props} active pulling game={{...game,phase:'playing',time:fishingBiteSeconds(game.seed)+.1}} mood="surge"/>)
 expect(rod()).not.toBe(straight)
})
it('keeps region water and terrain assets independently framed',()=>{
 for(const id of Object.keys(fishingEnvironments)){const {container,unmount}=render(<svg><FishingSea regionId={id}/><FishingPlatform regionId={id} y={420}/></svg>);expect(container.querySelector('[data-fishing-sea]')?.getAttribute('data-fishing-sea')).toBe(id);expect(container.querySelector('[data-fishing-platform]')?.getAttribute('y')).toBe('420');expect([...container.querySelectorAll('image')].map(el=>el.getAttribute('href'))).toEqual([fishingEnvironment(id).src,fishingEnvironment(id).platformSrc??fishingEnvironment(id).platformFallbackSrc]);unmount()}
})
it('recovers image loading for the next region after a missing asset',()=>{
 const {container,rerender}=render(<FishingSea regionId="coral"/>);fireEvent.error(container.querySelector('image')!);expect(container.querySelector('image')).toBeNull();rerender(<FishingSea regionId="mistmoon"/>);expect(container.querySelector('image')?.getAttribute('href')).toContain('mistmoon.png')
})
it('uses the starting sea for an unknown region',()=>{const {container}=render(<FishingSea regionId="unknown"/>);expect(container.querySelector('image')?.getAttribute('href')).toContain('pongdang.png')})
it('shows resistance feedback only during an active surge and respects reduced motion',()=>{
 const game={...newTensionGame(()=>.5),phase:'playing' as const,time:1}
 const props={game,visual:{time:1,tension:40,reel:0,ending:0},mood:'surge' as const,active:true,reduced:false,regionId:'pongdang'}
 const {container,rerender}=render(<FishingWater {...props}/> )
 expect(container.querySelector('[data-fishing-resistance]')).toBeTruthy()
 rerender(<FishingWater {...props} reduced/>)
 expect(container.querySelector('[data-fishing-resistance]')).toBeNull()
 rerender(<FishingWater {...props} active={false}/>)
 expect(container.querySelector('[data-fishing-resistance]')).toBeNull()
 rerender(<FishingWater {...props} mood="recover"/>)
 expect(container.querySelector('[data-fishing-resistance]')).toBeNull()
})
it('introduces a shadow during approach and removes it after a failed cast',()=>{
 const game={...newTensionGame(()=>.5),phase:'playing' as const,time:1.5}
 const props={game,visual:{time:1.5,tension:38,reel:0,ending:0},mood:'warning' as const,active:true,reduced:true,regionId:'pongdang'}
 const {container,rerender}=render(<FishingWater {...props}/>)
 expect(container.querySelector('[data-fishing-shadow]')).toBeTruthy()
 expect(Number(container.querySelector('[data-fishing-shadow]')?.getAttribute('opacity'))).toBeLessThan(.25)
 rerender(<FishingWater {...props} game={{...game,phase:'waiting'}}/>)
 expect(container.querySelector('[data-fishing-shadow]')).toBeNull()
 rerender(<FishingWater {...props} active={false}/>)
 expect(container.querySelector('[data-fishing-shadow]')).toBeNull()
})
it('keeps the creature hidden at the surface so only the result screen reveals it',()=>{
 const outline={id:'caught',name:'잡은 물고기',description:'',kind:'fish' as const,rarity:'common' as const,thumbnail_path:'fish/caught.png',sprite_sheet_path:null,swim_y_min:.2,swim_y_max:.8,speed:.03,size:80,sell_price:10}
 const game={...newTensionGame(()=>.5),phase:'won' as const,progress:1}
 const props={game,outline,visual:{time:10,tension:50,reel:0,ending:.5},mood:'recover' as const,active:true,reduced:false,regionId:'pongdang'}
 const {container,rerender}=render(<FishingWater {...props}/>)
 expect(container.querySelector('[data-fishing-lift]')).toBeNull()
 expect(container.querySelector('image[href="/collectibles/fish/caught.png"]')).toBeNull()
 expect(container.querySelector('[data-fishing-shadow]')).toBeNull()
 expect(container.querySelector('[data-fishing-catch-splash]')).toBeTruthy()
 rerender(<FishingWater {...props} reduced/>)
 expect(container.querySelector('[data-fishing-lift]')).toBeNull()
 expect(container.querySelector('[data-fishing-catch-splash]')).toBeNull()
 expect(container.querySelector('[data-fishing-water-impact]')).toBeTruthy()
 rerender(<FishingWater {...props} visual={{...props.visual,ending:1.1}}/>)
 expect(container.querySelector('[data-fishing-catch-splash]')).toBeNull()
})
