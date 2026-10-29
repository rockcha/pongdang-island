import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it} from 'vitest'
import sprites from '../src/features/my-island/island-png-manifest.json'
import {Building} from '../src/features/my-island/island-art'
import {facilities} from '../src/features/my-island/island-model'

it('publishes immutable PNG URLs that match the actual bytes',()=>{
 expect(Object.keys(sprites)).toHaveLength(12)
 for(const url of Object.values(sprites)){
  const bytes=readFileSync('public'+url)
  expect(url).toMatch(/^\/game-art\/island\/[a-f0-9]{24}-(256|384)\.png$/)
  expect(url).toContain(createHash('sha256').update(bytes).digest('hex').slice(0,24))
  expect(bytes.subarray(1,4).toString()).toBe('PNG')
 }
})
it('mirrors decorations while preserving the outer saved rotation',()=>{
 for(const kind of ['tree','pine','flowers','bench']){
  const f=facilities.find(f=>f.kind===kind)!
  for(const rotation of [0,90,180,270]){
   const markup=renderToStaticMarkup(<svg><Building f={f} rotation={rotation}/></svg>)
   expect(markup).toContain('data-png-mirrored="true"')
   expect(markup).toContain(sprites[kind as keyof typeof sprites])
   expect(markup.match(/data-facility-png/g)).toHaveLength(1)
   if(rotation)expect(markup).toContain(`data-art-rotation="${rotation}"`)
  }
 }
})
