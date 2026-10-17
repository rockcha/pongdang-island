import {readFileSync} from 'node:fs'
import vm from 'node:vm'
const nodes=new Map();let count=0,raf
const ctx={setTransform(){},clearRect(){},save(){},translate(){},scale(){},drawImage(){},restore(){}}
const document={
 getElementById(id){if(!nodes.has(id))nodes.set(id,{append(){count++},textContent:''});return nodes.get(id)},
 createElement(){return {append(){},getContext(){return ctx}}},
}
class Image {width=1254;height=1254;decode(){return Promise.resolve()}}
vm.runInNewContext(readFileSync('artifacts/primal-expansion-preview.js','utf8'),{document,Image,requestAnimationFrame:f=>raf=f,console})
await new Promise(resolve=>setTimeout(resolve,0))
raf(4000)
if(count!==34)throw new Error('Expected 34 cards')
console.log('Gallery script smoke test: 34 cards and an animation draw completed. This is not a browser visual test.')
