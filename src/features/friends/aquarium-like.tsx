import {useEffect,useRef,useState} from 'react'
import {Heart} from 'lucide-react'
import {createClient} from '@/lib/client'
import {Button} from '@/components/ui/button'
export function AquariumLike({owner}:{owner:string}){
 const [value,setValue]=useState<{count:number;liked:boolean}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0)
 const lock=useRef(false),generation=useRef(0)
 useEffect(()=>{const version=++generation.current;setValue(null);setError('');void (async()=>{try{const {data,error}=await createClient().rpc('aquarium_like_state',{p_owner:owner});if(error)throw error;if(version===generation.current)setValue(data)}catch{if(version===generation.current)setError('좋아요를 불러오지 못했어요.')}})();return()=>{generation.current++}},[owner,retry])
 async function act(){if(!value||lock.current)return;lock.current=true;setBusy(true);setError('');const version=generation.current;try{const {data,error}=await createClient().rpc('set_aquarium_like',{p_owner:owner,p_liked:!value.liked});if(error)throw error;if(version===generation.current)setValue(data)}catch{if(version===generation.current)setError('좋아요를 저장하지 못했어요. 다시 눌러 주세요.')}finally{lock.current=false;setBusy(false)}}
 return <div className="ml-auto flex items-center"><Button variant="ghost" size="sm" className="gap-1 px-2 text-xs" disabled={busy||(!value&&!error)} aria-label={error&&!value?'좋아요 다시 불러오기':'아쿠아리움 좋아요'} aria-pressed={value?.liked??false} onClick={()=>value?void act():setRetry(n=>n+1)}><Heart className={`size-4 ${value?.liked?'fill-rose-400 text-rose-500':''}`}/>{value?.count??'…'}</Button>{error&&<span role="alert" className="max-w-28 text-[10px] text-destructive">{error}</span>}</div>
}
