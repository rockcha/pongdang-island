import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
import {fishingEnvironment} from '@/features/fishing/fishing-environment'
import {fishingRods} from '@/features/fishing/fishing-rods'
import {RodSkinFrame,RodSkinRotor,RodSkinFloat} from '@/features/fishing/rod-skin-art'
import {rodThumbnailUrl} from '@/features/fishing/rod-image-assets'

describe('묵향 해역 장비',()=>{
 it('connects the region painting and all moving equipment parts',()=>{
  expect(fishingEnvironment('mukhyang').src).toBe('/fishing/environments/mukhyang.png')
  expect(fishingRods.find(r=>r.id==='mukhyang')?.region).toBe('mukhyang')
  expect(rodThumbnailUrl('mukhyang')).toBe('/collectibles/equipment/rods/mukhyang/thumbnail.png')
  const markup=renderToStaticMarkup(<svg><RodSkinFrame id="mukhyang"/><RodSkinRotor id="mukhyang"/><RodSkinFloat id="mukhyang"/></svg>)
  for(const part of ['frame','rotor','float'])expect(markup).toContain(`data-skin-${part}="mukhyang"`)
  for(const file of ['reel-frame','reel-rotor','float'])expect(markup).toContain(`/collectibles/equipment/rods/mukhyang/${file}.png`)
 })
})
