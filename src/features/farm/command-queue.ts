import type {FarmCommand} from './account-engine'

type Entry<T>={command:FarmCommand;resolve:(result:T|null)=>void;promise:Promise<T|null>}
const commands=(command:FarmCommand)=>command.type==='batch'?command.commands:[command]
function batchKind(command:FarmCommand){
 const items=commands(command)
 if(!items.length)return null
 const first=items[0]
 if(first.type!=='simulate'||!['plant','beginHarvest'].includes(first.action.type))return null
 const key=JSON.stringify(first.action)
 return items.every(item=>item.type==='simulate'&&JSON.stringify(item.action)===key)?key:null
}

/** Only waiting intentions are grouped. A sent operation is never changed or retried here. */
export class FarmCommandQueue<T>{
 private waiting:Entry<T>[]=[]
 private active:Entry<T>[]=[]
 private running=false
 private scheduled=false
 private send:(command:FarmCommand)=>Promise<T|null>
 private valid:()=>boolean
 constructor(send:(command:FarmCommand)=>Promise<T|null>,valid:()=>boolean){this.send=send;this.valid=valid}

 enqueue(command:FarmCommand):Promise<T|null>{
  if(!this.valid())return Promise.resolve(null)
  const key=JSON.stringify(command),duplicate=[...this.active,...this.waiting].find(entry=>JSON.stringify(entry.command)===key)
  if(duplicate)return duplicate.promise
  let resolve!:(result:T|null)=>void
  const promise=new Promise<T|null>(done=>{resolve=done})
  this.waiting.push({command,resolve,promise})
  if(!this.running&&!this.scheduled){
   // Let adjacent planting/harvest gestures share a request without a perceptible delay.
   if(batchKind(command)){this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;void this.drain()})}
   else void this.drain()
  }
  return promise
 }

 cancel(){for(const entry of this.waiting)entry.resolve(null);this.waiting=[]}

 private async drain(){
  if(this.running)return
  this.running=true
  try{
   while(this.waiting.length){
    if(!this.valid()){this.cancel();break}
    const entries=[this.waiting.shift()!],kind=batchKind(entries[0].command)
    let size=commands(entries[0].command).length
    while(kind&&this.waiting.length&&batchKind(this.waiting[0].command)===kind&&size+commands(this.waiting[0].command).length<=100){
     const next=this.waiting.shift()!;entries.push(next);size+=commands(next.command).length
    }
    this.active=entries
    const command=entries.length===1?entries[0].command:{type:'batch' as const,commands:entries.flatMap(entry=>commands(entry.command))}
    let result:T|null=null
    try{result=await this.send(command)}catch{/* The owner reports failures and retains uncertain operations. */}
    if(!this.valid())result=null
    for(const entry of entries)entry.resolve(result)
    this.active=[]
    // A rejected or uncertain write cancels dependent intentions; never replay them automatically.
    if(result===null){this.cancel();break}
   }
  }finally{this.active=[];this.running=false}
 }
}
