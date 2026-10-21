import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Menu } from '@base-ui/react/menu'
import { MessageCircle, MoreHorizontal, Pencil, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { appArt } from '@/components/app-art'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { useOperator } from '@/features/notices/use-operator'
import { useSocial } from '@/features/social/social-provider'
import { randomId } from '@/lib/random-id'
import {
  boardAction,
  boardError,
  loadBoardDetail,
  loadBoardFeed,
  removeBoardImages,
  type BoardAuthor,
  type BoardComment,
  type BoardDetail,
  type BoardFeed,
  type BoardReactions,
} from './api'
import { BoardEditor } from './board-editor'
import { BoardTime } from './board-time'

function Author({ author, time }: { author: BoardAuthor; time: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <PlayerAvatar
        nickname={author.author_name}
        path={author.avatar_path}
        className="size-9 shrink-0 ring-1 ring-border bg-secondary"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{author.author_name}</p>
        {author.equipped_title && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-primary">
            <appArt.title className="size-3.5" />
            {author.equipped_title}
          </p>
        )}
      </div>
      <BoardTime value={time} className="shrink-0 text-[10px] text-muted-foreground" />
    </div>
  )
}
function Failure({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div role="alert" className="space-y-3 py-8 text-center text-sm">
      <p>{error}</p>
      <Button variant="outline" onClick={retry}>
        다시 불러오기
      </Button>
    </div>
  )
}
function Reactions({
  value,
  busy,
  onChange,
}: {
  value: BoardReactions
  busy: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="좋아요와 싫어요">
      {(
        [
          { n: 1, Icon: ThumbsUp, label: '좋아요', count: value.likes },
          { n: -1, Icon: ThumbsDown, label: '싫어요', count: value.dislikes },
        ] as const
      ).map(({ n, Icon, label, count }) => (
        <Button
          key={n}
          variant="ghost"
          className="min-h-11 gap-1.5 px-3 text-xs"
          disabled={busy}
          aria-label={label}
          aria-pressed={value.my_reaction === n}
          onClick={() => onChange(value.my_reaction === n ? 0 : n)}
        >
          <Icon
            className={`size-4 ${value.my_reaction === n ? 'fill-primary/15 text-primary' : 'text-muted-foreground'}`}
          />
          <span className="tabular-nums">{count}</span>
        </Button>
      ))}
    </div>
  )
}
function Actions({ edit, remove, busy }: { edit?: () => void; remove: () => void; busy: boolean }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant="ghost" size="icon" aria-label="게시물 관리" disabled={busy} />}
      >
        <MoreHorizontal className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="z-[60]">
          <Menu.Popup className="min-w-28 rounded-lg border bg-popover p-1 text-xs shadow-sm outline-none">
            {edit && (
              <Menu.Item
                onClick={edit}
                className="cursor-pointer rounded p-3 data-highlighted:bg-secondary"
              >
                수정
              </Menu.Item>
            )}
            <Menu.Item
              onClick={remove}
              className="cursor-pointer rounded p-3 text-destructive data-highlighted:bg-secondary"
            >
              삭제
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function BoardPage() {
  const navigate = useNavigate(),
    [tab, setTab] = useState<'latest' | 'popular' | 'mine'>('latest'),
    [page, setPage] = useState(0),
    [feed, setFeed] = useState<BoardFeed | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [editor, setEditor] = useState(false)
  useEffect(() => {
    let active = true
    setFeed(null)
    setError('')
    loadBoardFeed(tab === 'popular' ? 'popular' : 'latest', tab === 'mine', page * 20)
      .then((data) => {
        if (active) setFeed(data)
      })
      .catch((cause) => {
        if (active) setError(boardError(cause))
      })
    return () => {
      active = false
    }
  }, [tab, page, retry])
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-3">
        <div className="flex gap-1" role="group" aria-label="게시글 정렬">
          {(
            [
              { id: 'latest', name: '전체' },
              { id: 'popular', name: '인기' },
              { id: 'mine', name: '내 글' },
            ] as const
          ).map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              aria-pressed={tab === item.id}
              className={`min-h-12 rounded-none px-3 text-xs ${tab === item.id ? 'border-b-2 border-b-primary text-primary' : 'text-muted-foreground'}`}
              onClick={() => {
                setTab(item.id)
                setPage(0)
              }}
            >
              {item.name}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="min-h-11 gap-1.5 px-2 text-xs"
          onClick={() => setEditor(true)}
        >
          <Pencil className="size-3.5" />
          글쓰기
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        {error ? (
          <Failure error={error} retry={() => setRetry((n) => n + 1)} />
        ) : !feed ? (
          <p role="status" className="py-12 text-center text-xs text-muted-foreground">
            이야기를 불러오는 중…
          </p>
        ) : feed.items.length ? (
          <ul className="divide-y divide-border/70">
            {feed.items.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/board/${post.id}`}
                  className="group flex gap-3 py-5 outline-none transition-colors hover:bg-secondary/20 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PlayerAvatar nickname={post.author_name} path={post.avatar_path} className="size-8 shrink-0 ring-1 ring-border bg-secondary" />
                  <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="min-w-0 truncate font-medium text-foreground/80">{post.author_name}</span>
                    <span aria-hidden="true" className="opacity-50">·</span>
                    <BoardTime value={post.created_at} className="shrink-0" />
                  </div>
                  <h2 className="line-clamp-2 break-words text-sm font-semibold leading-6 [overflow-wrap:anywhere] group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-1 line-clamp-1 break-words text-xs leading-5 text-muted-foreground">
                    {post.body}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
                    <span aria-label={`댓글 ${post.comment_count}개`} className={`inline-flex items-center gap-1 ${post.comment_count>0?'text-primary':''}`}>
                      <MessageCircle aria-hidden="true" className="size-3.5" />
                      {post.comment_count}
                    </span>
                    <span aria-label={`좋아요 ${post.likes}개`} className="inline-flex items-center gap-1">
                      <ThumbsUp aria-hidden="true" className="size-3.5" />
                      {post.likes}
                    </span>
                  </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <appArt.plaza className="size-12" />
            <p className="text-sm">
              {tab === 'mine' ? '아직 작성한 이야기가 없어요.' : '섬의 첫 이야기를 들려주세요.'}
            </p>
          </div>
        )}
        {feed && feed.total > 20 && (
          <div className="flex items-center justify-between py-4">
            <Button variant="ghost" disabled={!page} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {Math.ceil(feed.total / 20)}
            </span>
            <Button
              variant="ghost"
              disabled={(page + 1) * 20 >= feed.total}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </div>
      {editor && (
        <BoardEditor
          onClose={() => setEditor(false)}
          onSaved={(id) => {
            setEditor(false)
            navigate(`/board/${id}`)
          }}
        />
      )}
    </section>
  )
}

export function BoardDetailPage() {
  const { postId } = useParams()
  return <Detail key={postId} id={postId ?? ''} />
}
function Detail({ id }: { id: string }) {
  const { session } = useAuth(),
    { operator } = useOperator(),
    social = useSocial(),
    navigate = useNavigate()
  const [data, setData] = useState<BoardDetail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [actionError, setActionError] = useState(''),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState(false),
    [confirm, setConfirm] = useState<BoardComment | 'post' | null>(null)
  const [body, setBody] = useState(''),
    [editing, setEditing] = useState<BoardComment | null>(null)
  const lock = useRef(false),
    input = useRef<HTMLTextAreaElement>(null),
    pendingComment = useRef<{ id: string; body: string } | null>(null)
  useEffect(() => {
    let active = true
    setLoading(true)
    loadBoardDetail(id)
      .then((next) => {
        if (active) {
          setData(next)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) setError(boardError(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, retry])
  async function refresh() {
    const next = await loadBoardDetail(id)
    setData(next)
  }
  async function react(value: number, comment_id?: string) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setActionError('')
    try {
      await boardAction('react', { post_id: id, value, comment_id })
      await refresh()
    } catch (cause) {
      setActionError(boardError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (lock.current || !body.trim()) return
    lock.current = true
    setBusy(true)
    setActionError('')
    try {
      if (editing)
        await boardAction('edit_comment', { post_id: id, id: editing.id, body: body.trim() })
      else {
        const previous = pendingComment.current
        const draft =
          previous && previous.body === body.trim()
            ? previous
            : { id: randomId(), body: body.trim() }
        pendingComment.current = draft
        await boardAction('comment', {
          post_id: id,
          id: draft.id,
          body: draft.body,
          parent_id: null,
        })
      }
      setBody('')
      setEditing(null)
      pendingComment.current = null
      await refresh()
      void social.refresh()
    } catch (cause) {
      setActionError(boardError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function remove() {
    if (!confirm || lock.current) return
    lock.current = true
    setBusy(true)
    setActionError('')
    try {
      if (confirm === 'post') {
        const images = data?.post.images ?? []
        await boardAction('delete', { post_id: id })
        void removeBoardImages(images).catch(() => {})
        navigate('/board', { replace: true })
        toast.success('이야기를 삭제했어요.')
      } else {
        await boardAction('delete_comment', { post_id: id, id: confirm.id })
        await refresh()
      }
      setConfirm(null)
    } catch (cause) {
      setActionError(boardError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function more() {
    if (lock.current || !data) return
    lock.current = true
    setBusy(true)
    try {
      const next = await loadBoardDetail(id, data.comments.length)
      if (next)
        setData((previous) =>
          previous
            ? {
                ...next,
                comments: [
                  ...previous.comments,
                  ...next.comments.filter((c) => !previous.comments.some((p) => p.id === c.id)),
                ],
              }
            : next,
        )
    } catch (cause) {
      setActionError(boardError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const post = data?.post
  return (
    <article className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {loading ? (
          <p role="status" className="py-10 text-center text-xs text-muted-foreground">
            이야기를 불러오는 중…
          </p>
        ) : error ? (
          <Failure error={error} retry={() => setRetry((n) => n + 1)} />
        ) : !post ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            삭제되었거나 찾을 수 없는 이야기예요.
          </p>
        ) : (
          <>
            <header className="space-y-4">
              <div className="flex items-start gap-2">
                <h1 className="min-w-0 flex-1 break-words text-lg leading-7 [overflow-wrap:anywhere]">
                  {post.title}
                </h1>
                {(post.author_id === session?.user.id || operator) && (
                  <Actions
                    busy={busy}
                    edit={post.author_id === session?.user.id ? () => setEditor(true) : undefined}
                    remove={() => {
                      setActionError('')
                      setConfirm('post')
                    }}
                  />
                )}
              </div>
              <Author author={post} time={post.created_at} />
            </header>
            <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">
              {post.body}
            </p>
            {post.images.map((path, i) => (
              <img
                key={path}
                src={post.urls?.[path]}
                alt={`게시글 사진 ${i + 1}`}
                loading="lazy"
                className="mt-4 max-h-[60dvh] w-full rounded-lg object-contain"
              />
            ))}
            <div className="my-5 flex justify-center">
              <Reactions value={post} busy={busy} onChange={(value) => void react(value)} />
            </div>
            <section className="border-t pt-4" aria-label="댓글 목록">
              <h2 className="mb-2 text-xs">
                댓글 <span className="ml-1 text-primary">{post.comment_count}</span>
              </h2>
              {data?.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`border-b border-border/60 py-4 ${comment.parent_id ? 'ml-5 border-l pl-3' : ''}`}
                >
                  {comment.parent_id && (
                    <p className="mb-2 text-[10px] text-muted-foreground">
                      ↳ {comment.parent_author_name ?? '친구'}님에게 답글
                    </p>
                  )}
                  <Author author={comment} time={comment.created_at} />
                  <p
                    className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere] ${comment.deleted ? 'text-muted-foreground' : ''}`}
                  >
                    {comment.deleted ? '삭제된 댓글이에요.' : comment.body}
                  </p>
                  {!comment.deleted && (
                    <div className="mt-1 flex items-center">
                      <Reactions
                        value={comment}
                        busy={busy}
                        onChange={(value) => void react(value, comment.id)}
                      />
                      {(comment.author_id === session?.user.id || operator) && (
                        <div className="ml-auto">
                          <Actions
                            busy={busy}
                            edit={
                              comment.author_id === session?.user.id
                                ? () => {
                                    setEditing(comment)
                                    setBody(comment.body)
                                    input.current?.focus()
                                  }
                                : undefined
                            }
                            remove={() => {
                              setActionError('')
                              setConfirm(comment)
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!data?.comments.length && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  첫 댓글을 남겨주세요.
                </p>
              )}
              {!!data && data.comment_total > data.comments.length && (
                <Button
                  variant="ghost"
                  className="min-h-11 w-full text-xs"
                  disabled={busy}
                  onClick={() => void more()}
                >
                  댓글 더 보기
                </Button>
              )}
            </section>
          </>
        )}
      </div>
      {post && !loading && (
        <form
          onSubmit={(event) => void send(event)}
          className="shrink-0 space-y-2 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {editing && (
            <div className="flex items-center justify-between text-[11px] text-primary">
              <span>댓글 수정</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="댓글 작성 모드 취소"
                disabled={busy}
                onClick={() => {
                  setEditing(null)
                  setBody('')
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          )}
          {actionError && !confirm && (
            <p role="alert" className="text-xs text-destructive">
              {actionError}
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={input}
              aria-label={editing ? '댓글 수정' : '댓글 내용'}
              value={body}
              maxLength={1000}
              disabled={busy}
              onChange={(event) => setBody(event.target.value)}
              rows={2}
              placeholder="따뜻한 댓글을 남겨주세요."
              className="min-h-11 max-h-32 min-w-0 flex-1 resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              className="min-h-11 shrink-0 text-xs"
              disabled={busy || !body.trim()}
            >
              {editing ? '저장' : '등록'}
            </Button>
          </div>
        </form>
      )}
      {editor && post && (
        <BoardEditor
          post={post}
          onClose={() => setEditor(false)}
          onSaved={() => {
            setEditor(false)
            void refresh()
          }}
        />
      )}
      <ConfirmDialog
        illustration="caution"
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null)
        }}
        title={confirm === 'post' ? '이야기를 삭제할까요?' : '댓글을 삭제할까요?'}
        description={
          confirm === 'post'
            ? '댓글과 반응도 함께 삭제돼요. 삭제한 글은 복구할 수 없어요.'
            : '답글은 남겨두고 댓글 내용만 삭제해요.'
        }
        busy={busy}
        error={actionError}
        onConfirm={() => void remove()}
      />
    </article>
  )
}
