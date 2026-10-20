import { useState } from 'react'
import { BookOpen, Heart, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { brickDrops } from './brick-drop-catalog'
import { dropArtwork } from './brick-breaker-artwork'
import { isItem } from './brick-breaker-model'
import { BRICK_ROUNDS } from './brick-breaker-rounds'

const tabs = [
  { id: 'rules', name: '게임 방법', icon: BookOpen },
  { id: 'items', name: '아이템', icon: Sparkles },
  { id: 'hazards', name: '방해물', icon: TriangleAlert },
] as const
type GuideTab = (typeof tabs)[number]['id']

export function BrickGuide() {
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState<GuideTab>('rules')
  const drops = brickDrops.filter((drop) => isItem(drop.kind) === (tab === 'items'))
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTab('rules')
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="min-h-11 w-full gap-2 rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          />
        }
      >
        <BookOpen className="size-4" />
        게임 방법 · 아이템 도감
      </DialogTrigger>
      <DialogContent className="flex max-h-[85svh] min-h-0 flex-col gap-0 overflow-hidden rounded-2xl border border-[#d8c4ab] bg-[#fff8ee] p-0 text-[#49382d] sm:max-w-lg">
        <DialogHeader className="shrink-0 bg-[#183b42] px-5 pb-5 pt-6 text-left text-[#fff1dd]">
          <span className="mb-2 text-[10px] tracking-[0.2em] text-[#b6d9d5]">
            PONGI BREAKER GUIDE
          </span>
          <DialogTitle className="text-xl">퐁이의 벽돌깨기 안내</DialogTitle>
          <DialogDescription className="mt-1 text-xs leading-5 text-[#d6e5da]">
            공을 지키고, 벽돌을 깨고, 바다의 보물을 모아요.
          </DialogDescription>
        </DialogHeader>
        <div
          role="tablist"
          aria-label="벽돌깨기 도움말"
          className="grid shrink-0 grid-cols-3 border-b border-[#d8c4ab]/50 p-2"
        >
          {tabs.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`brick-guide-${entry.id}-tab`}
              aria-selected={tab === entry.id}
              aria-controls={`brick-guide-${entry.id}`}
              tabIndex={tab === entry.id ? 0 : -1}
              onClick={() => setTab(entry.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault()
                  const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : 2)) % 3]
                  setTab(next.id)
                  document.getElementById(`brick-guide-${next.id}-tab`)?.focus()
                }
              }}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#a67546] ${tab === entry.id ? 'bg-[#eadcc8] font-medium text-[#654222]' : 'text-[#89725a]'}`}
            >
              <entry.icon className="size-3.5" />
              {entry.name}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`brick-guide-${tab}`}
          aria-labelledby={`brick-guide-${tab}-tab`}
          tabIndex={0}
          className="min-h-0 overflow-y-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a67546]"
        >
          {tab === 'rules' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#dfcfb9] bg-white/60 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="size-4 text-[#a67546]" />
                  손끝으로 퐁이를 움직여요
                </h3>
                <p className="text-xs leading-6 text-[#78614a]">
                  아래 조작판을 좌우로 문지르면 퐁이가 손가락을 따라가요. 키보드 방향키나 A·D로도
                  움직일 수 있어요. 공을 튕겨 모든 벽돌을 없애면 다음 라운드로 넘어가요.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f6e2da] p-3">
                  <Heart className="mb-2 size-5 fill-[#d99180] text-[#d99180]" />
                  <h3 className="text-xs font-medium">맞아도 멈추지 않아요</h3>
                  <p className="mt-1 text-xs leading-5 text-[#78614a]">
                    방해물에 맞아도 목숨이 남으면 계속해요. 공을 놓치면 남은 하트를 확인하고
                    화면을 터치해 공을 다시 발사해요.
                  </p>
                </div>
                <div className="rounded-xl bg-[#e1e9db] p-3">
                  <ShieldCheck className="mb-2 size-5 text-[#6b8970]" />
                  <h3 className="text-xs font-medium">모은 보상은 안전하게</h3>
                  <p className="mt-1 text-xs leading-5 text-[#78614a]">
                    라운드 보상과 동전·보물이 누적돼요. 피격이나 게임 종료로 이미 모은 보상을 잃지
                    않아요.
                  </p>
                </div>
              </div>
              <section className="rounded-xl border border-[#dfcfb9] p-4">
                <h3 className="mb-3 text-xs font-medium">라운드 클리어 보상</h3>
                <div className="grid grid-cols-5 gap-1">
                  {BRICK_ROUNDS.map((round, i) => (
                    <div key={i} className="rounded-lg bg-[#f0e5d5] px-1 py-2 text-center">
                      <p className="text-[10px] text-[#89725a]">{i + 1}라운드</p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold">
                        <img src="/currency/gold-coin-starfish.png" alt="골드" className="size-3" />
                        {round.reward}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-5 text-[#89725a]">
                  보상은 누적됩니다. 전부 클리어할 시 400골드!
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="px-1 text-xs leading-5 text-[#89725a]">
                {tab === 'items'
                  ? '초록빛 아이템은 퐁이를 도와줘요. 널판지로 받아 효과를 사용하세요.'
                  : '붉은빛 방해물은 피하세요. 보호막은 방해물 한 번을 막아줘요.'}
              </p>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {drops.map((drop) => {
                  const art = dropArtwork[drop.kind],
                    sheet = art.sheet && !art.preview
                  return (
                    <li
                      key={drop.kind}
                      className="flex items-center gap-3 rounded-xl border border-[#dfcfb9]/80 bg-white/60 p-3"
                    >
                      <span
                        aria-hidden="true"
                        className={`relative size-12 shrink-0 overflow-hidden rounded-xl ${tab === 'items' ? 'bg-[#e3ecdf]' : 'bg-[#f2e0da]'}`}
                      >
                        <img
                          src={art.preview ?? art.src}
                          alt=""
                          loading="lazy"
                          className={
                            sheet
                              ? 'absolute left-0 top-0 h-[200%] w-[200%] max-w-none'
                              : 'size-full object-contain p-1'
                          }
                        />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xs font-medium">{drop.name}</h3>
                        <p className="mt-1 text-[11px] leading-5 text-[#89725a]">{drop.detail}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
