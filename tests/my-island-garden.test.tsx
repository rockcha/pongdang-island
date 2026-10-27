import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {gardenDecorations} from '@/features/my-island/garden-decoration-catalog'
import {Building} from '@/features/my-island/island-art'
import {defaultState,parseState,decorationConnections} from '@/features/my-island/island-model'
it('renders every garden item with its own artwork and supports three hydrangea colors',()=>{
 expect(gardenDecorations).toHaveLength(15)
 for(const f of gardenDecorations){const html=renderToStaticMarkup(<svg><Building f={f}/></svg>);expect(html,f.name).toContain(`data-garden="${f.kind}"`)}
 expect(new Set(gardenDecorations.filter(f=>f.kind==='hydrangea').map(f=>f.color)).size).toBe(3)
})
it('connects only adjacent matching fence or wall pieces and updates when a neighbor moves',()=>{
 const fence={id:'wood-fence~a',x:10,y:10},east={id:'wood-fence~b',x:11,y:10},wall={id:'stone-wall~a',x:10,y:9}
 expect(decorationConnections([fence,east,wall],fence)).toEqual({north:false,east:true,south:false,west:false})
 expect(decorationConnections([fence,{...east,x:12},wall],fence).east).toBe(false)
 const f=gardenDecorations.find(f=>f.id==='wood-fence')!
 expect(renderToStaticMarkup(<svg><Building f={f} connections={decorationConnections([fence,east],fence)}/></svg>)).toContain('data-connected="e"')
})
it('persists bounded sign text, drops unrelated labels and escapes displayed text',()=>{
 const id='wood-arrow-sign~test',other='tree~test'
 const state={...defaultState(),owned:[id,other],layout:[{id,x:10,y:10,label:'  바닷길  '},{id:other,x:12,y:10,label:'ignored'}]}
 expect(parseState(state).layout[0].label).toBe('바닷길')
 expect(parseState(state).layout.find(p=>p.id===other)?.label).toBeUndefined()
 expect(parseState({...state,layout:[{id,x:10,y:10,label:'가'.repeat(20)}]}).layout[0].label).toHaveLength(16)
 const html=renderToStaticMarkup(<svg><Building f={gardenDecorations[0]} label="<script>"/></svg>)
 expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>')
})
