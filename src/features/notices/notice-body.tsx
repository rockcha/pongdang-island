import {Fragment} from 'react'
import type {NoticeView} from './api'
// A deliberately small text format; React escapes every fragment, never raw HTML.
function inline(text:string){return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g).map((part,i)=>{
 if(part.startsWith('**')&&part.endsWith('**'))return <strong key={i}>{part.slice(2,-2)}</strong>
 const link=part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/)
 return link?<a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{link[1]}</a>:<Fragment key={i}>{part}</Fragment>
})}
export function NoticeBody({notice}:{notice:NoticeView}){
 const inserted=new Set<string>()
 const lines=notice.body.split('\n').map((line,i)=>{
  const marker=line.match(/^!\[이미지\]\(([^)]+)\)$/),path=marker?.[1]
  if(path&&notice.images.includes(path)){inserted.add(path);return <NoticeImage key={i} path={path} notice={notice}/>}
  if(line.startsWith('## '))return <h3 key={i} className="pt-3 text-base font-semibold">{inline(line.slice(3))}</h3>
  if(line.startsWith('- '))return <p key={i} className="pl-3">• {inline(line.slice(2))}</p>
  return <p key={i} className="min-h-3 whitespace-pre-wrap break-words">{inline(line)}</p>
 })
 return <div className="min-w-0 max-w-full space-y-2 text-sm leading-7 [overflow-wrap:anywhere]">{lines}{notice.images.filter(path=>!inserted.has(path)).map(path=><NoticeImage key={path} path={path} notice={notice}/>)}</div>
}
function NoticeImage({path,notice}:{path:string;notice:NoticeView}){return notice.urls[path]?<figure className="!my-5 overflow-hidden rounded-xl border border-border/70 bg-secondary/25"><figcaption className="border-b border-border/50 px-3 py-2 text-[10px] leading-4 text-muted-foreground">첨부 이미지 {notice.images.indexOf(path)+1}</figcaption><a href={notice.urls[path]} target="_blank" rel="noopener noreferrer" className="block p-3"><img src={notice.urls[path]} alt={`${notice.title} 첨부 이미지 ${notice.images.indexOf(path)+1}`} loading="lazy" className="mx-auto h-auto max-h-[800px] max-w-full object-contain"/></a></figure>:<p className="text-xs text-muted-foreground">이미지를 불러오지 못했어요. 페이지를 새로고침해주세요.</p>}
