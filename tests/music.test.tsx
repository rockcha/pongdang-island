import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {Link,MemoryRouter,Route,Routes,useLocation} from 'react-router'
import {MusicProvider,useMusic} from '@/features/music/music-provider'
import {claimPlayback} from '@/features/music/playback-ownership'
import {defaultTracks,readTracks,youtubeId} from '@/features/music/music-library'

const api=vi.hoisted(()=>({loadMusic:vi.fn(),editMusic:vi.fn()}))
vi.mock('@/features/music/api',()=>api)
afterEach(()=>{cleanup();localStorage.clear();delete window.YT;vi.restoreAllMocks();vi.unstubAllGlobals();vi.clearAllMocks()})
it('accepts video URL formats, discards radio parameters, and rejects unrelated URLs',()=>{
 for(const url of ['https://www.youtube.com/watch?v=28kGcceYcOI&list=RD28kGcceYcOI&start_radio=1','https://youtu.be/28kGcceYcOI?t=10','https://music.youtube.com/watch?v=28kGcceYcOI','https://www.youtube.com/shorts/28kGcceYcOI'])expect(youtubeId(url)).toBe('28kGcceYcOI')
 for(const url of ['https://youtube.com.evil.test/watch?v=28kGcceYcOI','javascript:alert(1)','https://youtube.com/playlist?list=123','https://youtu.be/no'])expect(youtubeId(url)).toBeNull()
})
it('restores an intentionally empty list and falls back safely for invalid storage',()=>{
 expect(readTracks('music')).toEqual(defaultTracks)
 localStorage.setItem('music','[]');expect(readTracks('music')).toEqual([])
 localStorage.setItem('music','invalid');expect(readTracks('music')).toEqual(defaultTracks)
})
function Controls(){const m=useMusic(),{pathname}=useLocation();return <>{pathname==='/'&&<div ref={m.setPlayerSlot}/>}<span role="status">{m.playing?'playing':'paused'}</span><button onClick={()=>m.play(m.tracks[0].id)}>play</button><button onClick={()=>m.pause()}>pause</button><button onClick={()=>m.remove(m.tracks[0].id)}>remove</button><button onClick={()=>m.rename(m.tracks[0].id,'내 노래')}>rename</button><Link to="/other">move</Link></>}
it('restores volume on player readiness and retains changes for subsequent songs',async()=>{
 localStorage.setItem('volume-test:volume','35')
 localStorage.setItem('volume-test',JSON.stringify(defaultTracks.map(t=>({...t,title:'Saved song'}))))
 let ready:(event:unknown)=>void=()=>{}
 const target={setVolume:vi.fn(),playVideo:vi.fn(),pauseVideo:vi.fn(),destroy:vi.fn(),getVideoData:()=>({title:'Saved song'})}
 window.YT={Player:vi.fn(function(_element:HTMLElement,options:Record<string,unknown>){ready=(options.events as {onReady:typeof ready}).onReady;return target}) as unknown as NonNullable<typeof window.YT>['Player']}
 function VolumeControls(){const m=useMusic();return <><button onClick={()=>m.play(m.tracks[0].id)}>first</button><button onClick={()=>m.play(m.tracks[1].id)}>next</button><input aria-label="volume" type="range" value={m.volume} onChange={e=>m.setVolume(Number(e.target.value))}/></>}
 render(<MusicProvider storageKey="volume-test"><VolumeControls/></MusicProvider>)
 expect((screen.getByLabelText('volume') as HTMLInputElement).value).toBe('35')
 fireEvent.click(screen.getByText('first'))
 await waitFor(()=>expect(window.YT!.Player).toHaveBeenCalledTimes(1))
 act(()=>ready({target}));expect(target.setVolume).toHaveBeenLastCalledWith(35)
 fireEvent.change(screen.getByLabelText('volume'),{target:{value:'20'}})
 expect(target.setVolume).toHaveBeenLastCalledWith(20)
 expect(localStorage.getItem('volume-test:volume')).toBe('20')
 fireEvent.click(screen.getByText('next'))
 await waitFor(()=>expect(window.YT!.Player).toHaveBeenCalledTimes(2))
 act(()=>ready({target}));expect(target.setVolume).toHaveBeenLastCalledWith(20)
})
it('keeps one looping player across navigation, reflects actual playback, and stops on deletion',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({title:'YouTube title'})}))
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 let events:Record<string,(e:unknown)=>void>={}
 const destroy=vi.fn(),pauseVideo=vi.fn(),playVideo=vi.fn()
 const create=vi.fn(function(_element:HTMLElement,options:Record<string,unknown>){events=options.events as typeof events;expect(options.playerVars).toMatchObject({loop:1,playlist:'28kGcceYcOI'});return {destroy,pauseVideo,playVideo,getVideoData:()=>({title:'YouTube title'})}})
 window.YT={Player:create as unknown as NonNullable<typeof window.YT>['Player']}
 const view=render(<MemoryRouter><MusicProvider storageKey="music"><Controls/><Routes><Route path="/" element={<p>home</p>}/><Route path="/other" element={<p>other</p>}/></Routes></MusicProvider></MemoryRouter>)
 fireEvent.click(screen.getByText('play'));await waitFor(()=>expect(create).toHaveBeenCalledTimes(1))
 events.onStateChange({data:1,target:{getVideoData:()=>({title:'YouTube title'})}})
 await waitFor(()=>expect(screen.getByText('playing')).toBeTruthy())
 const playerElement=screen.getByLabelText('음악 플레이어')
 expect(playerElement.style.visibility).toBe('visible')
 fireEvent.click(screen.getByText('move'));expect(screen.getByText('other')).toBeTruthy();expect(create).toHaveBeenCalledTimes(1);expect(destroy).not.toHaveBeenCalled()
 expect(screen.getByLabelText('음악 플레이어')).toBe(playerElement)
 expect(playerElement.style.visibility).toBe('hidden')
 expect(screen.getByText('playing')).toBeTruthy()
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'})
 fireEvent(document,new Event('visibilitychange'));expect(pauseVideo).not.toHaveBeenCalled()
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
 fireEvent(window,new Event('focus'));expect(playVideo).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByText('pause'));playVideo.mockClear()
 fireEvent(document,new Event('visibilitychange'));fireEvent(window,new Event('focus'));expect(playVideo).not.toHaveBeenCalled()
 fireEvent.click(screen.getByText('play'))

 fireEvent.click(screen.getByText('rename'));await waitFor(()=>expect(JSON.parse(localStorage.getItem('music')!)[0].customName).toBe('내 노래'))
 fireEvent.click(screen.getByText('remove'));await waitFor(()=>expect(destroy).toHaveBeenCalled());expect(pauseVideo).toHaveBeenCalled();expect(screen.queryByLabelText('음악 플레이어')).toBeNull()
 await waitFor(()=>expect(readTracks('music')).toHaveLength(2));view.unmount()
})

it('pauses library music for a region and prevents focus and late player events from resuming it',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({title:'title'})}))
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 let events:Record<string,(e:unknown)=>void>={}
 const pauseVideo=vi.fn(),playVideo=vi.fn()
 const target={pauseVideo,playVideo,destroy:vi.fn(),getVideoData:()=>({title:'title'})}
 window.YT={Player:vi.fn(function(_element:HTMLElement,options:Record<string,unknown>){events=options.events as typeof events;return target}) as unknown as NonNullable<typeof window.YT>['Player']}
 render(<MemoryRouter><MusicProvider storageKey="music"><Controls/></MusicProvider></MemoryRouter>)
 fireEvent.click(screen.getByText('play'))
 await waitFor(()=>expect(events.onReady).toBeTruthy())
 act(()=>events.onReady({target}))
 act(()=>claimPlayback('region'))
 expect(pauseVideo).toHaveBeenCalled()
 playVideo.mockClear()
 fireEvent(window,new Event('focus'))
 expect(playVideo).not.toHaveBeenCalled()
 act(()=>events.onStateChange({data:1,target}))
 expect(screen.getByRole('status').textContent).toBe('paused')
 expect(pauseVideo).toHaveBeenCalledTimes(2)
})
function LibraryControls(){const m=useMusic();return <><p>{m.tracks.map(t=>t.customName||t.title).join(',')}</p><p>{m.error}</p><button onClick={()=>void m.rename(m.tracks[0].id,'새 이름').catch(()=>{})}>save name</button></>}
it('imports the browser list once and replaces cache only after the DB confirms a change',async()=>{
 const cached=[{id:'28kGcceYcOI',title:'원래 제목',customName:'브라우저 이름'}]
 localStorage.setItem('db-music',JSON.stringify(cached))
 api.loadMusic.mockResolvedValue([{...cached[0],customName:'DB 이름'}])
 let resolveSave:(value:unknown)=>void=()=>{}
 api.editMusic.mockImplementation(()=>new Promise(resolve=>{resolveSave=resolve}))
 render(<MemoryRouter><MusicProvider storageKey="db-music" userId="owner"><LibraryControls/></MusicProvider></MemoryRouter>)
 await screen.findByText('DB 이름');expect(api.loadMusic).toHaveBeenCalledWith(cached)
 fireEvent.click(screen.getByText('save name'));await waitFor(()=>expect(api.editMusic).toHaveBeenCalledWith('rename','28kGcceYcOI','','새 이름'))
 expect(screen.queryByText('새 이름')).toBeNull()
 resolveSave([{...cached[0],customName:'새 이름'}])
 await screen.findByText('새 이름')
 await waitFor(()=>expect(readTracks('db-music')[0].customName).toBe('새 이름'))
})
it('preserves an empty browser import and shows DB connection failure without overwriting the cache',async()=>{
 localStorage.setItem('db-music','[]');api.loadMusic.mockRejectedValue(new Error('offline'))
 render(<MemoryRouter><MusicProvider storageKey="db-music" userId="owner"><LibraryControls/></MusicProvider></MemoryRouter>)
 await screen.findByText('음악 목록에 연결하지 못했어요.')
 expect(api.loadMusic).toHaveBeenCalledWith([])
 expect(localStorage.getItem('db-music')).toBe('[]')
})
