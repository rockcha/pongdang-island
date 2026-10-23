import {PlayerIdentityLink} from '@/features/profile/player-identity-link'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {HallCategoryIcon,HallTabIcon} from './hall-category-icon'
import {
  Crown,
  Frown,
  Angry,
  ChevronDown,
  MessageCircle,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { BoardTime } from '@/features/board/board-time'
import {
  actOnSection,
  hallError,
  loadHall,
  loadSectionWall,
  loadSectionCounts,
  type HallSectionAction,
  type HallFeed,
  type HallPlayer,
  type HallSectionWall,
} from './api'
import { formatHallValue, funCategories, hallCategories, type HallCategory } from './categories'

function SectionWall({
  selection,
  onChange,
}: {
  selection: HallCategory
  onChange: (total: number) => void
}) {
  const { session } = useAuth()
  const category = selection
  const [wall, setWall] = useState<HallSectionWall | null>(null)
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
    void loadSectionWall(category.id)
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
  }, [category.id, retry])
  async function act(args: Omit<HallSectionAction, 'p_section'>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const next = await actOnSection({ p_section: category.id, ...args })
      onChange(next.total)
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
      const next = await loadSectionWall(category.id, offset)
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
    <div className="mt-2 overflow-hidden rounded-xl border border-border/60 bg-secondary/15">
      <div className="px-3" aria-busy={!wall && !error}>
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
              <div className="py-6 text-center">
                <MessageCircle aria-hidden="true" className="mx-auto mb-2 size-5 text-primary/40" />
                <p className="text-sm">첫 한마디를 남겨주세요</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  이 기록에 대한 응원과 바다 수다를 나눠요.
                </p>
              </div>
            )}
            <ul className="divide-y divide-border/50">
              {wall.comments.map((comment) => (
                <li key={comment.id} className="flex gap-2.5 py-4">
                  <PlayerIdentityLink
                    to={
                      comment.author_id === session?.user.id
                        ? '/aquarium'
                        : `/friends/${comment.author_id}/aquarium`
                    }
                    label={`${comment.nickname} 아쿠아리움 방문`}
                    className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <PlayerAvatar userId={comment.author_id}
                      nickname={comment.nickname}
                      path={comment.avatar_path}
                      className="size-8 shrink-0"
                    />
                  </PlayerIdentityLink>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={
                          comment.author_id === session?.user.id
                            ? '/aquarium'
                            : `/friends/${comment.author_id}/aquarium`
                        }
                        className="truncate text-xs font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {comment.nickname}
                      </Link>
                      <BoardTime
                        value={comment.created_at}
                        className="shrink-0 text-[10px] text-muted-foreground"
                      />
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {comment.body}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(
                        [
                          { value: 1, icon: ThumbsUp, label: '좋아요', count: comment.likes },
                          { value: 2, icon: Frown, label: '슬퍼요', count: comment.sad ?? 0 },
                          { value: 3, icon: Angry, label: '화나요', count: comment.angry ?? 0 },
                          {
                            value: -1,
                            icon: ThumbsDown,
                            label: '싫어요',
                            count: comment.dislikes,
                          },
                        ] as const
                      ).map((reaction) => (
                        <Button
                          key={reaction.value}
                          variant="ghost"
                          className="min-h-9 gap-1.5 px-2 text-[11px]"
                          aria-label={reaction.label}
                          aria-pressed={comment.myReaction === reaction.value}
                          disabled={busy || comment.author_id === session?.user.id}
                          onClick={() =>
                            void act({
                              p_action: 'react',
                              p_comment_id: comment.id,
                              p_value: comment.myReaction === reaction.value ? 0 : reaction.value,
                            })
                          }
                        >
                          <reaction.icon
                            className={`size-3.5 ${comment.myReaction === reaction.value ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                          {reaction.count}
                        </Button>
                      ))}
                    </div>
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
        className="flex items-end gap-2 border-t border-border/60 bg-background/70 p-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (body.trim()) void act({ p_action: 'comment', p_body: body.trim() })
        }}
      >
        <textarea
          ref={input}
          aria-label="댓글 내용"
          placeholder="이 기록에 대해 한마디 남겨주세요…"
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
    </div>
  )
}

function RankingCard({
  category,
  players,
  onCountChange,
  commentCount,
}: {
  category: HallCategory
  players: HallPlayer[]
  onCountChange: (total: number) => void
  commentCount?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const { session } = useAuth()
  const [opened, setOpened] = useState(false)
  const discussionId = 'hall-discussion-' + category.id
  return (
    <section className="rounded-2xl border border-border/70 bg-card px-4 pb-4 pt-4">
      <div className="mb-4 flex items-start gap-2.5">
        <HallCategoryIcon category={category}/>
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{category.label}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{category.title}</p>
        </div>
      </div>
      {players.length ? (
        <ol className="grid grid-cols-5 gap-1 pt-3">
          {players.map((player) => (
            <li key={player.id} className="min-w-0">
              <PlayerIdentityLink
                to={player.id === session?.user.id ? '/aquarium' : `/friends/${player.id}/aquarium`}
                title={`${player.nickname} 아쿠아리움 방문`}
                className="flex min-h-24 w-full min-w-0 flex-col items-center rounded-xl py-1 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                label={`${player.rank}위 ${player.nickname}, ${formatHallValue(player.value, category.unit)}`}
              >
                <span className="relative">
                  {player.rank === 1 && (
                    <Crown
                      aria-label="1등 왕관"
                      className="pointer-events-none absolute -top-4 left-1/2 z-10 size-6 -translate-x-1/2 -rotate-6 fill-amber-300 text-amber-600 drop-shadow-sm"
                      strokeWidth={1.5}
                    />
                  )}
                  <PlayerAvatar level={player.level} userId={player.id}
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
                <span className="mt-1 flex w-full min-w-0 items-center justify-center gap-0.5 text-[10px]"><span className="truncate">
                  {player.nickname}
                </span></span>
                <span
                  className="mt-0.5 w-full truncate text-center text-[10px] tabular-nums text-primary"
                  title={formatHallValue(player.value, category.unit)}
                >
                  {formatHallValue(player.value, category.unit)}
                </span>
              </PlayerIdentityLink>
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
      <div className="mt-3 border-t border-border/50 pt-2">
        <Button
          variant="ghost"
          className="min-h-10 w-full gap-2 rounded-xl text-xs text-primary hover:bg-secondary/60"
          aria-label={category.label + ' 이야기 ' + (expanded ? '접기' : '열기')}
          aria-expanded={expanded}
          aria-controls={discussionId}
          onClick={() => {
            setOpened(true)
            setExpanded((value) => !value)
          }}
        >
          <MessageCircle className="size-4" />
          이야기{commentCount === undefined ? '' : ` ${commentCount}`}
          <ChevronDown
            className={`ml-auto size-3.5 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      </div>
      <div
        id={discussionId}
        role="region"
        aria-label={category.label + ' 이야기'}
        hidden={!expanded}
      >
        {opened && <SectionWall selection={category} onChange={onCountChange} />}
      </div>
    </section>
  )
}

export function HallPage() {
  const [feed, setFeed] = useState<HallFeed | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let active = true
    void loadSectionCounts()
      .then((data) => {
        if (active) setCounts(data)
      })
      .catch(() => {
        /* Keep rankings available if discussions are not deployed. */
      })
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
    <Tabs
      defaultValue="honor"
      onValueChange={() => {
        if (list.current) list.current.scrollTop = 0
      }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="shrink-0 border-b border-border/60 bg-background px-4 pt-4 pb-2">
        <TabsList aria-label="기록 분류" className="mb-3 gap-1 rounded-xl p-1.5">
          <TabsTrigger value="honor" className="min-h-14 gap-2 rounded-lg px-2 text-sm font-medium">
            <HallTabIcon kind="honor"/>
            명예로운 기록
          </TabsTrigger>
          <TabsTrigger value="fun" className="min-h-14 gap-2 rounded-lg px-2 text-sm font-medium">
            <HallTabIcon kind="fun"/>
            별별 기록
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              각 부문 TOP 5 · 이야기에서 응원과 수다를 나눠요.
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
      </div>
      <div
        ref={list}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-8"
        aria-label="기록 목록"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-border p-4 text-center text-xs"
          >
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
              <TabsContent value="honor" className="mt-0 space-y-3">
                {hallCategories.map((category) => (
                  <RankingCard
                    key={category.id}
                    category={category}
                    players={feed.rankings[category.id] ?? []}
                    onCountChange={(total) =>
                      setCounts((previous) => ({ ...previous, [category.id]: total }))
                    }
                    commentCount={counts[category.id]}
                  />
                ))}
              </TabsContent>
              <TabsContent value="fun" className="mt-0 space-y-3">
                {funCategories.map((category) => (
                  <RankingCard
                    key={category.id}
                    category={category}
                    players={feed.rankings[category.id] ?? []}
                    onCountChange={(total) =>
                      setCounts((previous) => ({ ...previous, [category.id]: total }))
                    }
                    commentCount={counts[category.id]}
                  />
                ))}
              </TabsContent>
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
      </div>
    </Tabs>
  )
}
