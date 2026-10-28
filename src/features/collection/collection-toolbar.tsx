import { useState, type ReactNode } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function CollectionToolbar({
  search,
  onSearch,
  tabs,
  progress,
  chips,
  onReset,
  children,
}: {
  search: string
  onSearch: (value: string) => void
  tabs: ReactNode
  progress: ReactNode
  chips: { key: string; label: string; clear: () => void }[]
  onReset: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="shrink-0 border-b border-border/50 bg-background">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="도감 이름 검색"
            placeholder="이름으로 검색"
            maxLength={100}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="h-11 rounded-lg pl-9 pr-9 text-xs shadow-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {search && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => onSearch('')}
              className="absolute right-0 top-0 grid size-11 place-items-center rounded-lg text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button
          variant={chips.length ? 'secondary' : 'outline'}
          onClick={() => setOpen(true)}
          aria-label={chips.length ? `도감 필터 ${chips.length}개 적용 중` : '도감 필터'}
          className="h-11 gap-1.5 rounded-lg px-3 text-xs"
        >
          <SlidersHorizontal className="size-4" />
          필터{chips.length > 0 && <span className="tabular-nums">{chips.length}</span>}
        </Button>
      </div>
      {tabs}
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 px-3 pb-2 pt-1.5">
        {chips.map((chip) => (
          <button
            type="button"
            key={chip.key}
            aria-label={`${chip.label} 필터 해제`}
            onClick={chip.clear}
            className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-md bg-secondary/60 px-2 text-[10px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate">{chip.label}</span>
            <X aria-hidden="true" className="size-3 shrink-0" />
          </button>
        ))}
        {progress}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="notification-sheet bottom-0 top-auto w-full max-w-none translate-y-0 gap-0 rounded-b-none rounded-t-2xl p-0 sm:bottom-auto sm:top-1/2 sm:max-w-md sm:-translate-y-1/2 sm:rounded-2xl">
          <DialogHeader className="border-b border-border/60 px-4 py-4 pr-12">
            <DialogTitle className="text-sm">도감 필터</DialogTitle>
            <DialogDescription className="text-xs">원하는 조건만 골라보세요.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55dvh] space-y-5 overflow-y-auto overscroll-contain px-4 py-5">
            {children}
          </div>
          <div className="flex gap-2 border-t border-border/60 p-4">
            <Button variant="outline" className="min-h-11 flex-1 text-xs" onClick={onReset}>
              필터 초기화
            </Button>
            <Button className="min-h-11 flex-[2] text-xs" onClick={() => setOpen(false)}>
              결과 보기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
