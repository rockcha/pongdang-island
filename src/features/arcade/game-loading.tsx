import {appArt} from '@/components/app-art'
import { Component, useEffect, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

const {gameplay:Gamepad2,ranking:Trophy}=appArt

export function GameLoading({ failed = false }: {failed?:boolean}) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000)
    return () => window.clearTimeout(timer)
  }, [])
  return <div role="status" aria-label={failed?'게임을 불러오지 못했어요':'게임 화면을 불러오는 중'} className="flex min-h-0 flex-1 flex-col">
    <span className="sr-only">게임 화면을 불러오는 중</span>
    <div aria-hidden="true" className="grid shrink-0 grid-cols-2 border-b border-border bg-background text-sm text-muted-foreground">
      <div className="flex min-h-12 items-center justify-center gap-2 bg-secondary text-primary"><Gamepad2 className="size-7"/>게임 플레이</div>
      <div className="flex min-h-12 items-center justify-center gap-2"><Trophy className="size-7"/>랭킹</div>
    </div>
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-secondary/40 p-6">
      {slow||failed?<div className="space-y-3 text-center"><p className="text-sm text-muted-foreground">{failed?'게임을 불러오지 못했어요.':'조금만 기다려 주세요. 연결이 느린 것 같아요.'}</p><Button variant="outline" onClick={()=>window.location.reload()}>다시 불러오기</Button></div>:<div aria-hidden="true" className="flex w-full max-w-56 flex-col items-center gap-4 motion-safe:animate-pulse"><div className="size-24 rounded-2xl bg-secondary"/><div className="h-5 w-36 rounded bg-secondary"/><div className="h-3 w-full rounded bg-secondary/70"/></div>}
    </div>
    <div aria-hidden="true" className="grid shrink-0 grid-cols-2 border-t border-border pb-[env(safe-area-inset-bottom)]"><div className="flex min-h-14 items-center justify-center border-r border-border"><span className="h-4 w-24 rounded bg-secondary motion-safe:animate-pulse"/></div><div className="flex min-h-14 items-center justify-center"><span className="h-4 w-24 rounded bg-secondary motion-safe:animate-pulse"/></div></div>
  </div>
}

export class GameLoadBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state = {failed:false}
  static getDerivedStateFromError() { return {failed:true} }
  render() { return this.state.failed?<GameLoading failed/>:this.props.children }
}
