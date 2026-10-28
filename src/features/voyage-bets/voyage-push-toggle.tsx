import { useEffect, useState } from 'react'
import { Bell, BellRing, LoaderCircle } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  currentPushDevice,
  defaultPushCategories,
  enablePush,
  needsHomeScreen,
  pushConfiguration,
  savePushCategories,
  supportsPush,
  type PushCategory,
} from '@/features/notifications/push-device'
export function VoyagePushToggle() {
  const { session } = useAuth()
  const [device, setDevice] = useState<{ registered: boolean; categories: PushCategory[] } | null>(
      null,
    ),
    [key, setKey] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const supported = supportsPush(),
    homeScreen = supported && needsHomeScreen()
  useEffect(() => {
    let alive = true
    if (supported && !homeScreen && session?.user.id)
      void Promise.all([currentPushDevice(), pushConfiguration()])
        .then(([state, config]) => {
          if (alive) {
            setDevice(state)
            setKey(config.configured ? config.publicKey : null)
          }
        })
        .catch(() => {
          if (alive) setError('기기 알림 설정을 확인하지 못했어요.')
        })
    return () => {
      alive = false
    }
  }, [session?.user.id, supported, homeScreen])
  const enabled = !!device?.registered && device.categories.includes('voyage-bets')
  async function toggle() {
    if (busy || !session?.user.id || !device) return
    setBusy(true)
    setError('')
    const categories = enabled
      ? device.categories.filter((c) => c !== 'voyage-bets')
      : [
          ...(device.registered ? device.categories : defaultPushCategories),
          'voyage-bets' as PushCategory,
        ]
    try {
      const next = device.registered
        ? await savePushCategories(categories)
        : key
          ? await enablePush(session.user.id, key, categories)
          : null
      if (next) setDevice(next)
    } catch (cause) {
      setError(String((cause as { message?: string })?.message ?? '알림 설정을 저장하지 못했어요.'))
    } finally {
      setBusy(false)
    }
  }
  const label = enabled ? '출항 알림 끄기' : '출항 알림 받기'
  const help = homeScreen
    ? '홈 화면에 설치하면 출항 알림을 받을 수 있어요.'
    : !supported
      ? '푸시를 지원하는 기기에서 출항 알림을 켤 수 있어요.'
      : enabled
        ? '출항 1시간 전 알림 켜짐'
        : '출항 1시간 전 알림 받기'
  return (
    <div className="voyage-alert-control">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="voyage-alert-button"
              aria-pressed={enabled}
              aria-label={label}
              aria-description={help}
              disabled={busy || !supported || homeScreen || !device || (!device.registered && !key)}
              onClick={() => {
                void toggle()
              }}
            />
          }
        >
          {busy ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : enabled ? (
            <BellRing size={14} />
          ) : (
            <Bell size={14} />
          )}
        </TooltipTrigger>
        <TooltipContent>{help}</TooltipContent>
      </Tooltip>
      {error && <small role="alert">{error}</small>}
    </div>
  )
}
