import { useRef, useState } from 'react'
import { Menu } from '@base-ui/react/menu'
import { LogOut, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getNickname, useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { createClient } from '@/lib/client'
import { PlayerAvatar } from './player-avatar'

export function AvatarMenu() {
  const { session } = useAuth()
  const { profile } = useSocial()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)

  async function logout() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    try {
      const { error } = await createClient().auth.signOut({ scope: 'local' })
      if (error) throw error
      navigate('/login', { replace: true })
    } catch {
      toast.error('로그아웃에 실패했어요. 다시 시도해주세요.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <Menu.Root>
    <Menu.Trigger aria-label="내 계정 메뉴" disabled={busy} className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
      <PlayerAvatar nickname={getNickname(session)} path={profile?.avatar_path} />
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Positioner align="end" sideOffset={8} className="z-50">
        <Menu.Popup className="min-w-40 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
          <Menu.LinkItem render={<Link to="/profile" />} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none data-highlighted:bg-accent">
            <UserRound className="size-4" />마이페이지
          </Menu.LinkItem>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item disabled={busy} onClick={() => void logout()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-destructive outline-none data-highlighted:bg-accent data-disabled:opacity-50">
            <LogOut className="size-4" />로그아웃
          </Menu.Item>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>
}
