import {readFileSync} from 'node:fs'
import {render,screen,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {NewPongdangSpecies} from '@/features/regions/new-pongdang-species'
import type {CatalogEntry} from '@/features/collection/api'
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><img alt={name}/>}))
const source=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const catalog=source.collectible_species.map((s:CatalogEntry)=>({...s,discovered:true,habitats:[]})) as CatalogEntry[]
afterEach(cleanup)
it('shows only the 13 released local species, grouped by descending rarity with silhouettes and full descriptions',()=>{
 const view=render(<NewPongdangSpecies catalog={catalog}/>)
 expect(screen.getAllByRole('article')).toHaveLength(13)
 expect(screen.getAllByRole('region').map(r=>r.getAttribute('aria-label'))).toEqual(['신화 신규 개체','특급 신규 개체','희귀 신규 개체','일반 신규 개체'])
 expect(view.container.querySelectorAll('[data-silhouette="true"]')).toHaveLength(13)
 expect(screen.getAllByRole('heading',{level:4})[0].textContent).toBe('퐁이 탐사로봇 NEW')
 for(const article of screen.getAllByRole('article')){
  const name=article.querySelector('h4')!.textContent!.replace(/ NEW$/,'')
  const species=catalog.find(s=>s.name===name)!
  expect(species.native_region_id).toBe('pongdang')
  expect(article.textContent).toContain(species.description)
 }
 expect(screen.getByRole('heading',{name:'퐁당섬 굿즈세트 NEW'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:'가라앉은 퐁당섬 입구 NEW'})).toBeTruthy()
 expect(screen.queryByRole('button')).toBeNull()
})
