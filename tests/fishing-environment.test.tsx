import {cleanup,fireEvent,render} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {FishingSea,FishingPlatform,fishingEnvironments} from '@/features/fishing/fishing-environment'
afterEach(cleanup)
it('pairs each region water and platform with the same region painting',()=>{
 for(const id of Object.keys(fishingEnvironments)){const {container,unmount}=render(<svg><FishingSea regionId={id}/><FishingPlatform regionId={id} y={420}/></svg>);expect(container.querySelector('[data-fishing-sea]')?.getAttribute('data-fishing-sea')).toBe(id);expect(container.querySelector('[data-fishing-platform]')?.getAttribute('y')).toBe('420');expect([...container.querySelectorAll('image')].map(el=>el.getAttribute('href'))).toEqual([`/fishing/environments/${id}.png`,`/fishing/environments/${id}.png`]);unmount()}
})
it('recovers image loading for the next region after a missing asset',()=>{
 const {container,rerender}=render(<FishingSea regionId="coral"/>);fireEvent.error(container.querySelector('image')!);expect(container.querySelector('image')).toBeNull();rerender(<FishingSea regionId="mistmoon"/>);expect(container.querySelector('image')?.getAttribute('href')).toContain('mistmoon.png')
})
it('uses the starting sea for an unknown region',()=>{const {container}=render(<FishingSea regionId="unknown"/>);expect(container.querySelector('image')?.getAttribute('href')).toContain('pongdang.png')})
