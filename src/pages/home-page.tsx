import { Anchor, ArrowRight, Fish, Mail } from 'lucide-react'
import { Link } from 'react-router'
import { getNickname, useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { Card, CardContent } from '@/components/ui/card'

export function HomePage() {
  const { session } = useAuth()
  const { unread } = useSocial()
  const count = unread.friend + unread.general
  return <section className="space-y-6 py-6">
    <div><p className="mb-2 text-xs tracking-widest text-primary">PONGDANG ISLAND</p><h1 className="text-3xl font-bold">퐁당마을</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{getNickname(session)}님, 오늘도 느긋하게 쉬어가세요.</p></div>
    <Card className="border-primary/10 bg-primary/5 shadow-none"><CardContent><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">바다가 부르는 하루</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">새로운 물결을 만나러<br />선착장으로 가볼까요?</p><Link to="/harbor" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">선착장 둘러보기 <ArrowRight className="size-4" /></Link></div><Anchor className="mt-2 size-12 shrink-0 text-primary/50" strokeWidth={1.4} /></div></CardContent></Card>
    <div className="grid grid-cols-2 gap-3"><Link to="/aquarium" className="space-y-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-primary/5"><Fish className="size-7 text-primary" /><h2 className="font-semibold">아쿠아리움</h2><p className="text-xs leading-5 text-muted-foreground">나만의 작은 바다</p></Link><Link to="/notifications" className="space-y-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-primary/5"><Mail className="size-7 text-primary" /><h2 className="font-semibold">우체통</h2><p className="text-xs leading-5 text-muted-foreground">{count ? `읽지 않은 소식 ${count}개` : '섬과 친구들의 소식'}</p></Link></div>
  </section>
}
