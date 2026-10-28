import {execFileSync} from 'node:child_process'
const repository='rockcha/pongdang-island'
const remote=execFileSync('git',['remote','get-url','origin'],{encoding:'utf8'}).trim()
if(remote!==`https://github.com/${repository}.git`)throw Error('Unexpected Git remote')
let token
try{
 const output=execFileSync('git',['-c','credential.interactive=never','credential','fill'],{input:`protocol=https\nhost=github.com\npath=${repository}.git\n\n`,encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'},stdio:['pipe','pipe','pipe']})
 token=output.split('\n').find(line=>line.startsWith('password='))?.slice(9)
}catch{}
async function get(path){
 const r=await fetch('https://api.github.com/repos/'+repository+path,{headers:{Accept:'application/vnd.github+json',...(token?{Authorization:`Bearer ${token}`}:{})}})
 if(!r.ok)throw Error('GitHub read-only deployment lookup returned HTTP '+r.status)
 return r.json()
}
const ref=process.argv[2]??'main'
const [status,runs,deployments]=await Promise.all([get(`/commits/${encodeURIComponent(ref)}/status`),get(`/commits/${encodeURIComponent(ref)}/check-runs`),get('/deployments?per_page=5')])
const results=[]
for(const d of deployments){const states=await get(`/deployments/${d.id}/statuses?per_page=1`);results.push({ref:d.ref,sha:d.sha,environment:d.environment,status:states[0]?.state,url:states[0]?.environment_url})}
console.log(JSON.stringify({ref,state:status.state,statuses:status.statuses.map(s=>({context:s.context,state:s.state,url:s.target_url})),checks:runs.check_runs.map(r=>({name:r.name,status:r.status,conclusion:r.conclusion,url:r.details_url})),deployments:results},null,2))
