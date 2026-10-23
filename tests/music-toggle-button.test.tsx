import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {MusicToggleButton} from '@/features/music/music-toggle-button'

const music=vi.hoisted(()=>({tracks:[{id:'first',title:'첫 곡',customName:''},{id:'current',title:'현재 곡',customName:''}],activeId:null as string|null,playing:false,loading:false,error:'',volume:70,setVolume:vi.fn(),reload:vi.fn(),play:vi.fn(),pause:vi.fn(),stop:vi.fn()}))
vi.mock('@/features/music/music-provider',()=>({useMusic:()=>music}))
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();music.activeId=null;music.playing=false;music.loading=false;music.error='';music.tracks=[{id:'first',title:'첫 곡',customName:''},{id:'current',title:'현재 곡',customName:''}]})
const view=()=> <MemoryRouter><MusicToggleButton/></MemoryRouter>
it('offers explicit playback termination independently of dismissing the music panel',async()=>{
 music.activeId='current';music.playing=true;render(view());await open()
 fireEvent.click(screen.getByRole('button',{name:'재생 종료'}));expect(music.stop).toHaveBeenCalledOnce()
 expect(music.pause).not.toHaveBeenCalled()
 expect(screen.getByRole('dialog',{name:'내 음악'})).toBeTruthy()
})
async function open(){fireEvent.click(screen.getByRole('button',{name:'내 음악 열기'}));return screen.findByRole('dialog',{name:'내 음악'})}
it('opens without changing playback, selects songs, controls playback and keeps playing when dismissed',async()=>{
 const rendered=render(view());await open()
 expect(music.play).not.toHaveBeenCalled();expect(music.pause).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'현재 곡 재생'}));expect(music.play).toHaveBeenCalledWith('current')
 music.activeId='current';music.playing=true;rendered.rerender(view())
 expect(screen.getByRole('button',{name:'현재 곡 재생'}).getAttribute('aria-current')).toBe('true')
 expect(screen.getByRole('button',{name:'내 음악 열기'}).querySelector('.wood-turntable')?.getAttribute('data-playing')).toBe('true')
 fireEvent.click(screen.getByRole('button',{name:'음악 일시정지'}));expect(music.pause).toHaveBeenCalledOnce()
 music.playing=false;rendered.rerender(view())
 fireEvent.click(screen.getByRole('button',{name:'음악 재생'}));expect(music.play).toHaveBeenLastCalledWith('current')
 music.pause.mockClear()
 fireEvent.click(screen.getByRole('button',{name:'내 음악 닫기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(music.pause).not.toHaveBeenCalled()
})
it('wraps previous and next around the saved list and adjusts volume',async()=>{
 music.activeId='first';const rendered=render(view());await open()
 fireEvent.click(screen.getByRole('button',{name:'이전 곡'}));expect(music.play).toHaveBeenLastCalledWith('current')
 music.activeId='current';rendered.rerender(view())
 fireEvent.click(screen.getByRole('button',{name:'다음 곡'}));expect(music.play).toHaveBeenLastCalledWith('first')
 fireEvent.change(screen.getByRole('slider',{name:'음악 볼륨'}),{target:{value:'25'}})
 expect(music.setVolume).toHaveBeenCalledWith(25)
})
it('keeps the launcher and add link available for an empty list',async()=>{
 music.tracks=[];render(view());await open()
 expect(screen.getByText(/저장한 곡이 없어요/)).toBeTruthy()
 expect((screen.getByRole('button',{name:'음악 재생'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.getByRole('link',{name:'음악실에서 곡 추가'}).getAttribute('href')).toBe('/music-room')
})
it('shows loading and retry states while allowing active playback to pause',async()=>{
 music.loading=true;const rendered=render(view());await open()
 expect(screen.getByRole('status')).toBeTruthy()
 expect((screen.getByRole('button',{name:'음악 재생'}) as HTMLButtonElement).disabled).toBe(true)
 music.playing=true;music.loading=false;music.error='연결 실패';rendered.rerender(view())
 fireEvent.click(screen.getByRole('button',{name:'다시 불러오기'}));expect(music.reload).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('button',{name:'음악 일시정지'}));expect(music.pause).toHaveBeenCalledOnce()
})
it('uses a bottom sheet on mobile and closes without pausing',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))
 music.playing=true;render(view());const dialog=await open()
 expect(dialog.className).toContain('notification-sheet')
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(music.pause).not.toHaveBeenCalled()
})
