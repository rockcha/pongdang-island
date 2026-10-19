import {useEffect,useState} from 'react'
import {fishingBannerPath} from '@/features/regions/fishing-banner'
import {fishingEnvironment} from './fishing-environment'

const pending=new Map<string,Promise<void>>()
export function preloadSceneImage(src:string){
 let task=pending.get(src)
 if(!task){
  task=new Promise<void>((resolve,reject)=>{
   const image=new Image()
   image.onload=()=>{void (image.decode?.()??Promise.resolve()).catch(()=>{}).then(resolve)}
   image.onerror=()=>{pending.delete(src);reject(new Error('IMAGE_LOAD_FAILED'))}
   image.src=src
  })
  pending.set(src,task)
 }
 return task
}
export function useFishingSceneImages(regionId:string){
 const [settled,setSettled]=useState('')
 useEffect(()=>{
  let active=true
  const theme=fishingEnvironment(regionId),banner=fishingBannerPath(regionId)
  const sources=[theme.frontSrc,theme.platformSrc??theme.platformFallbackSrc,...(banner?[banner]:[])]
  const finish=()=>{if(active)setSettled(regionId)}
  // A slow asset must not trap the player behind a permanent loading screen.
  const timeout=setTimeout(finish,8000)
  void Promise.allSettled(sources.map(preloadSceneImage)).then(()=>{clearTimeout(timeout);finish()})
  void preloadSceneImage(theme.src).catch(()=>{})
  return()=>{active=false;clearTimeout(timeout)}
 },[regionId])
 return settled===regionId
}
