import {Component,useEffect,type ReactNode} from 'react'

declare global {
  interface Window {
    pongdangStartup?: {ready():void;fail(reason:string,source?:string):void}
  }
}

export function AppReady(){
  useEffect(()=>window.pongdangStartup?.ready(),[])
  return null
}

export function AppRecovery(){
  useEffect(()=>window.pongdangStartup?.fail('render-error'),[])
  return <p role="alert">앱을 불러오지 못했어요. <button type="button" onClick={()=>window.location.reload()}>다시 시도</button></p>
}

export class AppRecoveryBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?<AppRecovery/>:this.props.children}
}
