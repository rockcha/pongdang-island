import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MusicToggleButton} from '@/features/music/music-toggle-button'

const music=vi.hoisted(()=>({tracks:[{id:'first',title:'첫 곡',customName:''},{id:'current',title:'현재 곡',customName:''}],activeId:null as string|null,playing:false,loading:false,error:'',play:vi.fn(),pause:vi.fn()}))
vi.mock('@/features/music/music-provider',()=>({useMusic:()=>music}))
afterEach(()=>{cleanup();vi.clearAllMocks();music.activeId=null;music.playing=false;music.loading=false;music.error=''})
it('starts the first song, pauses playback, and resumes the selected song',()=>{
 const view=render(<MusicToggleButton/>)
 fireEvent.click(screen.getByRole('button',{name:'음악 재생'}));expect(music.play).toHaveBeenCalledWith('first')
 music.activeId='current';music.playing=true;view.rerender(<MusicToggleButton/>)
 const playing=screen.getByRole('button',{name:'음악 일시정지'})
 expect(playing.getAttribute('aria-pressed')).toBe('true');expect(playing.querySelector('img')?.getAttribute('data-playing')).toBe('true')
 fireEvent.click(playing);expect(music.pause).toHaveBeenCalledOnce()
 music.playing=false;view.rerender(<MusicToggleButton/>)
 fireEvent.click(screen.getByRole('button',{name:'음악 재생'}));expect(music.play).toHaveBeenLastCalledWith('current')
})
it('blocks new playback while loading but still allows an already playing song to pause',()=>{
 music.loading=true;const view=render(<MusicToggleButton/>)
 expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
 music.playing=true;view.rerender(<MusicToggleButton/>)
 fireEvent.click(screen.getByRole('button',{name:'음악 일시정지'}));expect(music.pause).toHaveBeenCalledOnce()
})
