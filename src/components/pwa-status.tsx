import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaStatus() {
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) { console.error('서비스 워커 등록 실패:', error) },
  })

  useEffect(() => {
    if (offlineReady) toast.success('퐁당섬의 기본 화면을 저장했어요. 게임 이용에는 인터넷 연결이 필요해요.', { id: 'pwa-offline' })
  }, [offlineReady])

  useEffect(() => {
    if (!needRefresh) return
    toast('퐁당섬의 새 버전이 준비됐어요.', {
      id: 'pwa-update', duration: Infinity,
      action: { label: '업데이트', onClick: () => { void updateServiceWorker(true) } },
    })
  }, [needRefresh, updateServiceWorker])

  return null
}
