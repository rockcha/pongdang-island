import {readFileSync} from 'node:fs'
import {render,screen,cleanup,fireEvent,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {NewPongdangSpecies,recentSpeciesIds} from '@/features/regions/new-pongdang-species'
import type {CatalogEntry} from '@/features/collection/api'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
const source=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const catalog=source.collectible_species.map((s:CatalogEntry)=>({...s,discovered:true,habitats:[]})) as CatalogEntry[]
afterEach(cleanup)
const released=Date.parse('2026-10-21T00:00:00+09:00')
const additionalRelease=Date.parse('2026-10-21T12:28:39+09:00')
const releases=JSON.parse(readFileSync('src/features/regions/species-releases.json','utf8')) as {releasedAt:string;speciesIds:string[]}[]
it('shows the first 17 species with descriptions and region icons with collectible thumbnails',()=>{
 const view=render(<NewPongdangSpecies catalog={catalog} now={released}/>)
 expect(screen.getAllByRole('tab').map(tab=>tab.textContent)).toEqual(['일반9','희귀1','특급3','신화4'])
 expect(screen.getAllByRole('article')).toHaveLength(9)
 expect(screen.queryByRole('heading',{level:2})).toBeNull()
 for(const article of screen.getAllByRole('article'))expect(article.querySelector('img[loading="lazy"]')).toBeTruthy()
 expect(view.container.querySelectorAll('[data-silhouette="true"]')).toHaveLength(0)
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
 const firstRelease=new Map<string,number>()
 for(const release of releases)for(const id of release.speciesIds)firstRelease.set(id,Math.min(firstRelease.get(id)??Infinity,Date.parse(release.releasedAt)))
 for(const [id,start] of firstRelease){
  expect(recentSpeciesIds(start-1).has(id)).toBe(false)
  expect(recentSpeciesIds(start).has(id)).toBe(true)
  expect(recentSpeciesIds(start+7*86400000-1).has(id)).toBe(true)
  expect(recentSpeciesIds(start+7*86400000).has(id)).toBe(false)
 }
})
it('removes expired entries while the page stays open',()=>{
 const view=render(<NewPongdangSpecies catalog={catalog} now={released}/>)
 const lastRelease=Math.max(...releases.map(r=>Date.parse(r.releasedAt)))
 view.rerender(<NewPongdangSpecies catalog={catalog} now={lastRelease+7*86400000}/>)
 expect(screen.queryByRole('article')).toBeNull()
 expect(screen.getByText('새로운 개체를 준비하고 있어요.')).toBeTruthy()
})
it('includes the 30 collectibles and three new plush toys in their rarity tabs',()=>{
 render(<NewPongdangSpecies catalog={catalog} now={additionalRelease}/>)
 expect(screen.getAllByRole('tab').map(tab=>tab.textContent)).toEqual(['일반18','희귀15','특급11','신화6'])
 expect(screen.getByRole('heading',{name:'볼주머니 도토리복 NEW'})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:/희귀/}))
 for(const name of ['꽃게 인형','해파리 인형','거북이 인형','부캉이 인형'])expect(screen.getByRole('heading',{name:name+' NEW'})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:/특급/}))
 expect(screen.getByRole('heading',{name:'개봉하지 못한 타임캡슐 NEW'})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:/신화/}))
 expect(screen.getByRole('heading',{name:'멸종을 거부한 이빨, 메갈로돈 NEW'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:'끝나지 않은 출항, 무귀환호 NEW'})).toBeTruthy()
})
