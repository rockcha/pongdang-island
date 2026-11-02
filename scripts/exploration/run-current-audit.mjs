import {spawnSync} from 'node:child_process'
const count=process.env.CURRENT_CAMPAIGN_RUNS??'5000',duels=process.env.CURRENT_DUEL_RUNS??'1000'
const common={...process.env,EXPLORATION_SERVER_AUDIT:'1',SERVER_AUDIT_RUNS:count,SERVER_AUDIT_THIEF:'0',SERVER_AUDIT_VARIANTS:'0'}
for(const [name,file,env]of [
 ['campaigns','tests/exploration-server-audit.test.ts',common],
 ['thief choices','tests/exploration-server-audit.test.ts',{...common,SERVER_AUDIT_THIEF:'1'}],
 ['resource decisions','tests/exploration-server-audit.test.ts',{...common,SERVER_AUDIT_VARIANTS:'1'}],
 ['late-game duels','tests/exploration-current-duels.test.ts',{...common,EXPLORATION_CURRENT_DUELS:'1',CURRENT_DUEL_RUNS:duels}],
]){
 console.log('Simulating '+name)
 const run=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',file,'--configLoader','native','--pool','threads','--maxWorkers','1','--testTimeout','600000'],{stdio:'inherit',env,windowsHide:true})
 if(run.status!==0)process.exit(run.status??1)
}
