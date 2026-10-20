import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { randomId } from '@/lib/random-id'
import { boardAction, boardError, removeBoardImages, uploadBoardImage, type BoardPost } from './api'

export function BoardEditor({
  post,
  onClose,
  onSaved,
}: {
  post?: BoardPost
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const { session } = useAuth()
  const [id] = useState(() => post?.id ?? randomId()),
    [title, setTitle] = useState(post?.title ?? ''),
    [body, setBody] = useState(post?.body ?? '')
  const [images, setImages] = useState(post?.images ?? []),
    [urls, setUrls] = useState(post?.urls ?? {}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [discard, setDiscard] = useState(false)
  const lock = useRef(false),
    uploaded = useRef<string[]>([]),
    blobs = useRef<string[]>([])
  useEffect(
    () => () => {
      blobs.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )
  const dirty =
    title !== (post?.title ?? '') ||
    body !== (post?.body ?? '') ||
    images.join() !== (post?.images ?? []).join()
  function close() {
    if (lock.current) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function abandon() {
    try {
      await removeBoardImages(uploaded.current)
    } catch {
      /* Unreferenced drafts can be cleaned up later. */
    }
    onClose()
  }
  async function upload(files: File[]) {
    if (lock.current || !session) return
    if (images.length + files.length > 3) {
      setError('사진은 최대 3장까지 첨부할 수 있어요.')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      for (const file of files) {
        const image = await uploadBoardImage(session.user.id, id, file)
        uploaded.current.push(image.path)
        blobs.current.push(image.url)
        setImages((previous) => [...previous, image.path])
        setUrls((previous) => ({ ...previous, [image.path]: image.url }))
      }
    } catch (cause) {
      setError(boardError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (lock.current || !title.trim() || !body.trim()) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await boardAction('save', { post_id: id, title: title.trim(), body: body.trim(), images })
      const unused = [...(post?.images ?? []), ...uploaded.current].filter(
        (path) => !images.includes(path),
      )
      void removeBoardImages(unused).catch(() => {})
      onSaved(id)
    } catch (cause) {
      setError(boardError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="bottom-0 top-auto left-0 flex max-h-[92dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-4 overflow-hidden rounded-t-xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        >
          <DialogHeader className="shrink-0 pr-7">
            <DialogTitle>{post ? '이야기 수정' : '이야기 쓰기'}</DialogTitle>
            <DialogDescription>퐁당섬의 하루를 편하게 나눠주세요.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-col gap-4">
            <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain">
              <Input
                aria-label="게시글 제목"
                placeholder="제목"
                maxLength={80}
                value={title}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-12 bg-secondary/10 text-base focus-visible:border-primary/60 focus-visible:bg-secondary/20 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/20"
                required
              />
              <textarea
                aria-label="게시글 내용"
                placeholder="어떤 이야기를 나누고 싶나요?"
                maxLength={5000}
                value={body}
                disabled={busy}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-48 w-full resize-y rounded-lg border border-border bg-secondary/10 p-3 text-base leading-7 outline-none transition-colors focus-visible:border-primary/60 focus-visible:bg-secondary/20 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/20"
                required
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-secondary">
                  <ImagePlus className="size-4" />
                  사진 {images.length}/3
                  <input
                    type="file"
                    aria-label="게시글 사진 첨부"
                    className="sr-only"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy || images.length >= 3}
                    onChange={(e) => {
                      void upload(Array.from(e.target.files ?? []))
                      e.target.value = ''
                    }}
                  />
                </label>
                <span>{body.length.toLocaleString()} / 5,000</span>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((path, i) => (
                    <div key={path} className="relative">
                      <img
                        src={urls[path]}
                        alt={`첨부 사진 ${i + 1}`}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        aria-label={`사진 ${i + 1} 삭제`}
                        disabled={busy}
                        className="absolute right-1 top-1 size-8"
                        onClick={() => setImages((previous) => previous.filter((p) => p !== path))}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="min-h-12 w-full shrink-0"
              disabled={busy || !title.trim() || !body.trim()}
            >
              {busy ? '저장하는 중…' : post ? '수정하기' : '게시하기'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        illustration="caution"
        open={discard}
        onOpenChange={setDiscard}
        title="작성을 그만둘까요?"
        description="저장하지 않은 내용은 사라져요."
        onConfirm={() => void abandon()}
      />
    </>
  )
}
