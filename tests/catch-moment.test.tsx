import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {CatchMoment} from '@/features/showcase/catch-moment'
import {practiceSpecies} from '@/features/fishing/fishing-practice'
const paint=vi.hoisted(()=>vi.fn())
vi.mock('@/features/showcase/moment-art',()=>({paintCatchMoment:paint}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/original/'+path}))
vi.mock('@/features/collection/thumbnail-art',()=>({optimizedThumbnailUrl:()=>'/optimized.webp'}))
beforeEach(()=>{paint.mockReset()})
afterEach(()=>{cleanup();vi.clearAllMocks()})

it('reports pending and painted readiness before publication can proceed',async()=>{
 let finish!:()=>void;paint.mockReturnValue(new Promise<void>(resolve=>{finish=resolve}))
 const ready=vi.fn();render(<CatchMoment species={practiceSpecies('epic')} onReadyChange={ready}/>)
 expect(ready).toHaveBeenLastCalledWith(false)
 expect(screen.getByText('바다의 순간을 준비하는 중…')).toBeTruthy()
 finish();await waitFor(()=>expect(ready).toHaveBeenLastCalledWith(true))
 expect(screen.queryByText('바다의 순간을 준비하는 중…')).toBeNull()
})

it('shows the real fish and metadata when canvas painting fails, falling back to the original if needed',async()=>{
 paint.mockRejectedValue(new Error('canvas blocked'))
 const fish={...practiceSpecies('epic'),id:'muk-test',name:'먹빛 물고기'},ready=vi.fn()
 render(<CatchMoment species={fish} regionName="묵향 해역" onReadyChange={ready}/>)
 let image=await screen.findByRole('img',{name:fish.name})
 expect(image.getAttribute('src')).toBe('/optimized.webp')
 expect(document.querySelector('[data-catch-moment]')?.getAttribute('style')).toContain('245, 238, 223')
 fireEvent.error(image)
 image=screen.getByRole('img',{name:fish.name});expect(image.getAttribute('src')).toBe('/original/'+fish.thumbnail_path)
 expect(ready).toHaveBeenLastCalledWith(false)
 fireEvent.load(image);expect(ready).toHaveBeenLastCalledWith(true)
 expect(screen.getByText('기본 이미지로 표시하고 있어요.')).toBeTruthy()
})

it('keeps failed images unready, supports retry and ignores an old paint after switching catches',async()=>{
 let oldFinish!:()=>void;paint.mockReturnValueOnce(new Promise<void>(resolve=>{oldFinish=resolve})).mockRejectedValue(new Error('offline'))
 const ready=vi.fn(),view=render(<CatchMoment species={practiceSpecies('epic')} onReadyChange={ready}/>)
 const next={...practiceSpecies('mythic'),id:'new-fish'};view.rerender(<CatchMoment species={next} onReadyChange={ready}/>)
 const image=await screen.findByRole('img',{name:next.name});fireEvent.error(image);fireEvent.error(screen.getByRole('img',{name:next.name}))
 await screen.findByText('이미지를 불러오지 못했어요.')
 oldFinish();await Promise.resolve();expect(ready).toHaveBeenLastCalledWith(false)
 paint.mockResolvedValue(undefined);fireEvent.click(screen.getByRole('button',{name:'다시 불러오기'}))
 await waitFor(()=>expect(ready).toHaveBeenLastCalledWith(true))
})
it('requires both crafted relic images before accepting fallback artwork',async()=>{
 paint.mockRejectedValue(new Error('canvas blocked'))
 const species={...practiceSpecies('epic'),kind:'relic' as const,crafted:true,attached:{id:'b',name:'결합 조개',thumbnail_path:'attached.png'}},ready=vi.fn()
 render(<CatchMoment species={species} onReadyChange={ready}/>)
 const base=await screen.findByRole('img',{name:species.name})
 fireEvent.load(base);expect(ready).toHaveBeenLastCalledWith(false)
 fireEvent.load(screen.getByRole('img',{name:'결합 유물: 결합 조개'}))
 expect(ready).toHaveBeenLastCalledWith(true)
})
