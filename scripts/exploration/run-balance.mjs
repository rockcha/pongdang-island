import {spawnSync} from 'node:child_process'
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/exploration-campaign-simulation.test.ts','--maxWorkers=1'],{stdio:'inherit',env:{...process.env,EXPLORATION_BALANCE_AUDIT:'1',EXPLORATION_BALANCE_RUNS:process.env.EXPLORATION_BALANCE_RUNS??'10000'}})
process.exit(result.status??1)
