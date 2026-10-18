import { useState } from 'react'
import { Link } from 'react-router'
import { useAppTheme } from '@/components/theme-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
  const { theme, setTheme } = useAppTheme()
  const [saveError, setSaveError] = useState(false)
  const dark = theme === 'dark'
  return <section className="space-y-6 py-6">
    <div><Link to="/profile" className="text-sm text-muted-foreground underline underline-offset-4">마이페이지</Link><h1 className="mt-3 text-2xl font-bold">설정</h1></div>
    <Card><CardHeader><CardTitle>화면 설정</CardTitle></CardHeader><CardContent>
      <div className="flex items-center justify-between gap-4">
        <div><label id="dark-mode-label" htmlFor="dark-mode" className="font-medium">다크 모드</label><p id="dark-mode-description" className="mt-2 text-sm text-muted-foreground">어두운 배경으로 편안하게 이용해요.</p></div>
        <button id="dark-mode" type="button" role="switch" aria-checked={dark} aria-labelledby="dark-mode-label" aria-describedby="dark-mode-description" onClick={() => setSaveError(!setTheme(dark ? 'light' : 'dark'))} className="flex min-h-11 min-w-14 shrink-0 cursor-pointer items-center rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={'flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors ' + (dark ? 'border-primary bg-primary' : 'border-input bg-secondary')}><span className={'size-5 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none ' + (dark ? 'translate-x-5' : 'translate-x-0')} /></span>
        </button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">선택한 화면 모드는 이 브라우저에 저장돼요.</p>
      <aside className="mt-5 rounded-lg border bg-muted/50 p-4 text-sm leading-6">
        <h2 className="font-medium">다크 모드를 껐는데도 화면이 어둡다면?</h2>
        <p className="mt-2 text-muted-foreground">브라우저의 강제 다크 모드가 색상을 바꿀 수 있어요. 브라우저 설정에서 ‘웹페이지 다크 모드’ 또는 ‘웹 콘텐츠에 다크 모드 적용’을 꺼주세요. 휴대폰 전체의 다크 모드는 유지해도 괜찮아요.</p>
        <p className="mt-2 text-xs text-muted-foreground">삼성 인터넷은 설정 → 웹페이지 보기 및 스크롤 → 다크 모드에서 확인해 주세요. 버전에 따라 메뉴 이름은 다를 수 있어요. 변경 후 페이지를 새로고침해 주세요.</p>
      </aside>
      {saveError && <p role="alert" className="mt-3 text-sm text-destructive">화면 모드는 적용했지만 저장하지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.</p>}
    </CardContent></Card>
  </section>
}
