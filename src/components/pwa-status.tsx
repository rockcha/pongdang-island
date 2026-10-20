import { useEffect,useRef,useState } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {watchPwaUpdates} from '@/features/pwa/update-check'
import {usePwaUpdateBlocked} from '@/features/pwa/update-blockers'
import {openPwaUpdateMenu,requestPwaUpdate,setPwaUpdateAvailable,setPwaUpdateApplying,usePwaUpdate} from '@/features/pwa/update-state'
import {beginPwaUpdateFeedback,clearPwaUpdateFeedback,completePwaUpdateFeedback,consumePwaUpdateCompletion} from '@/features/pwa/update-feedback'

export function PwaStatus() {
  useEffect(()=>{
    if(consumePwaUpdateCompletion())toast.success('업데이트 완료',{id:'pwa-update-complete',description:'새로운 버전의 퐁당섬으로 업데이트했어요.'})
    if(!('serviceWorker' in navigator))return
    const completed=()=>completePwaUpdateFeedback()
    navigator.serviceWorker.addEventListener('controllerchange',completed)
    return()=>navigator.serviceWorker.removeEventListener('controllerchange',completed)
  },[])
  const blocked=usePwaUpdateBlocked()
  const {request}=usePwaUpdate()
  const failedRequest=useRef<number|null>(null)
  const [registration,setRegistration]=useState<ServiceWorkerRegistration>()
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url,value){setRegistration(value)},
    onRegisterError(error) { console.error('서비스 워커 등록 실패:', error) },
  })
  useEffect(()=>{if(registration)return watchPwaUpdates(registration)},[registration])
  useEffect(()=>{
    setPwaUpdateAvailable(needRefresh)
    if(!needRefresh)failedRequest.current=null
    return()=>setPwaUpdateAvailable(false)
  },[needRefresh])

  useEffect(() => {
    if (offlineReady) toast.success('퐁당섬의 기본 화면을 저장했어요. 게임 이용에는 인터넷 연결이 필요해요.', { id: 'pwa-offline' })
  }, [offlineReady])

  useEffect(() => {
    if (!needRefresh||failedRequest.current===request) return
    if(request===0){
      toast.info(<button type="button" onClick={()=>{openPwaUpdateMenu();toast.dismiss('pwa-update')}} className="text-left outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring">퐁당섬에 새 업데이트가 있어요.</button>,{id:'pwa-update',description:'눌러서 아바타 메뉴를 열고 지금 업데이트를 선택해주세요.'})
      return
    }
    if(blocked){
      toast.info('새 업데이트를 준비했어요.',{id:'pwa-update',description:'플레이가 끝나면 자동으로 적용해요.'})
      return
    }
    toast.info('퐁당섬을 업데이트하고 있어요.',{id:'pwa-update',duration:Infinity,description:'잠시 후 새 버전으로 다시 열려요.'})
    let active=true,finished=false
    let watchdog:number|undefined
    const fail=()=>{
      if(!active||finished)return
      finished=true
      window.clearTimeout(watchdog)
      clearPwaUpdateFeedback()
      failedRequest.current=request
      setPwaUpdateApplying(false)
      toast.error('업데이트를 완료하지 못했어요.',{id:'pwa-update',duration:8000,description:'연결을 확인하고 다시 시도해 주세요.',action:{label:'다시 시도',onClick:requestPwaUpdate}})
    }
    const timer=window.setTimeout(()=>{
      setPwaUpdateApplying(true);beginPwaUpdateFeedback()
      // Resolving this promise only means SKIP_WAITING was sent, not activation.
      watchdog=window.setTimeout(fail,20000)
      void updateServiceWorker(true).catch(fail)
    },1500)
    return()=>{active=false;window.clearTimeout(timer);window.clearTimeout(watchdog)}
  }, [needRefresh, updateServiceWorker,blocked,request])

  return null
}
