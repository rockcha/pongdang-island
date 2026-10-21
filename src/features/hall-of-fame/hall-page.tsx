import { useEffect, useRef, useState } from 'react'
import { MessageCircle, RefreshCw, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { appArt } from '@/components/app-art'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { BoardTime } from '@/features/board/board-time'
import {
  actOnWall,
  hallError,
  loadHall,
  loadWall,
  type HallAction,
  type HallFeed,
  type HallPlayer,
  type HallWall,
} from './api'
import { formatHallValue, funCategories, hallCategories, type HallCategory } from './categories'

type Selection = { player: HallPlayer; category: HallCategory }

function PlayerWall({
  selection,
  onClose,
  onChange,
}: {
  selection: Selection
  onClose: () => void
  onChange: () => void
}) {
  const { session } = useAuth()
  const { player, category } = selection
  const [wall, setWall] = useState<HallWall | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const active = useRef(true)
  const [offset, setOffset] = useState(0)
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    active.current = true
    let current = true
    void loadWall(player.id)
      .then((data) => {
        if (current) {
          setWall(data)
          setError('')
          setOffset(data.comments.length)
        }
      })
      .catch((cause) => {
        if (current) setError(hallError(cause))
      })
    return () => {
      current = false
      active.current = false
    }
  }, [player.id, retry])
  async function act(args: Omit<HallAction, 'p_target'>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const next = await actOnWall({ p_target: player.id, ...args })
      onChange()
      if (!active.current) return
      setWall(next)
      setOffset(next.comments.length)
      setError('')
      if (args.p_action === 'comment') setBody('')
    } catch (cause) {
      if (active.current) toast.error(hallError(cause))
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  async function more() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const next = await loadWall(player.id, offset)
      if (active.current) {
        setOffset((previous) => previous + next.comments.length)
        setWall((previous) =>
          previous
            ? {
                ...next,
                comments: [
                  ...previous.comments,
                  ...next.comments.filter((c) => !previous.comments.some((old) => old.id === c.id)),
                ],
              }
            : next,
        )
      }
    } catch (cause) {
      if (active.current) toast.error(hallError(cause))
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        initialFocus={false}
        className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 max-sm:top-auto max-sm:bottom-0 max-sm:max-w-md max-sm:translate-y-0 max-sm:rounded-b-none"
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-5 text-left">
          <DialogTitle>퐁이에게 한마디</DialogTitle>
          <DialogDescription>
            {category.label} · {category.title}
          </DialogDescription>
        </DialogHeader>
        <div className="shrink-0 px-5 pt-4">
          <div className="flex items-center gap-3">
            <PlayerAvatar
              nickname={player.nickname}
              path={player.avatar_path}
              className="size-12 ring-2 ring-secondary"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{player.nickname}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {player.rank}위 · {formatHallValue(player.value, category.unit)}
              </p>
            </div>
          </div>
          {wall && (
            <div className="mt-3 flex items-center gap-1 border-b border-border/70 pb-2">
              {(
                [
                  { value: 1, icon: ThumbsUp, label: '좋아요', count: wall.likes },
                  { value: -1, icon: ThumbsDown, label: '싫어요', count: wall.dislikes },
                ] as const
              ).map((item) => (
                <Button
                  key={item.value}
                  variant="ghost"
                  className="min-h-11 gap-2 px-3 text-xs"
                  disabled={busy || session?.user.id === player.id}
                  aria-label={item.label}
                  aria-pressed={wall.myReaction === item.value}
                  onClick={() =>
                    void act({
                      p_action: 'react',
                      p_value: wall.myReaction === item.value ? 0 : item.value,
                    })
                  }
                >
                  <item.icon
                    className={`size-4 ${wall.myReaction === item.value ? 'fill-primary/15 text-primary' : 'text-muted-foreground'}`}
                  />
                  {item.count}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="ml-auto min-h-11 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={() => input.current?.focus()}
              >
                <MessageCircle className="size-4" />
                댓글 {wall.total}
              </Button>
            </div>
          )}
        </div>
        <div
          className="min-h-24 flex-1 overflow-y-auto overscroll-contain px-5"
          aria-busy={!wall && !error}
        >
          {error ? (
            <div role="alert" className="py-8 text-center text-xs">
              <p>{error}</p>
              <Button variant="ghost" onClick={() => setRetry((n) => n + 1)}>
                다시 불러오기
              </Button>
            </div>
          ) : !wall ? (
            <p role="status" className="py-10 text-center text-xs text-muted-foreground">
              한마디를 불러오는 중…
            </p>
          ) : (
            <>
              {!wall.comments.length && (
                <div className="py-10 text-center">
                  <MessageCircle
                    aria-hidden="true"
                    className="mx-auto mb-3 size-6 text-primary/40"
                  />
                  <p className="text-sm">첫 한마디를 남겨주세요</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    작은 응원이 오래 기억될 거예요.
                  </p>
                </div>
              )}
              <ul className="divide-y divide-border/50">
                {wall.comments.map((comment) => (
                  <li key={comment.id} className="flex gap-2.5 py-4">
                    <PlayerAvatar
                      nickname={comment.nickname}
                      path={comment.avatar_path}
                      className="size-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium">{comment.nickname}</span>
                        <BoardTime
                          value={comment.created_at}
                          className="shrink-0 text-[10px] text-muted-foreground"
                        />
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {comment.body}
                      </p>
                    </div>
                    {comment.author_id === session?.user.id && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="내 댓글 삭제"
                        disabled={busy}
                        onClick={() =>
                          void act({ p_action: 'delete_comment', p_comment_id: comment.id })
                        }
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {offset < wall.total && (
                <Button
                  variant="ghost"
                  className="mb-3 w-full text-xs"
                  disabled={busy}
                  onClick={() => void more()}
                >
                  이전 댓글 더 보기
                </Button>
              )}
            </>
          )}
        </div>
        <form
          className="flex shrink-0 items-end gap-2 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onSubmit={(event) => {
            event.preventDefault()
            if (body.trim()) void act({ p_action: 'comment', p_body: body.trim() })
          }}
        >
          <textarea
            ref={input}
            aria-label="댓글 내용"
            placeholder="따뜻한 한마디 남기기…"
            maxLength={500}
            rows={2}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="댓글 등록"
            disabled={busy || !wall || !body.trim()}
            className="size-11 shrink-0 rounded-xl"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RankingCard({
  category,
  players,
  onSelect,
}: {
  category: HallCategory
  players: HallPlayer[]
  onSelect: (selection: Selection) => void
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card px-4 pb-4 pt-4">
      <div className="mb-4 flex items-start gap-2.5">
        <category.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{category.label}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{category.title}</p>
        </div>
      </div>
      {players.length ? (
        <ol className="grid grid-cols-5 gap-1">
          {players.map((player) => (
            <li key={player.id} className="min-w-0">
              <button
                type="button"
                className="group flex min-h-24 w-full min-w-0 flex-col items-center rounded-xl py-1 outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelect({ player, category })}
                aria-label={`${player.rank}위 ${player.nickname}, ${formatHallValue(player.value, category.unit)}, 반응과 댓글`}
              >
                <span className="relative">
                  <PlayerAvatar
                    nickname={player.nickname}
                    path={player.avatar_path}
                    className={`size-10 ring-2 ${player.rank === 1 ? 'ring-amber-300/80' : 'ring-secondary'}`}
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-card text-[9px] tabular-nums ${player.rank === 1 ? 'bg-amber-200 text-amber-950' : 'bg-secondary text-muted-foreground'}`}
                  >
                    {player.rank}
                  </span>
                </span>
                <span className="mt-2 w-full truncate text-center text-[10px]">
                  {player.nickname}
                </span>
                <span
                  className="mt-0.5 w-full truncate text-center text-[10px] tabular-nums text-primary"
                  title={formatHallValue(player.value, category.unit)}
                >
                  {formatHallValue(player.value, category.unit)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-5 text-center text-xs text-muted-foreground">
          첫 기록의 주인공을 기다리고 있어요.
        </p>
      )}
      <details className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        <summary className="min-h-6 cursor-pointer">집계 기준</summary>
        <p className="pt-1">{category.description}</p>
      </details>
    </section>
  )
}

export function HallPage() {
  const [feed, setFeed] = useState<HallFeed | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [selection, setSelection] = useState<Selection | null>(null)
  const dirty = useRef(false)
  useEffect(() => {
    let active = true
    void loadHall()
      .then((data) => {
        if (active) {
          setFeed(data)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) setError(hallError(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [retry])
  function refresh() {
    setLoading(true)
    setRetry((n) => n + 1)
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-5">
      <div className="mb-5 flex items-center gap-3">
        <appArt.ranking className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">퐁당섬을 빛낸 작은 기록들</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            각 부문 TOP 5 · 아바타를 눌러 반응과 한마디를 남겨요.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="순위 새로고침"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw
            className={`size-4 text-muted-foreground ${loading ? 'motion-safe:animate-spin' : ''}`}
          />
        </Button>
      </div>
      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-border p-4 text-center text-xs">
          <p>{error}</p>
          <Button variant="ghost" disabled={loading} onClick={refresh}>
            다시 불러오기
          </Button>
        </div>
      )}
      {!feed && loading ? (
        <div role="status" aria-label="순위를 불러오는 중" className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-secondary/60 motion-safe:animate-pulse" />
          ))}
        </div>
      ) : (
        feed && (
          <>
            <div className="space-y-3">
              {hallCategories.map((category) => (
                <RankingCard
                  key={category.id}
                  category={category}
                  players={feed.rankings[category.id] ?? []}
                  onSelect={setSelection}
                />
              ))}
            </div>
            <div className="mb-4 mt-8">
              <h2 className="text-sm font-medium">바다의 별별 기록</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                잘해도, 조금 서툴러도. 모두의 이야기가 되는 순위.
              </p>
            </div>
            <div className="space-y-3">
              {funCategories.map((category) => (
                <RankingCard
                  key={category.id}
                  category={category}
                  players={feed.rankings[category.id] ?? []}
                  onSelect={setSelection}
                />
              ))}
            </div>
            <p className="mt-5 text-center text-[10px] leading-relaxed text-muted-foreground">
              누적 기록 기준 · 같은 기록은 먼저 가입한 퐁이 순<br />
              {new Date(feed.generatedAt).toLocaleTimeString('ko-KR', {
                timeZone: 'Asia/Seoul',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              기준
            </p>
          </>
        )
      )}
      {selection && (
        <PlayerWall
          key={selection.player.id}
          selection={selection}
          onChange={() => {
            dirty.current = true
          }}
          onClose={() => {
            setSelection(null)
            if (dirty.current) {
              dirty.current = false
              refresh()
            }
          }}
        />
      )}
    </div>
  )
}
