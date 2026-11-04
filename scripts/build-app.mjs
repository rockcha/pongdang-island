import {spawn} from 'node:child_process'
import {appendFile,mkdir,readdir,stat,writeFile} from 'node:fs/promises'
import {performance} from 'node:perf_hooks'
import path from 'node:path'

const args=process.argv.slice(2)
if(args.length&&!(args.length===2&&args[0]==='--out-dir'&&args[1]))throw Error('Usage: npm run build -- [--out-dir <directory>]')
const output=args[1]??'dist'
const started=performance.now(),steps=[]
const report={startedAt:new Date().toISOString(),commit:process.env.VERCEL_GIT_COMMIT_SHA??process.env.GITHUB_SHA??null,status:'running',steps}
async function run(name,file,args=[]){
 const start=performance.now()
 console.log(`\n[build] ${name}`)
 const code=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[file,...args],{stdio:'inherit',env:process.env})
  child.once('error',reject);child.once('exit',(code,signal)=>signal?reject(Error(`${name}: ${signal}`)):resolve(code))
 })
 steps.push({name,seconds:Number(((performance.now()-start)/1000).toFixed(2)),exitCode:code})
 if(code!==0)throw Error(`${name} failed (exit ${code})`)
}
async function size(dir){
 const entries=(await readdir(dir,{withFileTypes:true,recursive:true})).filter(entry=>entry.isFile())
 let bytes=0
 // Bound parallel metadata reads; sequential stats add noticeable Windows/OneDrive latency.
 for(let i=0;i<entries.length;i+=64){
  const batch=await Promise.all(entries.slice(i,i+64).map(entry=>stat(path.join(entry.parentPath,entry.name))))
  bytes+=batch.reduce((sum,file)=>sum+file.size,0)
 }
 return {files:entries.length,bytes}
}
try{
 await run('Generate title tiers','scripts/build-title-tiers.mjs')
 await run('Generate voyage artwork references','scripts/build-voyage-bait-art.mjs')
 await run('Generate push presentation','scripts/build-push-presentation.mjs')
 await run('TypeScript','node_modules/typescript/bin/tsc',['-b','--pretty','false'])
 await run('Vite + PWA','node_modules/vite/bin/vite.js',['build',...(args.length?['--outDir',output]:[])])
 const measureStart=performance.now()
 report.output=await size(output)
 report.measurementSeconds=Number(((performance.now()-measureStart)/1000).toFixed(2))
 report.status='success'
}catch(error){report.status='failed';console.error(error.message);process.exitCode=1}
finally{
 report.seconds=Number(((performance.now()-started)/1000).toFixed(2))
 await mkdir('artifacts/deploy',{recursive:true})
 await writeFile('artifacts/deploy/build-report.json',JSON.stringify(report,null,2)+'\n')
 const rows=steps.map(s=>`| ${s.name} | ${s.seconds}s | ${s.exitCode===0?'pass':'fail'} |`)
 const summary=['## App build',`Status: ${report.status}; total: ${report.seconds}s`,'','| Stage | Time | Result |','| --- | ---: | --- |',...rows,'',...(report.output?[`Output: ${report.output.files} files, ${(report.output.bytes/1048576).toFixed(1)} MiB`]:[]),''].join('\n')
 console.log(summary)
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary)
}
