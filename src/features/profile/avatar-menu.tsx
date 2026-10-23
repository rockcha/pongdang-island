import {appArt} from '@/components/app-art'
import { useEffect,useRef, useState } from 'react'
import { Menu } from '@base-ui/react/menu'
import {UserRound,Settings,Download,LogOut,RefreshCw} from 'lucide-react'
import {OPEN_PWA_UPDATE_MENU,requestPwaUpdate,usePwaUpdate} from '@/features/pwa/update-state'

import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getNickname, useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { createClient } from '@/lib/client'
import { PlayerAvatar } from './player-avatar'
import {useExperience} from '@/features/experience/experience-provider'
import {AvatarLevelBadge} from '@/features/experience/player-level'

const accountMenuItem='flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[13px] outline-none transition-colors data-highlighted:bg-secondary/70'

export function AvatarMenu() {
  const { session } = useAuth()
  const { profile } = useSocial()
  const experience=useExperience()
  const update=usePwaUpdate()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [open,setOpen]=useState(false)
  const trigger=useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    const show=()=>{if(!busy){trigger.current?.focus();setOpen(true)}}
    window.addEventListener(OPEN_PWA_UPDATE_MENU,show)
    return()=>window.removeEventListener(OPEN_PWA_UPDATE_MENU,show)
  },[busy])

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

  return <Menu.Root open={open} onOpenChange={setOpen}>
    <span className="relative inline-flex shrink-0"><Menu.Trigger ref={trigger} aria-label={update.available?'내 계정 메뉴, 새 업데이트 있음':'내 계정 메뉴'} disabled={busy} className="relative flex size-10 min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
      <PlayerAvatar nickname={getNickname(session)} path={profile?.avatar_path} className="size-9" />
      {update.available&&<span aria-hidden="true" className="pointer-events-none absolute right-0 top-0 flex size-2.5"><span className="absolute size-full rounded-full bg-primary/40 motion-safe:animate-ping"/><span className="relative size-2.5 rounded-full border border-background bg-primary"/></span>}
    </Menu.Trigger>{experience?.state&&<AvatarLevelBadge level={experience.state.level} xp={experience.state} levelProgress={experience.state.currentXp/experience.state.nextLevelXp}/>}</span>
    <Menu.Portal>
      <Menu.Positioner align="end" sideOffset={8} collisionPadding={12} className="z-50">
        <Menu.Popup className="w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-[0_12px_36px_-12px_rgba(70,42,21,0.25)] outline-none">
          <div className="mb-1.5 flex min-w-0 items-center gap-2 rounded-xl bg-secondary/35 px-2.5 py-3">
            <PlayerAvatar nickname={getNickname(session)} path={profile?.avatar_path} level={experience?.state?.level} levelProgress={experience?.state?experience.state.currentXp/experience.state.nextLevelXp:undefined} className="size-9 shrink-0"/>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{getNickname(session)||profile?.nickname||'모험가'}</p>{profile?.equipped_title&&<p className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-primary"><appArt.title className="size-3.5 shrink-0"/><span className="truncate">{profile.equipped_title}</span></p>}</div>
          </div>
          <Menu.LinkItem onClick={()=>setOpen(false)} render={<Link to="/profile" />} className={accountMenuItem}>
            <UserRound aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75}/>마이페이지
          </Menu.LinkItem>
          <Menu.LinkItem onClick={()=>setOpen(false)} render={<Link to="/profile/settings" />} className={accountMenuItem}>
            <Settings aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75}/>설정
          </Menu.LinkItem>
          <Menu.LinkItem onClick={()=>setOpen(false)} render={<Link to="/download" />} className={accountMenuItem}><Download aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75}/>다운로드</Menu.LinkItem>
          <Menu.Item disabled={busy||update.applying||!update.available} onClick={()=>{requestPwaUpdate();setOpen(false)}} className={`${accountMenuItem} text-primary data-disabled:text-muted-foreground/45`}><RefreshCw aria-hidden="true" className={`size-4 shrink-0 ${update.applying?'motion-safe:animate-spin':''}`} strokeWidth={1.75}/>{update.applying?'업데이트 중…':'지금 업데이트'}{update.available&&<span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-primary"/>}</Menu.Item>
          <Menu.Separator className="mx-2 my-1.5 h-px bg-border/60" />
          <Menu.Item disabled={busy} onClick={() => void logout()} className={`${accountMenuItem} text-destructive data-highlighted:bg-destructive/5 data-disabled:opacity-50`}>
            <LogOut aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75}/>로그아웃
          </Menu.Item>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>
}

