import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {ExplorationSoundSettings} from '@/features/exploration/sound-settings'

const settings=vi.hoisted(()=>({music:40,effects:65,enabled:true}))
vi.mock('@/features/audio/audio-preferences',()=>({
 audioVolume:(channel:'music'|'effects')=>settings[channel],audioVolumeChanged:'test-volume',
 saveAudioVolume:(channel:'music'|'effects',value:number)=>{settings[channel]=value;window.dispatchEvent(new Event('test-volume'));return true},
}))
vi.mock('@/features/fishing/sound-preference',()=>({
 readFishingSound:()=>settings.enabled,fishingSoundChanged:'test-sound',
 saveFishingSound:(enabled:boolean)=>{settings.enabled=enabled;window.dispatchEvent(new Event('test-sound'));return true},
}))
beforeEach(()=>{settings.music=40;settings.effects=65;settings.enabled=true})
afterEach(cleanup)
function show(){const preview=vi.fn();render(<ExplorationSoundSettings onPreview={preview}/>);fireEvent.click(screen.getByRole('button',{name:'탐험 소리 설정'}));return preview}

it('changes both channels immediately, restores muted volume and syncs outside changes',()=>{
 show()
 const music=screen.getByRole('slider',{name:'배경음악 음량'})
 fireEvent.change(music,{target:{value:'28'}})
 expect(settings.music).toBe(28)
 fireEvent.click(screen.getByRole('button',{name:'배경음악 끄기'}))
 expect(settings.music).toBe(0)
 fireEvent.click(screen.getByRole('button',{name:'배경음악 켜기'}))
 expect(settings.music).toBe(28)
 act(()=>{settings.music=72;window.dispatchEvent(new Event('test-volume'))})
 expect(music).toHaveProperty('value','72')
 fireEvent.change(screen.getByRole('slider',{name:'효과음 음량'}),{target:{value:'33'}})
 expect(settings.effects).toBe(33)
})

it('can enable previously muted effects and only previews while audible',()=>{
 settings.enabled=false
 const preview=show()
 expect(screen.getByRole('slider',{name:'효과음 음량'})).toHaveProperty('value','0')
 const button=screen.getByRole('button',{name:'효과음 미리 듣기'})
 expect(button).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'효과음 켜기'}))
 expect(settings.enabled).toBe(true)
 fireEvent.click(button);expect(preview).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('button',{name:'효과음 끄기'}))
 expect(button).toHaveProperty('disabled',true)
})
