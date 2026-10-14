import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RarityBadge } from '@/components/rarity-badge'
import { GoldIcon } from '@/features/gold/gold-provider'
import { CollectibleThumbnail } from './collectible-thumbnail'
import { kindLabels, loadCollection } from './api'
import type { CatalogEntry, CollectibleKind, CollectionState } from './api'
export function CollectionPage(){const {session}=useAuth();return <CollectionBook key={session?.user.id}/>}
function CollectionBook(){
 const [state,setState]=useState<CollectionState|null>(null)
 const [error,setError]=useState('')
 const [tab,setTab]=useState<'all'|CollectibleKind>('all')
 const [detail,setDetail]=useState<CatalogEntry|null>(null)
 const [attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true;loadCollection().then(data=>{if(active){setState(data);setError('')}}).catch(()=>{if(active)setError('도감을 불러오지 못했어요. 15·16 SQL과 연결을 확인해주세요.')});return()=>{active=false}},[attempt])
 const entries=state?.catalog.filter(s=>tab==='all'||s.kind===tab)??[]
 return <section className="space-y-5 py-6"><header><h1 className="text-2xl font-bold">바다 도감</h1><p className="mt-2 text-sm text-muted-foreground">우리가 만난 작은 바다의 친구들과 물건들.</p></header>{state&&<p className="text-xs text-muted-foreground">발견 {state.catalog.filter(s=>s.discovered).length} / {state.catalog.length} · 보유 {state.items.length}개</p>}<div role="group" aria-label="도감 분류" className="grid grid-cols-3 gap-2">{(['all','fish','trash','structure','map'] as const).map(value=><Button key={value} className="min-h-11 flex-1" variant={tab===value?'default':'outline'} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value==='all'?'전체':kindLabels[value]}</Button>)}</div>{error&&<div role="alert"><p>{error}</p><Button onClick={()=>setAttempt(v=>v+1)}>다시 불러오기</Button></div>}{!state&&!error&&<p role="status">도감을 펼치는 중…</p>}<ul className="grid grid-cols-2 gap-3">{entries.map(s=><li key={s.id}><button onClick={()=>setDetail(s)} className="flex w-full flex-col items-center gap-2 rounded-xl border p-4 text-center hover:bg-muted/30"><div className={s.discovered?'':'grayscale opacity-50'}><CollectibleThumbnail path={s.thumbnail_path} name={s.name} className="size-24"/></div><span className="text-sm font-semibold">{s.name}</span>{s.rarity?<RarityBadge rarity={s.rarity}/>:<span className="text-xs text-muted-foreground">{kindLabels[s.kind]}</span>}<span className="text-xs text-muted-foreground">{s.discovered?'발견 완료':'미발견'} · 보유 {state?.items.filter(i=>i.species_id===s.id).length??0}</span></button></li>)}</ul><Link to="/aquarium" className="block py-3 text-center text-sm text-primary underline">내 어항 보기</Link><Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="max-h-[85dvh] overflow-y-auto">{detail&&<><DialogHeader><DialogTitle>{detail.name}</DialogTitle><DialogDescription>{kindLabels[detail.kind]} · {detail.discovered?'발견 완료':'아직 만나지 못했어요'}</DialogDescription></DialogHeader><CollectibleThumbnail key={detail.id} path={detail.thumbnail_path} name={detail.name} className="mx-auto size-36"/><p className="text-sm leading-6 text-muted-foreground">{detail.description}</p>{detail.rarity&&<div><RarityBadge rarity={detail.rarity}/></div>}<dl className="space-y-2 text-xs"><div>서식 지역: {detail.habitats.map(r=>r.name).join(', ')}</div><div>크기: {detail.size}px</div>{detail.kind==='fish'||detail.kind==='trash'?<><div>swimY: {Number(detail.swim_y_min)*100}% ~ {Number(detail.swim_y_max)*100}%</div><div>속도: 어항 너비의 {Number(detail.speed)*100}%/초</div></>:<div>{detail.kind==='map'?'아직 열리지 않은 일반 지역의 항로를 열어줘요.':'고정 배치 · 위치 지정은 준비 중'}</div>}<div className="flex items-center gap-1">판매가격 <GoldIcon className="size-4"/>{detail.sell_price}</div></dl></>}</DialogContent></Dialog></section>
}
