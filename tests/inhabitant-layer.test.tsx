import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { InhabitantLayerEditor } from '@/features/aquarium/inhabitant-layer-editor'
import { inhabitantDepth } from '@/features/aquarium/inhabitant-depth'
import type { OwnedCollectible } from '@/features/collection/api'
afterEach(cleanup)
it('preserves automatic fish and decoration depths and honors an explicit zero',()=>{
 const item={species:{id:'plain',kind:'fish'}} as OwnedCollectible
 expect(inhabitantDepth(item)).toBe(200)
 expect(inhabitantDepth({...item,display_layer:0})).toBe(0)
 expect(inhabitantDepth({...item,display_layer:800})).toBe(800)
 expect(inhabitantDepth({...item,species:{...item.species,kind:'decoration'}})).toBe(0)
})
it('saves priority changes and restores automatic ordering',async()=>{
 const change=vi.fn(async()=>{})
 const view=render(<InhabitantLayerEditor value={null} automatic={200} busy={false} onChange={change}/>)
 fireEvent.click(screen.getByRole('button',{name:'개체 앞으로'}))
 await waitFor(()=>expect(change).toHaveBeenCalledWith(201))
 await waitFor(()=>expect(screen.getByRole('textbox',{name:'개체 표시 우선순위'})).toHaveProperty('value','201'))
 view.rerender(<InhabitantLayerEditor value={201} automatic={200} busy={false} onChange={change}/>)
 fireEvent.click(screen.getByRole('button',{name:'개체 앞뒤 순서 자동'}))
 await waitFor(()=>expect(change).toHaveBeenLastCalledWith(null))
})
it('validates typed priorities and leaves failed saves retryable',async()=>{
 const change=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
 render(<InhabitantLayerEditor value={null} automatic={200} busy={false} onChange={change}/>)
 const input=screen.getByRole('textbox',{name:'개체 표시 우선순위'})
 for(const value of ['801','-1','1.5','oops']){
  fireEvent.change(input,{target:{value}});fireEvent.blur(input)
  expect(screen.getByRole('alert').textContent).toContain('0~800')
 }
 expect(change).not.toHaveBeenCalled()
 fireEvent.change(input,{target:{value:'450'}});fireEvent.keyDown(input,{key:'Enter'})
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('저장하지 못했어요'))
 expect(input).toHaveProperty('value','200')
 fireEvent.click(screen.getByRole('button',{name:'개체 뒤로'}))
 await waitFor(()=>expect(change).toHaveBeenLastCalledWith(199))
})
