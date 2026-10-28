import fs from 'node:fs'
import path from 'node:path'
const workspace=path.resolve('.'),root='assets/storage-upload/new/20261029-055051',moves={}
const bounded=p=>{const resolved=path.resolve(p);if(!resolved.startsWith(workspace+path.sep))throw Error('Outside workspace');return resolved}
function move(from,to){bounded(from);bounded(to);fs.mkdirSync(path.dirname(to),{recursive:true});fs.renameSync(from,to);moves[from.replaceAll('\\','/')]=to.replaceAll('\\','/')}
for(const name of fs.readdirSync(root+'/sources').filter(n=>n.endsWith('.png'))){
 const old=root+'/sources/'+name
 move(old,name.endsWith('-grid.png')?old.replace('.png','.source'):'artifacts/starruins-bluegold-guides/'+name)
}
if(fs.existsSync(root+'/review'))for(const name of fs.readdirSync(root+'/review'))move(root+'/review/'+name,'artifacts/starruins-bluegold-review/'+name)
function rewrite(value){
 if(typeof value==='string')return moves[value.replaceAll('\\','/')]??value
 if(Array.isArray(value))return value.map(rewrite)
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)]))
 return value
}
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.json'))){
 const file=root+'/'+name,original=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')),updated=rewrite(original)
 fs.writeFileSync(file,JSON.stringify(updated,null,2)+'\n')
}
console.log(JSON.stringify({archivedFiles:Object.keys(moves).length}))
