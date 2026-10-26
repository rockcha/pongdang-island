import { useEffect, useRef, useState } from 'react'
import { HeartHandshake, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { BoardTime } from '@/features/board/board-time'
import { useGold } from '@/features/gold/gold-provider'
import { BeggingCard, BeggingHistoryRow } from './begging-card'
import { BeggingCreateDialog, BeggingSendDialog } from './begging-dialogs'
import * as api from './api'
import type {
  BeggingDetail,
  BeggingDraft,
  BeggingFeed,
  BeggingHistory,
  BeggingPayment,
  BeggingRequest,
} from './api'
export type BeggingService = Pick<
  typeof api,
  | 'loadBegging'
  | 'loadBeggingDetail'
  | 'loadBeggingHistory'
  | 'createBegging'
  | 'giveBegging'
  | 'closeBegging'
>
type Tab = 'active' | 'mine' | 'history'
export function BeggingPage() {
  const { session } = useAuth(),
    { wallet } = useGold()
  return <BeggingScreen key={session?.user.id} owner={session?.user.id ?? ''} gold={wallet.gold} />
}
export function BeggingScreen({
  owner,
  gold,
  service = api,
}: {
  owner: string
  gold: number
  service?: BeggingService
}) {
  const [tab, setTab] = useState<Tab>('active'),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0)
  const [feed, setFeed] = useState<BeggingFeed | null>(null),
    [history, setHistory] = useState<BeggingHistory | null>(null),
    [error, setError] = useState('')
  const [creating, setCreating] = useState(false),
    [sending, setSending] = useState<BeggingRequest | null>(null),
    [closing, setClosing] = useState<BeggingRequest | null>(null),
    [busy, setBusy] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null),
    [detailPage, setDetailPage] = useState(0),
    [detail, setDetail] = useState<BeggingDetail | null>(null),
    [detailError, setDetailError] = useState(''),
    [detailRevision, setDetailRevision] = useState(0)
  const active = useRef(true),
    lock = useRef(false),
    mutation = useRef(0)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!owner) return
    let live = true,
      running = false,
      paused = false
    setFeed(null)
    setHistory(null)
    setError('')
    async function load() {
      if (!live || running || lock.current || paused || document.hidden) return
      running = true
      const version = mutation.current
      try {
        if (tab === 'history') {
          const value = await service.loadBeggingHistory(page * 20)
          if (live && version === mutation.current) {
            setHistory(value)
            setError('')
          }
        } else {
          const value = await service.loadBegging(tab, page * 10)
          if (live && version === mutation.current) {
            setFeed(value)
            setError('')
          }
        }
      } catch (cause) {
        if (live) {
          setError(api.beggingError(cause))
          paused =
            (cause as { code?: string })?.code === '42501' ||
            (cause as { status?: number })?.status === 401
        }
      } finally {
        running = false
      }
    }
    void load()
    const timer = setInterval(() => void load(), 30000),
      resume = () => {
        paused = false
        void load()
      }
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      live = false
      clearInterval(timer)
      window.removeEventListener('focus', resume)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [owner, tab, page, revision, service])
  useEffect(() => {
    if (!detailId) return
    let live = true
    setDetail(null)
    setDetailError('')
    service
      .loadBeggingDetail(detailId, detailPage * 20)
      .then((value) => {
        if (live) setDetail(value)
      })
      .catch((cause) => {
        if (live) setDetailError(api.beggingError(cause))
      })
    return () => {
      live = false
    }
  }, [detailId, detailPage, detailRevision, service])
  function replace(post: BeggingRequest) {
    mutation.current++
    setFeed((value) =>
      value
        ? { ...value, items: value.items.map((item) => (item.id === post.id ? post : item)) }
        : value,
    )
  }
  function people(id: string) {
    setDetailPage(0)
    setDetailId(id)
  }
  async function create(draft: BeggingDraft) {
    if (lock.current) throw Error('REQUEST_RUNNING')
    lock.current = true
    setBusy(true)
    try {
      await service.createBegging(draft)
      if (active.current) {
        mutation.current++
        setCreating(false)
        setTab('mine')
        setPage(0)
        setRevision((value) => value + 1)
        toast.success('사연을 남겼어요.')
      }
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  async function send(payment: BeggingPayment) {
    if (lock.current) throw Error('REQUEST_RUNNING')
    lock.current = true
    setBusy(true)
    try {
      const result = await service.giveBegging(payment)
      if (active.current) {
        replace(result.request)
        toast.success(
          result.receipt.replayed
            ? '이미 완료된 송금이에요.'
            : `${result.receipt.gold.toLocaleString('ko-KR')}골드를 보냈어요. 경험치 +2`,
        )
      }
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  async function close() {
    if (!closing || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const value = await service.closeBegging(closing.id)
      if (active.current) {
        replace(value)
        setClosing(null)
        toast.success('사연을 마감했어요.')
      }
    } catch (cause) {
      if (active.current) toast.error(api.beggingError(cause))
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  const current = tab === 'history' ? history : feed
  return (
    <section aria-label="사연함" className="flex min-h-0 flex-1 flex-col">
      <div
        role="group"
        aria-label="사연함 목록 분류"
        className="grid shrink-0 grid-cols-3 border-b border-border/60"
      >
        {(
          [
            ['active', '이웃 사연'],
            ['mine', '내 사연'],
            ['history', '송금 기록'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key)
              setPage(0)
            }}
            className={`min-h-12 border-b-2 px-1 text-xs ${tab === key ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-secondary/15 px-3 pb-6 pt-3">
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-destructive/20 bg-background p-4 text-xs leading-5"
          >
            <p>{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}>
              다시 불러오기
            </Button>
          </div>
        )}
        {!current && !error ? (
          <div role="status" aria-label="사연을 불러오는 중" className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border bg-background motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : tab === 'history' && history?.items.length ? (
          <ul className="overflow-hidden rounded-2xl border border-border/70 bg-background">
            {history.items.map((record) => (
              <BeggingHistoryRow
                key={record.id}
                record={record}
                onOpen={() => people(record.requestId)}
              />
            ))}
          </ul>
        ) : tab !== 'history' && feed?.items.length ? (
          <div className="space-y-3">
            {feed.items.map((post) => (
              <BeggingCard
                key={post.id}
                post={post}
                busy={busy}
                onGive={() => setSending(post)}
                onHistory={() => people(post.id)}
                onClose={() => setClosing(post)}
              />
            ))}
          </div>
        ) : (
          !error && (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <span className="mb-4 grid size-16 place-items-center rounded-full bg-primary/5">
                <HeartHandshake className="size-8 text-primary/60" strokeWidth={1.4} />
              </span>
              <p className="text-sm">
                {tab === 'history'
                  ? '아직 주고받은 골드가 없어요.'
                  : tab === 'mine'
                    ? '아직 남긴 사연이 없어요.'
                    : '아직 올라온 사연이 없어요.'}
              </p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {tab === 'history'
                  ? '골드와 마음을 나눈 기록이 여기에 남아요.'
                  : '나누고 싶은 사연을 남기고, 이웃의 사연에 골드로 응원해요.'}
              </p>
            </div>
          )
        )}
        {current && (page > 0 || current.hasMore) && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              이전
            </Button>
            <span className="text-xs text-muted-foreground">{page + 1}페이지</span>
            <Button
              variant="ghost"
              disabled={!current.hasMore}
              onClick={() => setPage((value) => value + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </div>
      <footer className="shrink-0 border-t border-border/60 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          className="min-h-12 w-full gap-2 rounded-xl text-sm shadow-sm"
          disabled={busy}
          onClick={() => setCreating(true)}
        >
          <PenLine className="size-4" />
          사연 쓰기
        </Button>
      </footer>
      <BeggingCreateDialog open={creating} onOpenChange={setCreating} onCreate={create} />
      <BeggingSendDialog
        post={sending}
        gold={gold}
        onClose={() => setSending(null)}
        onSend={send}
      />
      <ConfirmDialog
        open={closing !== null}
        onOpenChange={(open) => {
          if (!open) setClosing(null)
        }}
        title="사연을 마감할까요?"
        description="이미 받은 골드는 그대로 유지되고, 더 이상 골드를 받지 않아요. 기록은 남아요."
        confirmLabel="마감하기"
        busy={busy}
        onConfirm={() => void close()}
        compact
      />
      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      >
        <DialogContent className="max-h-[80dvh] max-w-sm overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>응원해 준 사람들</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.request.transferCount}번의 따뜻한 마음이 모였어요.`
                : '골드로 응원해 준 이웃의 기록이에요.'}
            </DialogDescription>
          </DialogHeader>
          {detailError ? (
            <div role="alert" className="text-xs">
              <p>{detailError}</p>
              <Button variant="ghost" onClick={() => setDetailRevision((value) => value + 1)}>
                다시 불러오기
              </Button>
            </div>
          ) : !detail ? (
            <p role="status" className="py-8 text-center text-xs text-muted-foreground">
              기록을 불러오는 중…
            </p>
          ) : detail.items.length ? (
            <>
              <ol className="divide-y divide-border/50">
                {detail.items.map((person) => (
                  <li key={person.id} className="flex items-center gap-2.5 py-3">
                    <PlayerAvatar
                      nickname={person.nickname}
                      path={person.avatarPath}
                      className="size-9"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{person.nickname}</p>
                      {person.createdAt && (
                        <BoardTime
                          value={person.createdAt}
                          className="mt-1 block text-[10px] text-muted-foreground"
                        />
                      )}
                    </div>
                    <span className="text-xs tabular-nums text-primary">
                      {person.gold.toLocaleString('ko-KR')}골드
                    </span>
                  </li>
                ))}
              </ol>
              {(detailPage > 0 || detail.hasMore) && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    disabled={detailPage === 0}
                    onClick={() => setDetailPage((value) => value - 1)}
                  >
                    이전 기록
                  </Button>
                  <span className="text-[10px]">{detailPage + 1}페이지</span>
                  <Button
                    variant="ghost"
                    disabled={!detail.hasMore}
                    onClick={() => setDetailPage((value) => value + 1)}
                  >
                    다음 기록
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">
              아직 도착한 마음이 없어요.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
