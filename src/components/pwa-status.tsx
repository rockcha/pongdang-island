import { useEffect,useRef,useState } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {watchPwaUpdates} from '@/features/pwa/update-check'
import {usePwaUpdateBlocked} from '@/features/pwa/update-blockers'
import {useSocial} from '@/features/social/social-provider'

export function PwaStatus() {
  const blocked=usePwaUpdateBlocked()
  const {owner,unread,loading,error}=useSocial()
  const previousNotice=useRef<{owner:string;count:number}|null>(null)
  const [acknowledged,setAcknowledged]=useState(false)
  useEffect(()=>{
    if(!owner){previousNotice.current=null;setAcknowledged(false);return}
    if(loading||error)return
    const count=unread.notice??0,previous=previousNotice.current
    if(previous?.owner!==owner||count>0)setAcknowledged(false)
    else if(previous.count>0&&count===0)setAcknowledged(true)
    previousNotice.current={owner,count}
  },[owner,unread.notice,loading,error])
  const [registration,setRegistration]=useState<ServiceWorkerRegistration>()
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url,value){setRegistration(value)},
    onRegisterError(error) { console.error('서비스 워커 등록 실패:', error) },
  })
  useEffect(()=>{if(registration)return watchPwaUpdates(registration)},[registration])

  useEffect(() => {
    if (offlineReady) toast.success('퐁당섬의 기본 화면을 저장했어요. 게임 이용에는 인터넷 연결이 필요해요.', { id: 'pwa-offline' })
  }, [offlineReady])

  useEffect(() => {
    if (!needRefresh) return
    if(!acknowledged||loading||error||!owner||(unread.notice??0)>0){
      toast.info('퐁당섬에 새 업데이트가 있어요.',{id:'pwa-update',description:'위쪽 공지를 확인해 갈색 점이 사라지면 자동으로 적용해요.'})
      return
    }
    if(blocked){
      toast.info('새 업데이트를 준비했어요.',{id:'pwa-update',description:'플레이가 끝나면 자동으로 적용해요.'})
      return
    }
    toast.info('퐁당섬을 업데이트하고 있어요.',{id:'pwa-update',duration:Infinity,description:'잠시 후 새 버전으로 다시 열려요.'})
    const timer=window.setTimeout(()=>{void updateServiceWorker(true).catch(()=>{
      toast.error('업데이트를 적용하지 못했어요.',{id:'pwa-update',description:'연결을 확인하고 앱을 다시 열어주세요.'})
    })},1500)
    return()=>window.clearTimeout(timer)
  }, [needRefresh, updateServiceWorker,blocked,acknowledged,owner,unread.notice,loading,error])

  return null
}
