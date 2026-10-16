import { Map, ArrowRight, Fish, Mail } from 'lucide-react'
import { Link } from 'react-router'
import { useSocial } from '@/features/social/social-provider'
import { Card, CardContent } from '@/components/ui/card'

export function HomePage() {
  const { unread } = useSocial()
  const count = unread.friend + unread.general + (unread.gift ?? 0)
  return <section className="space-y-6 py-6">
    <Card className="border-primary/10 bg-primary/5 shadow-none"><CardContent><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">바다가 부르는 하루</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">새로운 물결을 만나러<br />지도를 펼쳐볼까요?</p><Link to="/harbor" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">지도 둘러보기 <ArrowRight className="size-4" /></Link></div><Map className="mt-2 size-12 shrink-0 text-primary/50" strokeWidth={1.4} /></div></CardContent></Card>
    <div className="grid grid-cols-2 gap-3"><Link to="/aquarium" className="space-y-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-primary/5"><Fish className="size-7 text-primary" /><h2 className="font-semibold">아쿠아리움</h2><p className="text-xs leading-5 text-muted-foreground">나만의 작은 바다</p></Link><Link to="/notifications" className="space-y-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-primary/5"><Mail className="size-7 text-primary" /><h2 className="font-semibold">우편함</h2><p className="text-xs leading-5 text-muted-foreground">{count ? `읽지 않은 소식 ${count}개` : '섬과 친구들의 소식과 선물'}</p></Link></div>
  </section>
}
