import { useState } from 'react'
import { Check, ChevronDown, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { backgroundUrl } from './api'

export function AquariumTankPicker({
  tanks,
  selectedId,
  backgrounds,
  busy,
  onSelect,
  onAdd,
  onRename,
}: {
  tanks: { id: string; name: string; background_id: string }[]
  selectedId: string
  backgrounds: { id: string; image_path: string }[]
  busy: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onRename?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            className="min-h-11 max-w-full px-2"
            disabled={busy}
            aria-label="어항 선택"
          />
        }
      >
        <span className="truncate text-sm">{tanks.find((t) => t.id === selectedId)?.name}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </DialogTrigger>
      <DialogContent className="notification-sheet bottom-0 top-auto left-0 max-w-full translate-x-0 translate-y-0 gap-4 rounded-t-xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>내 어항</DialogTitle>
          <DialogDescription>보고 싶은 어항을 골라주세요.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50dvh] space-y-2 overflow-y-auto">
          {tanks.map((tank, i) => {
            const background = backgrounds.find((b) => b.id === tank.background_id)
            return (
              <div
                key={tank.id}
                className={`flex items-center rounded-lg border border-border ${tank.id === selectedId ? 'bg-secondary' : ''}`}
              >
                <button
                  type="button"
                  key={tank.id}
                  disabled={busy}
                  aria-pressed={tank.id === selectedId}
                  onClick={() => {
                    onSelect(tank.id)
                    setOpen(false)
                  }}
                  className="flex min-h-18 min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left"
                >
                  <span className="size-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {background && (
                      <img
                        src={backgroundUrl(background.image_path)}
                        alt=""
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{tank.name}</span>
                    <span className="text-[11px] text-muted-foreground">{i + 1}번째 어항</span>
                  </span>
                  {tank.id === selectedId && <Check className="mr-2 size-4 text-primary" />}
                </button>
                {onRename && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1 min-h-11 min-w-11 shrink-0"
                    disabled={busy}
                    aria-label={`${tank.name} 이름 변경`}
                    onClick={() => {
                      setOpen(false)
                      onRename(tank.id)
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => {
            setOpen(false)
            onAdd()
          }}
        >
          <Plus className="size-4" />
          어항 추가
        </Button>
      </DialogContent>
    </Dialog>
  )
}
