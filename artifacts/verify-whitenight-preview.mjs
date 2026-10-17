import {readFileSync} from 'node:fs'
import vm from 'node:vm'
let count=0,raf,draws=0
const nodes=new Map(),ctx={setTransform(){},clearRect(){},save(){},translate(){},scale(){},drawImage(){draws++},restore(){}}
const document={querySelector(id){if(!nodes.has(id))nodes.set(id,{append(){count++},textContent:''});return nodes.get(id)},createElement(){return {append(){},getContext(){return ctx}}}}
class Image{width=1254;height=1254;naturalWidth=1254;complete=true}
vm.runInNewContext(readFileSync('artifacts/whitenight-expansion-preview.js','utf8'),{document,Image,requestAnimationFrame:f=>raf=f,console})
for(const t of [0,1000,3500,5000,6000])raf(t)
if(count!==32||draws!==160)throw Error('Unexpected gallery render count')
console.log('Preview script: 32 cards and five animation draws passed; not a browser visual test.')
