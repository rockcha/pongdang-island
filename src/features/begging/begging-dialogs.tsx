import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoldIcon } from '@/features/gold/gold-provider'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { beggingError, isBeggingRejection } from './api'
import type { BeggingDraft, BeggingPayment, BeggingRequest } from './api'
const number = (value: number) => value.toLocaleString('ko-KR')
export function BeggingCreateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (draft: BeggingDraft) => Promise<void>
}) {
  const [story, setStory] = useState(''),
    [goal, setGoal] = useState('1000'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false)
  const pending = useRef<BeggingDraft | null>(null),
    locked = useRef(false)
  const valid =
    story.trim().length > 0 &&
    story.trim().length <= 500 &&
    /^\d+$/.test(goal) &&
    Number(goal) >= 100 &&
    Number(goal) <= 1000000000
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (locked.current || !valid) return
    locked.current = true
    setBusy(true)
    setError('')
    pending.current ??= {
      operationId: crypto.randomUUID(),
      story: story.trim(),
      goalGold: Number(goal),
    }
    try {
      await onCreate(pending.current)
      pending.current = null
      setStory('')
      setUncertain(false)
      onOpenChange(false)
    } catch (cause) {
      setError(beggingError(cause))
      if (isBeggingRejection(cause)) {
        pending.current = null
        setUncertain(false)
      } else setUncertain(true)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value)
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>사연 쓰기</DialogTitle>
          <DialogDescription>필요한 골드와 사연을 이웃에게 들려주세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="begging-story" className="text-xs">
              나의 사연
            </Label>
            <textarea
              id="begging-story"
              rows={5}
              maxLength={500}
              disabled={busy || uncertain}
              value={story}
              onChange={(event) => setStory(event.target.value)}
              placeholder="어떤 일에 골드가 필요한가요?"
              required
              className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-right text-[10px] tabular-nums text-muted-foreground">
              {story.length} / 500
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="begging-goal" className="text-xs">
              목표 골드
            </Label>
            <Input
              id="begging-goal"
              type="number"
              min={100}
              max={1000000000}
              step={1}
              inputMode="numeric"
              value={goal}
              disabled={busy || uncertain}
              onChange={(event) => setGoal(event.target.value)}
              required
              className="min-h-12 rounded-xl"
            />
            <p className="text-[10px] leading-5 text-muted-foreground">
              목표에 도달하면 자동으로 마감돼요. 진행 중인 사연은 하나만 남길 수 있어요.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-xs leading-5 text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={!valid || busy}
            aria-busy={busy}
            className="min-h-12 w-full rounded-xl text-xs"
          >
            {busy ? '등록하는 중…' : uncertain ? '이전 등록 결과 확인' : '사연 등록하기'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export function BeggingSendDialog({
  post,
  gold,
  onClose,
  onSend,
}: {
  post: BeggingRequest | null
  gold: number
  onClose: () => void
  onSend: (payment: BeggingPayment) => Promise<void>
}) {
  const [amount, setAmount] = useState('100'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false)
  const pending = useRef<BeggingPayment | null>(null),
    lastId = useRef(''),
    locked = useRef(false)
  useEffect(() => {
    if (post && post.id !== lastId.current) {
      lastId.current = post.id
      setAmount('100')
      setError('')
      setUncertain(false)
      pending.current = null
    }
  }, [post])
  const valid =
    /^\d+$/.test(amount) &&
    Number(amount) >= 100 &&
    Number(amount) <= 1000000000 &&
    Number(amount) <= gold
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!post || locked.current || (!valid && !uncertain)) return
    locked.current = true
    setBusy(true)
    setError('')
    pending.current ??= {
      operationId: crypto.randomUUID(),
      requestId: post.id,
      gold: Number(amount),
    }
    try {
      await onSend(pending.current)
      pending.current = null
      setUncertain(false)
      setAmount('100')
      onClose()
    } catch (cause) {
      setError(beggingError(cause))
      if (isBeggingRejection(cause)) {
        pending.current = null
        setUncertain(false)
      } else setUncertain(true)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={post !== null}
      onOpenChange={(value) => {
        if (!value && !busy) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>골드 보내기</DialogTitle>
          <DialogDescription>마음을 전하면 경험치 2를 얻어요.</DialogDescription>
        </DialogHeader>
        {post && (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div className="flex items-center gap-2.5 rounded-xl bg-secondary/50 p-3">
              <PlayerAvatar
                nickname={post.owner.nickname}
                path={post.owner.avatarPath}
                className="size-10"
              />
              <div className="min-w-0">
                <p className="truncate text-xs">{post.owner.nickname}님에게</p>
                <p className="mt-1 line-clamp-2 break-words text-[11px] leading-5 text-muted-foreground">
                  {post.story}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="begging-gold" className="text-xs">
                보낼 골드
              </Label>
              <Input
                id="begging-gold"
                type="number"
                min={100}
                max={Math.min(gold, 1000000000)}
                step={1}
                inputMode="numeric"
                value={amount}
                disabled={busy || uncertain}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="min-h-12 rounded-xl text-lg"
              />
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={busy || uncertain}
                    aria-pressed={amount === String(value)}
                    onClick={() => setAmount(String(value))}
                    className={`min-h-10 rounded-lg border text-xs tabular-nums ${amount === String(value) ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground'}`}
                  >
                    {number(value)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-between gap-1 text-[10px] text-muted-foreground">
                <span>최소 100골드</span>
                <span>보유 {number(gold)}골드</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-3 text-xs">
              <span>보낸 뒤 받는 경험치</span>
              <span className="font-medium text-primary">+2 EXP</span>
            </div>
            {Number(amount) > gold && (
              <p className="text-xs text-destructive">보유 골드가 부족해요.</p>
            )}
            {error && (
              <p role="alert" className="text-xs leading-5 text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || (!valid && !uncertain)}
              aria-busy={busy}
              className="min-h-12 w-full gap-1.5 rounded-xl text-xs"
            >
              {busy ? (
                '보내는 중…'
              ) : uncertain ? (
                '같은 송금 결과 확인'
              ) : (
                <>
                  <GoldIcon className="size-4" />
                  {valid ? number(Number(amount)) + '골드 보내기' : '100골드 이상 입력해주세요'}
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
