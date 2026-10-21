import {useNavigate,Navigate} from 'react-router'
import {useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {useOperator} from '@/features/notices/use-operator'
import {CatchReveal} from '@/features/fishing/catch-reveal'
import {practiceSpecies} from '@/features/fishing/fishing-practice'
import {Button} from '@/components/ui/button'
import {startShowcaseDraft} from './draft'

export function ShowcasePreview(){
 const {session}=useAuth(),{operator,loading}=useOperator(),navigate=useNavigate(),[rarity,setRarity]=useState<'epic'|'mythic'>('mythic'),[open,setOpen]=useState(false)
 if(loading)return <p role="status" className="p-8 text-center text-xs">확인하는 중…</p>
 if(!operator)return <Navigate to="/showcase" replace/>
 const species=practiceSpecies(rarity)
 return <section className="space-y-5 p-5"><h1 className="text-base">자랑하기 미리보기</h1><p className="text-sm leading-6 text-muted-foreground">미끼·보상 없이 포획 연출 → 정사각형 사진 → 캡션 → 이모지 반응까지 확인해요. 실제 게시물은 생성되지 않아요.</p><div className="grid grid-cols-2 gap-2">{(['epic','mythic'] as const).map(r=><Button key={r} variant={rarity===r?'default':'outline'} aria-pressed={rarity===r} onClick={()=>setRarity(r)}>{r==='epic'?'특급':'신화'}</Button>)}</div><Button className="h-12 w-full" onClick={()=>setOpen(true)}>포획 화면 테스트</Button>{open&&<CatchReveal species={species} firstDiscovery preview regionName="퐁당섬 앞바다" caughtAt={new Date().toISOString()} onDismiss={()=>setOpen(false)} onShare={()=>{const id=startShowcaseDraft({owner:session?.user.id??'',operationId:'preview',firstDiscovery:true,renderVersion:1,species,regionName:'퐁당섬 앞바다',caughtAt:new Date().toISOString(),preview:true});setOpen(false);navigate('/showcase/new',{state:{showcaseDraft:id}})}}/>}</section>
}
