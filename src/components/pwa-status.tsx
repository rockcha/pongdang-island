import { useEffect,useRef,useState } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {prepareLatestPwaUpdate,watchPwaUpdates} from '@/features/pwa/update-check'
import {usePwaUpdateBlocked} from '@/features/pwa/update-blockers'
import {requestPwaUpdate,setPwaUpdateAvailable,setPwaUpdateApplying,usePwaUpdate} from '@/features/pwa/update-state'
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
  const reloading=useRef(false)
  const [registration,setRegistration]=useState<ServiceWorkerRegistration>()
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onNeedReload(){
      // Multiple waiting events can attach multiple Workbox controlling listeners.
      if(reloading.current)return
      reloading.current=true
      completePwaUpdateFeedback()
      window.location.reload()
    },
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
    // Detection continues during gameplay, but both prompts and activation wait
    // until the game and its pending result have finished.
    if(blocked){
      toast.dismiss('pwa-update')
      return
    }
    if (!needRefresh||failedRequest.current===request) return
    if(request===0){
      toast.info('퐁당섬에 새 업데이트가 있어요.',{id:'pwa-update',description:'준비되면 새 버전으로 업데이트해 주세요.',action:{label:'업데이트 →',onClick:requestPwaUpdate},classNames:{actionButton:'!ml-auto shrink-0'}})
      return
    }
    toast.info('퐁당섬을 업데이트하고 있어요.',{id:'pwa-update',duration:Infinity,description:'잠시 후 새 버전으로 다시 열려요.'})
    let active=true,finished=false
    const controller=new AbortController()
    let watchdog:number|undefined
    const fail=()=>{
      if(!active||finished)return
      finished=true
      controller.abort()
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
      void (async()=>{
        if(registration)await prepareLatestPwaUpdate(registration,controller.signal)
        if(active&&!finished)await updateServiceWorker(true)
      })().catch(fail)
    },1500)
    return()=>{active=false;controller.abort();window.clearTimeout(timer);window.clearTimeout(watchdog)}
  }, [needRefresh, updateServiceWorker,blocked,request,registration])

  return null
}
