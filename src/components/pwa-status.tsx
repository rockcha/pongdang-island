import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaStatus() {
  const { offlineReady: [offlineReady], needRefresh: [needRefresh,setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) { console.error('서비스 워커 등록 실패:', error) },
  })

  useEffect(() => {
    if (offlineReady) toast.success('퐁당섬의 기본 화면을 저장했어요. 게임 이용에는 인터넷 연결이 필요해요.', { id: 'pwa-offline' })
  }, [offlineReady])

  useEffect(() => {
    if (!needRefresh) return
    toast.info('퐁당섬에 새 업데이트가 있어요.', {
      id: 'pwa-update', duration: Infinity,
      description: '편한 때 업데이트하고 새 소식을 만나보세요.',
      action: { label: '업데이트', onClick: () => { void updateServiceWorker(true) } },
      cancel: { label: '나중에', onClick: () => setNeedRefresh(false) },
    })
  }, [needRefresh, updateServiceWorker,setNeedRefresh])

  return null
}
