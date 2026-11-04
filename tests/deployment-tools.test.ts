// @vitest-environment node
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {afterEach,expect,it} from 'vitest'
// Node-only tooling deliberately stays outside the application's TypeScript graph.
import {isDeploymentSource,prepareDeployment} from '../scripts/prepare-deploy-source.mjs'

const temporary:string[]=[]
afterEach(async()=>{for(const root of temporary.splice(0))await rm(root,{recursive:true,force:true})})
it('keeps production inputs while excluding raw art, review data and credentials',()=>{
 for(const file of ['src/main.tsx','src/features/exploration/assets/door.png','public/music/theme.mp3','build/image-cache.ts','scripts/build-app.mjs','supabase/catalog/catalog.json','supabase/voyage-bets/companies.json','supabase/functions/_shared/push-presentation.ts','tsconfig.app.json','.vercelignore'])expect(isDeploymentSource(file),file).toBe(true)
 for(const file of ['assets/source.png','artifacts/preview.png','tests/check.test.ts','.env','.env.storage.local','src/.env.local','../public/file','public/../../secret','C:/secret','public\\file','.git/config'])expect(isDeploymentSource(file),file).toBe(false)
})
it('copies exactly the selected bytes, leaves originals intact and refuses overwrites or outside targets',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'pongdang-deployment-'));temporary.push(root)
 execFileSync('git',['init','--quiet'],{cwd:root})
 for(const [file,text] of Object.entries({'src/main.tsx':'app','public/image.png':'same image bytes','package.json':'{}','assets/raw.png':'raw','.env.storage.local':'private'})){
  await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),text)
 }
 const preview=await prepareDeployment({root,dryRun:true})
 expect(preview.files).toBe(3)
 expect(preview.omittedBytes).toBe(10)
 const actual=await prepareDeployment({root})
 expect(actual).toEqual(preview)
 expect(await readFile(path.join(root,'.cache/deploy-source/public/image.png'),'utf8')).toBe('same image bytes')
 expect(await readFile(path.join(root,'assets/raw.png'),'utf8')).toBe('raw')
 await expect(readFile(path.join(root,'.cache/deploy-source/.env.storage.local'))).rejects.toThrow()
 await expect(prepareDeployment({root})).rejects.toThrow('not empty')
 await expect(prepareDeployment({root,out:'../outside',dryRun:true})).rejects.toThrow('inside the workspace')
})
it('keeps workflow checkout rules aligned, including the metadata required by SQL tests',async()=>{
 const rules=(await readFile('.github/ci-sparse-checkout','utf8')).split(/\r?\n/).filter(line=>line&&!line.startsWith('#'))
 for(const [file,extra] of [['client-data.yml',[]],['database.yml',['!/public/']]] as const){
  const workflow=await readFile(`.github/workflows/${file}`,'utf8')
  const block=workflow.match(/sparse-checkout: \|\r?\n((?:[ ]{12}[^\r\n]+\r?\n)+)/)?.[1]
  expect(block?.trim().split(/\r?\n/).map(x=>x.trim())).toEqual([...rules,...extra])
  expect(workflow).toContain('cancel-in-progress: true')
 }
})
