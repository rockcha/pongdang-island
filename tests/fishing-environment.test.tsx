import {cleanup,fireEvent,render} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>`/collectibles/${path}`}))
import {FishingSea,FishingPlatform,fishingEnvironments} from '@/features/fishing/fishing-environment'
import {FishingWater} from '@/features/fishing/fishing-water'
import {newTensionGame,fishingBiteSeconds} from '@/features/fishing/tension-game'
afterEach(cleanup)
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
it('pairs each region water and platform with the same region painting',()=>{
 for(const id of Object.keys(fishingEnvironments)){const {container,unmount}=render(<svg><FishingSea regionId={id}/><FishingPlatform regionId={id} y={420}/></svg>);expect(container.querySelector('[data-fishing-sea]')?.getAttribute('data-fishing-sea')).toBe(id);expect(container.querySelector('[data-fishing-platform]')?.getAttribute('y')).toBe('420');expect([...container.querySelectorAll('image')].map(el=>el.getAttribute('href'))).toEqual([`/fishing/environments/${id}.png`,`/fishing/environments/${id}.png`]);unmount()}
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
 rerender(<FishingWater {...props} visual={{...props.visual,ending:1.1}}/>)
 expect(container.querySelector('[data-fishing-catch-splash]')).toBeNull()
})
