import {useEffect,useState} from 'react'
import {Link} from 'react-router'
import {Button} from '@/components/ui/button'
import {loadRegionMap,setMapPieceTestCount,type Region,type RegionMap} from './api'
import {rememberRegion} from './remembered-region'

export function MapPieceTestControls({userId}:{userId:string}){
 const [map,setMap]=useState<RegionMap|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{
  let active=true
  setError('')
  void loadRegionMap().then(data=>{if(active)setMap(data)}).catch(()=>{if(active)setError('지도 상태를 불러오지 못했어요.')})
  return()=>{active=false}
 },[userId,retry])
 return <section aria-label="지도 조각 테스트" className="space-y-3 border-b px-4 py-4">
  <h2 className="text-sm font-medium">지도 조각 테스트</h2>
  <p className="text-xs leading-5 text-muted-foreground">입력한 개수만큼 앞 조각부터 수집한 상태로 바꿔요. 모두 모으면 해금되고, 개수를 줄이면 다시 잠겨요.</p>
  {error?<div role="alert" className="space-y-2 text-xs"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</Button></div>:!map?<p role="status" className="text-xs">지도 상태를 불러오는 중…</p>:map.regions.filter(r=>r.mapPieceCount).map(region=><MapPieceTestRow key={region.id} region={region} onSaved={next=>{setMap(next);rememberRegion(region.id,userId)}}/>)}
  <Link to="/harbor" className="inline-flex min-h-11 items-center text-xs text-primary underline underline-offset-4">지도에서 확인하기</Link>
 </section>
}

function MapPieceTestRow({region,onSaved}:{region:Region;onSaved:(map:RegionMap)=>void}){
 const [count,setCount]=useState(String(region.mapPieces?.length??0)),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const total=region.mapPieceCount??0,value=Number(count),valid=count.trim()!==''&&Number.isInteger(value)&&value>=0&&value<=total
 return <form className="space-y-2" onSubmit={async event=>{
  event.preventDefault();if(busy||!valid)return
  setBusy(true);setMessage('');setError('')
  try{const next=await setMapPieceTestCount(region.id,value);onSaved(next);setMessage(`${value}/${total}개로 적용했어요.`)}
  catch{setError('적용하지 못했어요. 다시 시도해 주세요.')}
  finally{setBusy(false)}
 }}>
  <label htmlFor={'map-piece-count-'+region.id} className="block text-xs">{region.name} · {region.mapPieces?.length??0}/{total}개 · {region.unlocked?'해금':'잠김'}</label>
  <div className="flex items-center gap-2"><input id={'map-piece-count-'+region.id} type="number" min={0} max={total} step={1} required value={count} disabled={busy} onChange={e=>setCount(e.target.value)} className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"/><span className="text-xs">/ {total}개</span><Button type="submit" disabled={busy||!valid}>{busy?'적용 중…':'적용'}</Button></div>
  {message&&<p role="status" className="text-xs text-muted-foreground">{message}</p>}
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
 </form>
}
