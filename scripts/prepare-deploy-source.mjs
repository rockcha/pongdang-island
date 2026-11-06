import {execFileSync} from 'node:child_process'
import {copyFile,lstat,mkdir,readdir,realpath,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

// Only the production build inputs. Raw artwork and its review history stay in Git.
const roots=['src/','build/','public/','scripts/']
const exact=new Set(['package.json','package-lock.json','index.html','vite.config.ts','vercel.json','.vercelignore',
 'supabase/catalog/catalog.json','supabase/voyage-bets/companies.json','supabase/functions/_shared/push-presentation.ts','supabase/functions/_shared/farm-engine.js'])
export function isDeploymentSource(file){
 if(file.includes('\\')||file.split('/').some(part=>part==='..'||part.startsWith('.env'))||path.posix.isAbsolute(file)||file.includes(':'))return false
 return exact.has(file)||/^tsconfig(?:\.[a-z-]+)?\.json$/.test(file)||roots.some(root=>file.startsWith(root))
}
export async function prepareDeployment({root=process.cwd(),out='.cache/deploy-source',dryRun=false}={}){
 root=await realpath(root)
 const target=path.resolve(root,out),allowed=path.join(root,'.cache')+path.sep
 if(!target.startsWith(allowed))throw Error('Deployment staging must be inside the workspace .cache directory')
 const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,maxBuffer:20_000_000}).toString().split('\0').filter(Boolean)
 const files=[...new Set(paths)].filter(isDeploymentSource).sort()
 let bytes=0,totalBytes=0
 for(const file of paths){
  const info=await lstat(path.join(root,file));if(info.isFile())totalBytes+=info.size
 }
 for(const file of files){
  const local=path.join(root,file),info=await lstat(local)
  if(!info.isFile()||info.isSymbolicLink())throw Error(`Not a regular deployment file: ${file}`)
  if(!(await realpath(local)).startsWith(root+path.sep))throw Error(`Deployment file leaves workspace: ${file}`)
  bytes+=info.size
 }
 const result={files:files.length,bytes,omittedBytes:totalBytes-bytes,output:path.relative(root,target).split(path.sep).join('/')}
 if(dryRun)return result
 // Do not recursively overwrite a previous staging folder or follow a .cache junction.
 await mkdir(path.join(root,'.cache'),{recursive:true})
 if(await realpath(path.join(root,'.cache'))!==path.join(root,'.cache'))throw Error('Deployment .cache must not be a symbolic link')
 try{await mkdir(target,{recursive:true});if((await readdir(target)).length)throw Error('Staging directory is not empty; choose a new --out directory')}
 catch(error){throw error}
 if(await realpath(target)!==target)throw Error('Deployment target must not be a symbolic link')
 for(const file of files){const dest=path.join(target,file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,file),dest)}
 await writeFile(path.join(target,'deployment-source.json'),JSON.stringify(result,null,2)+'\n')
 return result
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),options={}
 for(let i=0;i<args.length;i++){
  if(args[i]==='--dry-run')options.dryRun=true
  else if(args[i]==='--out'&&args[i+1]&&!args[i+1].startsWith('--'))options.out=args[++i]
  else throw Error('Usage: npm run deploy:prepare -- [--dry-run] [--out .cache/<name>]')
 }
 console.log(JSON.stringify(await prepareDeployment(options),null,2))
}
