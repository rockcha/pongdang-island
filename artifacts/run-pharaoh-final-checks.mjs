import fs from 'node:fs'
import {spawnSync} from 'node:child_process'
import {dirname,join} from 'node:path'
for(const [label,args] of [
 ['client-data',['scripts/check-client-data.mjs']],
 ['asset-tests',['node_modules/vitest/vitest.mjs','run','tests/pharaoh-assets.test.ts','tests/map-piece-progress.test.tsx','tests/new-pongdang-species.test.tsx','--maxWorkers=1']],
 ['db-verify',['scripts/db/verify.mjs']],
 ['db-context',['scripts/db/context.mjs','check']],
]){
 const fd=fs.openSync('.cache/pharaoh-final-'+label+'.log','w'),r=spawnSync(process.execPath,args,{stdio:['ignore',fd,fd]});fs.closeSync(fd)
 console.log(label+': '+r.status);if(r.status!==0)process.exit(1)
}
const fd=fs.openSync('.cache/pharaoh-verified-build.log','w'),r=spawnSync(process.execPath,[join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),'run','build'],{stdio:['ignore',fd,fd]});fs.closeSync(fd);console.log('build: '+r.status);if(r.status!==0)process.exit(1)
