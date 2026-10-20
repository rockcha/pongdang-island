import {useCallback,useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {GameLeaveGuard} from './game-leave-guard'
import {useGameModalBack} from './use-game-modal-back'
import './game-modal.css'

/** The board remains mounted while moving between the menu and the top layer. */
export function GameModal({open,title,active,practice,onExit,onPause,children,showHeader=true,busy=false,exitDescription,onContainer,modeLabel,headerActions,headerClassName=''}:{open:boolean;title:string;active:boolean;practice:boolean;onExit:()=>void|Promise<void>;onPause?:(paused:boolean)=>void;children:ReactNode|((exit:()=>void)=>ReactNode);showHeader?:boolean;busy?:boolean;exitDescription?:string;onContainer?:(container:HTMLDialogElement|null)=>void;modeLabel?:string;headerActions?:ReactNode;headerClassName?:string}){
 const dialog=useRef<HTMLDialogElement>(null)
 const [container,setContainer]=useState<HTMLDialogElement|null>(null),[confirm,setConfirm]=useState(false),[leaving,setLeaving]=useState(false),[error,setError]=useState('')
 const attach=useCallback((node:HTMLDialogElement|null)=>{dialog.current=node;setContainer(node)},[])
 useEffect(()=>{onContainer?.(container)},[container,onContainer])
 const requestExit=()=>{if(busy||leaving)return;if(active){onPause?.(true);setConfirm(true)}else void leave()}
 const goBack=useGameModalBack(open,requestExit,active||busy||leaving)
 async function leave(){
  if(leaving||busy)return
  setLeaving(true);setError('')
  try{await onExit();setConfirm(false)}catch{setError('종료 처리에 실패했어요. 다시 시도해주세요.');setConfirm(true)}finally{setLeaving(false)}
 }
 useEffect(()=>{
  const node=dialog.current;if(!node)return
  node.dataset.gameActive=String(open)
  if(!open){node.setAttribute('open','');return}
  if(node.open)node.close();node.showModal()
  return()=>{if(node.open)node.close()}
 },[open])
 return <dialog ref={attach} aria-label={title} onCancel={event=>{event.preventDefault();if(confirm){if(!leaving&&!busy){setConfirm(false);onPause?.(false)}}else if(open)requestExit()}} className={open?'arcade-game-modal':'arcade-game-inline'}>
  <GameLeaveGuard active={open&&(active||busy||leaving)} practice={practice} description={exitDescription} portalContainer={container} onBeforeLeave={onExit}/>
  {open&&showHeader&&<header className={`flex h-12 shrink-0 items-center gap-2 border-b px-3 ${headerClassName}`}><div className="flex min-w-0 flex-1 items-center gap-2"><span className="shrink-0 text-xs opacity-65">{modeLabel??(practice?'연습':'실전')}</span><span aria-hidden="true" className="opacity-30">·</span><h2 className="truncate text-sm">{title}</h2></div>{headerActions}<Button variant="ghost" className="min-h-10 shrink-0 px-3 text-sm" aria-label="게임 나가기" disabled={busy||leaving} onClick={()=>active?requestExit():goBack()}>나가기</Button></header>}
  <div className="game-modal-content">{typeof children==='function'?children(requestExit):children}</div>
  <ConfirmDialog open={confirm} portalContainer={container} onOpenChange={value=>{if(!leaving&&!busy){setConfirm(value);if(!value)onPause?.(false)}}} title="게임을 나가시겠습니까?" description={exitDescription??(practice?'나가면 현재 연습이 종료되고 시작 화면으로 돌아가요.':'완료한 라운드의 보상만 정산돼요. 참가비는 반환되지 않아요.')} confirmLabel="나가기" cancelLabel="취소" busy={busy||leaving} error={error} onConfirm={()=>void leave()}/>
 </dialog>
}
