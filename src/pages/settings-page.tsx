import { useState } from 'react'
import {Fish,Hand,Volume2} from 'lucide-react'
import {readBiteConfirmation,saveBiteConfirmation} from '@/features/fishing/bite-confirmation-preference'
import {readFishingSound,saveFishingSound} from '@/features/fishing/sound-preference'

export function SettingsPage() {
  const [confirmBite,setConfirmBite]=useState(readBiteConfirmation)
  const [saveError, setSaveError] = useState(false)
  const [soundEnabled,setSoundEnabled]=useState(readFishingSound)
  const [soundSaveError,setSoundSaveError]=useState(false)
  return <section className="mx-auto w-full max-w-xl space-y-7 px-1 py-6">
    <h1 className="text-xl font-medium">설정</h1>
    <section aria-labelledby="fishing-settings-title" className="overflow-hidden rounded-2xl border border-border/60 bg-card/70">
      <h2 id="fishing-settings-title" className="flex items-center gap-2 border-b border-border/50 px-5 py-4 text-xs font-medium text-muted-foreground"><Fish aria-hidden="true" className="size-4"/>낚시</h2>
      <div className="flex items-center justify-between gap-5 px-5 py-5">
        <div className="min-w-0"><label id="bite-confirm-label" htmlFor="bite-confirm" className="text-sm font-medium">입질 확인 후 시작</label><p id="bite-confirm-description" className="mt-2 text-xs leading-6 text-muted-foreground">입질이 오면 잠깐 멈춰요.<br/>화면을 터치하면 게이지 조작과 제한시간이 시작돼요.<br/>확인 대기는 최대 하루 동안 유지돼요.</p></div>
        <button id="bite-confirm" type="button" role="switch" aria-checked={confirmBite} aria-labelledby="bite-confirm-label" aria-describedby="bite-confirm-description" onClick={() => {const next=!confirmBite;setConfirmBite(next);setSaveError(!saveBiteConfirmation(next))}} className="flex min-h-11 min-w-14 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={'flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors ' + (confirmBite ? 'border-primary bg-primary' : 'border-input bg-secondary')}><span className={'size-5 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none ' + (confirmBite ? 'translate-x-5' : 'translate-x-0')} /></span>
        </button>
      </div>
      <p className="flex items-center gap-2 border-t border-border/40 bg-secondary/20 px-5 py-3 text-[11px] leading-5 text-muted-foreground"><Hand aria-hidden="true" className="size-3.5 shrink-0"/>설정은 이 브라우저에 저장되며 다음 낚시부터 적용돼요.</p>
      {saveError&&<p role="alert" className="px-5 pb-4 text-xs leading-5 text-destructive">설정은 적용했지만 저장하지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.</p>}
    </section>
    <section aria-labelledby="sound-settings-title" className="overflow-hidden rounded-2xl border border-border/60 bg-card/70">
      <h2 id="sound-settings-title" className="flex items-center gap-2 border-b border-border/50 px-5 py-4 text-xs font-medium text-muted-foreground"><Volume2 aria-hidden="true" className="size-4"/>사운드</h2>
      <div className="flex items-center justify-between gap-5 px-5 py-5">
        <div className="min-w-0"><label id="fishing-sound-label" htmlFor="fishing-sound" className="text-sm font-medium">효과음·환경음</label><p id="fishing-sound-description" className="mt-2 text-xs leading-6 text-muted-foreground">낚시·구매 효과음과 아쿠아리움 환경음을 켜고 꺼요.</p></div>
        <button id="fishing-sound" type="button" role="switch" aria-checked={soundEnabled} aria-labelledby="fishing-sound-label" aria-describedby="fishing-sound-description" onClick={()=>{const next=!soundEnabled;setSoundEnabled(next);setSoundSaveError(!saveFishingSound(next))}} className="flex min-h-11 min-w-14 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={'flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors '+(soundEnabled?'border-primary bg-primary':'border-input bg-secondary')}><span className={'size-5 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none '+(soundEnabled?'translate-x-5':'translate-x-0')}/></span>
        </button>
      </div>
      <p className="border-t border-border/40 bg-secondary/20 px-5 py-3 text-[11px] leading-5 text-muted-foreground">설정은 바로 적용되며 이 브라우저에 저장돼요.</p>
      {soundSaveError&&<p role="alert" className="px-5 pb-4 text-xs leading-5 text-destructive">설정은 적용했지만 저장하지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.</p>}
    </section>
  </section>
}
