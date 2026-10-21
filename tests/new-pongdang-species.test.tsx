import {readFileSync} from 'node:fs'
import {render,screen,cleanup,fireEvent,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {NewPongdangSpecies,recentSpeciesIds} from '@/features/regions/new-pongdang-species'
import type {CatalogEntry} from '@/features/collection/api'
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><img alt={name}/>}))
const source=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const catalog=source.collectible_species.map((s:CatalogEntry)=>({...s,discovered:true,habitats:[]})) as CatalogEntry[]
afterEach(cleanup)
const released=Date.parse('2026-10-21T00:00:00+09:00')
it('shows the 17 new species from every sea with silhouettes and full descriptions',()=>{
 const view=render(<NewPongdangSpecies catalog={catalog} now={released}/>)
 expect(screen.getAllByRole('tab').map(tab=>tab.textContent)).toEqual(['일반9','희귀1','특급3','신화4'])
 expect(screen.getAllByRole('article')).toHaveLength(9)
 expect(view.container.querySelectorAll('[data-silhouette="true"]')).toHaveLength(9)
 expect(screen.queryByRole('heading',{name:'퐁이 탐사로봇 NEW'})).toBeNull()
 for(const article of screen.getAllByRole('article')){
  const name=article.querySelector('h4')!.textContent!.replace(/ NEW$/,'')
  const species=catalog.find(s=>s.name===name)!
  expect(article.textContent).toContain(species.description)
 }
 expect(screen.getByRole('heading',{name:'푸른볼 쥐치 NEW'})).toBeTruthy()
 expect(screen.getAllByRole('img',{name:/주 서식지:/})).toHaveLength(9)
 fireEvent.click(screen.getByRole('tab',{name:/특급/}))
 expect(screen.getAllByRole('article')).toHaveLength(3)
 expect(screen.getByRole('heading',{name:'루네아의 거울비늘 NEW'})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:/희귀/}))
 expect(screen.getAllByRole('article')).toHaveLength(1)
 fireEvent.click(screen.getByRole('tab',{name:/신화/}))
 expect(screen.getAllByRole('article')).toHaveLength(4)
 const shared=screen.getByRole('heading',{name:'병 속의 바다, 유리온 NEW'}).closest('article')!
 expect(within(shared).queryByRole('img',{name:/주 서식지:/})).toBeNull()
 expect(screen.getAllByRole('img',{name:/주 서식지:/})).toHaveLength(1)
})
it('starts at release and expires exactly seven days later',()=>{
 expect(recentSpeciesIds(released-1).size).toBe(0)
 expect(recentSpeciesIds(released).size).toBe(17)
 expect(recentSpeciesIds(released+7*86400000-1).size).toBe(17)
 expect(recentSpeciesIds(released+7*86400000).size).toBe(0)
})
it('removes expired entries while the page stays open',()=>{
 const view=render(<NewPongdangSpecies catalog={catalog} now={released}/>)
 view.rerender(<NewPongdangSpecies catalog={catalog} now={released+7*86400000}/>)
 expect(screen.queryByRole('article')).toBeNull()
 expect(screen.getByText('새로운 개체를 준비하고 있어요.')).toBeTruthy()
})
