// @vitest-environment node
import {expect,it} from 'vitest'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'

it.skipIf(process.platform!=='win32')('rejects the transparent Grimhowl patch instead of reporting a huge finite error and zero shifts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'sprite-anchor-'))
 try{
  const config=join(dir,'config.json'),output=join(dir,'result.json')
  writeFileSync(config,JSON.stringify([{file:'assets/storage-upload/new/20261023-050755/fish/epic/shared-grimhowl-giant-wolf-eel_v1_sprite.png',storage_path:'grimhowl',patch:[364,270,56,56]}]))
  const result=spawnSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/register-sprite-anchors.ps1','-Config',config,'-Output',output],{encoding:'utf8',timeout:30000})
  expect(result.status).not.toBe(0)
  expect(result.stdout+result.stderr).toContain('insufficient opaque artwork')
 }finally{rmSync(dir,{recursive:true,force:true})}
},35000)
