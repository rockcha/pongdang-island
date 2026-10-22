import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
const reports=JSON.parse(readFileSync('assets/storage-upload/new/20261022-090000/registration.json','utf8').replace(/^\uFEFF/,''))
it('keeps all 56 source poses clear of their cell borders before any padding',()=>{
 expect(reports).toHaveLength(7)
 for(const report of reports){
  const {cell,bounds}=report.rawAudit
  expect(bounds,report.id).toHaveLength(8)
  for(const [x,y,width,height] of bounds){
   expect(Math.min(x,y,cell-x-width,cell-y-height),report.id).toBeGreaterThanOrEqual(cell*.08)
  }
  expect(report.audit.extent,report.id).toBeLessThanOrEqual(.9)
 }
})
