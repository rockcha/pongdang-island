import {spawnSync} from 'node:child_process'
const env={...process.env,EXPLORATION_DEEP_AUDIT:'1',DEEP_AUDIT_RUNS:process.env.DEEP_AUDIT_RUNS??'100000',DEEP_AUDIT_SENSITIVITY:process.env.DEEP_AUDIT_SENSITIVITY??'30000',DEEP_AUDIT_DUELS:process.env.DEEP_AUDIT_DUELS??'2000'}
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/exploration-blind-audit.test.ts','tests/exploration-deep-audit.test.ts','tests/exploration-resource-audit.test.ts','tests/exploration-prudent-audit.test.ts','--maxWorkers=1'],{stdio:'inherit',env})
if(result.status!==0)process.exit(result.status??1)
const render=spawnSync(process.execPath,['scripts/exploration/render-deep-audit.mjs'],{stdio:'inherit'})
process.exit(render.status??1)
