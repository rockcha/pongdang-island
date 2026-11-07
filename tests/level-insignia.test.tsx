import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {LevelInsignia,LevelInsigniaGallery,LevelTag,levelInsigniaTier} from '@/features/experience/level-insignia'
afterEach(cleanup)
it('changes insignia exactly after each ten-level boundary through 150 and keeps the final tier above it',()=>{
 for(let tier=0;tier<15;tier++){
  expect(levelInsigniaTier(tier*10+1)).toBe(tier)
  expect(levelInsigniaTier((tier+1)*10)).toBe(tier)
 }
 expect(levelInsigniaTier(100)).toBe(9)
 expect(levelInsigniaTier(101)).toBe(10)
 expect(levelInsigniaTier(150)).toBe(14)
 expect(levelInsigniaTier(151)).toBe(14)
 expect(levelInsigniaTier(0)).toBeNull();expect(levelInsigniaTier(Number.NaN)).toBeNull()
})

it('reveals the exact level only after clicking the insignia and closes with Escape',async()=>{
 render(<LevelTag level={42}/>)
 expect(screen.queryByText('Lv.42')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'레벨 42'}))
 expect(await screen.findByRole('dialog',{name:'Lv.42'})).toBeTruthy()
 expect(screen.getByText('Lv.42')).toBeTruthy()
 expect(screen.getByText('수평선의 눈')).toBeTruthy()
 expect(screen.queryByText('41–50')).toBeNull()
 expect(screen.getByRole('dialog').querySelector('[data-level-insignia="5"]')).toBeTruthy()
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('uses unique gradient IDs for many badges on one page',()=>{
 const {container}=render(<><LevelInsignia level={42}/><LevelInsignia level={42}/><LevelInsignia level={91}/></>)
 const ids=[...container.querySelectorAll('[id]')].map(node=>node.id)
 expect(new Set(ids).size).toBe(ids.length)
 for(const node of container.querySelectorAll('[fill^="url("]')){
  const id=node.getAttribute('fill')!.slice(5,-1)
  expect(ids).toContain(id)
 }
})
it('lists fifteen exact ranges and marks the current tier',()=>{
 const {container}=render(<LevelInsigniaGallery level={150}/>)
 expect(screen.getAllByRole('listitem')).toHaveLength(15)
 expect(screen.getByText('1–10')).toBeTruthy();expect(screen.getByText('91–100')).toBeTruthy()
 expect(screen.getByText('101–110')).toBeTruthy();expect(screen.getByText('141–150')).toBeTruthy()
 expect(container.querySelector('[aria-current="step"]')?.textContent).toContain('141–150')
})
it('renders five different motifs for the new ranks and identifies the final badge in its popover',async()=>{
 const {container}=render(<>{[101,111,121,131,141].map(level=><LevelInsignia key={level} level={level}/>)}<LevelTag level={150}/></>)
 const crests=[...container.querySelectorAll('svg[data-level-insignia]')].slice(0,5)
 expect(crests.map(c=>c.getAttribute('data-level-insignia'))).toEqual(['11','12','13','14','15'])
 expect(new Set(crests.map(c=>c.querySelector('g[stroke-width="2"]')?.innerHTML)).size).toBe(5)
 fireEvent.click(screen.getByRole('button',{name:'레벨 150'}))
 expect(await screen.findByRole('dialog',{name:'Lv.150'})).toBeTruthy()
 expect(screen.getByText('퐁당섬의 전설')).toBeTruthy()
})
it('does not invent a badge while a level is loading or unavailable',()=>{
 const view=render(<LevelTag loading/>)
 expect(screen.getByLabelText('레벨 확인 중')).toBeTruthy()
 expect(view.container.querySelector('svg')).toBeNull()
 view.rerender(<LevelTag level={11}/>)
 expect(screen.getByLabelText('레벨 11')).toBeTruthy()
 expect(view.container.querySelector('svg')?.getAttribute('data-level-insignia')).toBe('2')
})
