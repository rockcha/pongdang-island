import {useEffect,useRef,useState} from 'react'
import {Send,Trash2} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {fundError} from './api'
import type {FundCheers} from './api'
import type {FundService} from './fund-page'

export function FundCheerWall({initial,service,onChanged}:{initial:FundCheers;service:FundService;onChanged:()=>Promise<void>}){
 const [page,setPage]=useState(initial),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const pending=useRef<{id:string;body:string}|null>(null),alive=useRef(true),version=useRef(0),working=useRef(false)
 useEffect(()=>{setPage(initial);version.current++},[initial])
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;version.current++}},[])
 async function send(){if(working.current||!body.trim())return;working.current=true;setBusy(true);setError('')
  pending.current??={id:crypto.randomUUID(),body:body.trim()}
  try{await service.writeCheer(pending.current.id,pending.current.body);pending.current=null;if(alive.current){setBody('');await onChanged()}}
  catch(e){if(alive.current){const message=String((e as {message?:string})?.message);setError(message.includes('FUND_CHEER_LIMIT')?'잠시 뒤 다시 남겨주세요. 응원은 30초에 한 번, 하루 30번까지 남길 수 있어요.':message.includes('INVALID_FUND_CHEER')?'응원은 1~100자로 적어주세요.':fundError(e));if(/FUND_CHEER_LIMIT|INVALID_|AUTH_REQUIRED/.test(message))pending.current=null}}
  finally{working.current=false;if(alive.current)setBusy(false)}
 }
 async function remove(id:string){if(working.current)return;working.current=true;setBusy(true);setError('');try{await service.writeCheer(id,null,true);if(alive.current)await onChanged()}catch(e){if(alive.current)setError(fundError(e))}finally{working.current=false;if(alive.current)setBusy(false)}}
 async function more(){if(working.current)return;working.current=true;setBusy(true);const v=version.current;try{const next=await service.loadCheers(page.items.length);if(alive.current&&v===version.current)setPage(p=>({...next,items:[...p.items,...next.items]}))}catch(e){if(alive.current)setError(fundError(e))}finally{working.current=false;if(alive.current)setBusy(false)}}
 return <section aria-label="응원의 한마디">
  <p className="mb-4 text-[11px] leading-6 text-muted-foreground">응원의 한마디가 큰 힘이 됩니다.</p>
  <form onSubmit={e=>{e.preventDefault();void send()}} className="overflow-hidden rounded-xl border border-primary/15 bg-background">
   <textarea aria-label="응원 메시지" placeholder="퐁당섬에 전하고 싶은 마음…" maxLength={100} rows={2} value={body} disabled={busy||!!pending.current} onChange={e=>setBody(e.target.value)} className="block w-full resize-none bg-transparent px-3 pt-3 text-xs leading-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"/>
   <div className="flex items-center justify-between px-3 pb-2"><span className="text-[10px] tabular-nums text-muted-foreground">{body.length}/100</span><Button size="sm" variant="ghost" type="submit" disabled={busy||!body.trim()} className="gap-1 text-xs text-primary"><Send className="size-3"/>{pending.current?'다시 확인':'남기기'}</Button></div>
  </form>
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  <div className="mt-1 divide-y divide-border/40">{page.items.map(c=><article key={c.id} className="flex gap-2.5 py-3.5"><PlayerAvatar nickname={c.nickname} path={c.avatarPath} className="mt-0.5 size-8 shrink-0"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-[11px] font-medium">{c.nickname}</p><time dateTime={c.createdAt} className="text-[10px] text-muted-foreground">{new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'}).format(new Date(c.createdAt))}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{c.body}</p></div>{c.canDelete&&<Button size="icon" variant="ghost" aria-label={c.nickname+' 응원 삭제'} title="내 글 삭제 · 운영자는 숨김" disabled={busy} onClick={()=>void remove(c.id)} className="size-7 shrink-0 text-muted-foreground"><Trash2 className="size-3"/></Button>}</article>)}</div>
  {!page.items.length&&<p className="py-5 text-center text-[11px] text-muted-foreground">첫 응원을 남겨주세요.</p>}
  {page.hasMore&&<Button variant="ghost" size="sm" disabled={busy} onClick={()=>void more()} className="w-full text-xs">응원 더 보기</Button>}
 </section>
}
