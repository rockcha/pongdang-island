import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {ThumbsDown,ThumbsUp} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {useAuth} from '@/components/auth-provider'
import {createClient} from '@/lib/client'

export type FeedbackKind='suggestion'|'bug'
export type FeedbackReaction={id:string;likes:number;dislikes:number;my_reaction:number}
const FeedbackContext=createContext<{kind:FeedbackKind;values:Record<string,FeedbackReaction>;update:(value:FeedbackReaction)=>void}|null>(null)

export function FeedbackReactions({kind,ids,children}:{kind:FeedbackKind;ids:string[];children:ReactNode}){
 const {session}=useAuth()
 return <ReactionProvider key={`${session?.user.id}:${kind}:${ids.join(',')}`} kind={kind} ids={ids}>{children}</ReactionProvider>
}
function ReactionProvider({kind,ids,children}:{kind:FeedbackKind;ids:string[];children:ReactNode}){
 const [values,setValues]=useState<Record<string,FeedbackReaction>>({}),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0)
 const idKey=ids.join(',')
 useEffect(()=>{
  let active=true
  setFailed(false)
  const postIds=idKey? idKey.split(','):[]
  if(postIds.length)void Promise.resolve().then(()=>createClient().rpc('feedback_reactions',{p_kind:kind,p_ids:postIds})).then(({data,error})=>{
   if(!active)return
   if(error){setFailed(true);return}
   setValues(Object.fromEntries((data??[]).map(value=>[value.id,value])))
  }).catch(()=>{if(active)setFailed(true)})
  return()=>{active=false}
 },[kind,idKey,retry])
 return <FeedbackContext value={{kind,values,update:value=>setValues(previous=>({...previous,[value.id]:value}))}}>
  {failed&&<div role="alert" className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><span>추천 정보를 불러오지 못했어요.</span><Button variant="ghost" className="min-h-11 text-xs" onClick={()=>setRetry(n=>n+1)}>다시 시도</Button></div>}
  {children}
 </FeedbackContext>
}
export function FeedbackVoteButtons({id}:{id:string}){
 const context=useContext(FeedbackContext),lock=useRef(false)
 const [busy,setBusy]=useState(false),[error,setError]=useState(false)
 const value=context?.values[id]
 async function vote(next:number){
  if(!context||!value||lock.current)return
  lock.current=true;setBusy(true);setError(false)
  try{
   const {data,error}=await createClient().rpc('set_feedback_reaction',{p_kind:context.kind,p_id:id,p_value:value.my_reaction===next?0:next})
   if(error||!data)throw error??new Error('Missing reaction')
   context.update(data)
  }catch{setError(true)}finally{lock.current=false;setBusy(false)}
 }
 return <div className="py-1">
  <div role="group" aria-label="추천과 비추천" className="flex items-center gap-1">
   {([{n:1,label:'추천',Icon:ThumbsUp,count:value?.likes},{n:-1,label:'비추천',Icon:ThumbsDown,count:value?.dislikes}]).map(({n,label,Icon,count})=><Button key={n} variant="ghost" disabled={busy||!value} aria-label={label} aria-pressed={value?.my_reaction===n} onClick={()=>void vote(n)} className={`min-h-11 gap-1.5 rounded-lg px-3 text-xs ${value?.my_reaction===n?'bg-primary/10 text-primary':'text-muted-foreground'}`}><Icon aria-hidden="true" className="size-3.5"/>{label}<span className="tabular-nums">{count??'–'}</span></Button>)}
  </div>
  {error&&<p role="alert" className="px-3 text-xs text-destructive">반영하지 못했어요. 다시 눌러주세요.</p>}
 </div>
}
