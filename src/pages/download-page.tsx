import {useEffect,useState} from 'react'
import {Check,Share,Smartphone} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {Button} from '@/components/ui/button'
import {initializePwaInstall,installPwa,usePwaInstall} from '@/features/pwa/install'

export function DownloadPage(){
 const {available,installed,busy,error}=usePwaInstall()
 const [device,setDevice]=useState<'iphone'|'galaxy'>(()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'iphone':'galaxy')
 useEffect(initializePwaInstall,[])
 return <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
  <header className="mb-7 flex items-center gap-4"><img src="/pwa-192x192.png" alt="퐁당섬 앱 아이콘" className="size-20 rounded-2xl"/><div><h1 className="text-xl">퐁당섬 다운로드</h1><p className="mt-2 text-xs leading-5 text-muted-foreground">홈 화면에 설치하고 앱처럼 바로 시작해요.</p></div></header>
  {installed?<div role="status" className="mb-6 flex items-center gap-2 rounded-xl bg-secondary p-4 text-sm text-primary"><Check className="size-5"/>퐁당섬 앱으로 이용할 준비가 되었어요.</div>:<>
   <div role="group" aria-label="설치할 기기" className="mb-5 grid grid-cols-2 gap-2">{(['iphone','galaxy'] as const).map(key=><Button key={key} variant={device===key?'secondary':'ghost'} aria-pressed={device===key} onClick={()=>setDevice(key)} className="min-h-11"><Smartphone className="size-4"/>{key==='iphone'?'아이폰':'갤럭시'}</Button>)}</div>
   {device==='iphone'?<InstallSteps title="Safari에서 설치하기" steps={['Safari에서 퐁당섬을 열어주세요.','공유 버튼을 누르고 ‘홈 화면에 추가’를 선택해주세요.','‘웹 앱으로 열기’가 보이면 켜고, ‘추가’를 눌러주세요.']}/>:<>
    <Button className="mb-5 min-h-12 w-full rounded-xl" disabled={!available||busy} onClick={()=>void installPwa()}><appArt.download className="size-7"/>{busy?'설치 창 여는 중…':'퐁당섬 설치하기'}</Button>
    <InstallSteps title="Chrome 메뉴에서 직접 설치하기" steps={['최신 버전의 Chrome에서 퐁당섬을 열어주세요.','오른쪽 위 ⋮ 메뉴에서 ‘홈 화면에 추가’ → ‘설치’를 선택해주세요. 메뉴 이름은 브라우저 버전에 따라 다를 수 있어요.','설치가 끝나면 홈 화면의 퐁당섬 아이콘으로 실행해주세요. 주소창 없이 열리면 앱으로 실행된 거예요.']}/>
    <details className="mt-4 rounded-xl border px-4 py-3 text-xs leading-6"><summary className="cursor-pointer text-primary">삼성 인터넷을 사용 중이거나 설치가 차단되나요?</summary><p className="mt-2 text-muted-foreground">삼성 인터넷은 메뉴 → ‘현재 페이지 추가’에서 설치 항목을 확인할 수 있어요. Play 프로텍트가 ‘이전 Android 버전용 앱’이라며 차단하면 설치를 취소하고, 최신 Chrome에서 다시 시도해주세요. 보안 기능을 끄거나 ‘무시하고 설치하기’를 선택할 필요는 없어요.</p></details>
   </>}
   {error&&<p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
   <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground"><Share className="mt-1 size-4 shrink-0"/>카카오톡·인스타그램 안에서 열었다면 Safari나 Chrome 등 기본 브라우저로 열어주세요.</p>
  </>}
  <p className="mt-7 border-t pt-4 text-xs leading-6 text-muted-foreground">설치 후에는 브라우저가 아닌 홈 화면의 퐁당섬 아이콘을 눌러주세요. 낚시와 거래 등 게임 이용에는 인터넷 연결이 필요해요.</p>
 </section>
}
function InstallSteps({title,steps}:{title:string;steps:string[]}){return <div className="rounded-2xl border bg-secondary/20 p-4"><h2 className="mb-4 text-sm font-medium">{title}</h2><ol className="space-y-4">{steps.map((step,index)=><li key={step} className="flex gap-3 text-xs leading-6"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] text-primary">{index+1}</span><span>{step}</span></li>)}</ol></div>}
