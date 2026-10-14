import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaStatus() {
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) { console.error('서비스 워커 등록 실패:', error) },
  })

  useEffect(() => {
    if (offlineReady) toast.success('오프라인에서도 퐁당섬을 열 수 있어요.', { id: 'pwa-offline' })
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
