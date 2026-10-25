import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import {OverlayDepth,useOverlayBack} from '@/components/overlay-back'
import './modal-viewport.css'

function Dialog({open,defaultOpen=false,onOpenChange,actionsRef,...props}: DialogPrimitive.Root.Props) {
  const [uncontrolled,setUncontrolled]=React.useState(defaultOpen)
  const internalActions=React.useRef<DialogPrimitive.Root.Actions|null>(null)
  const actions=actionsRef??internalActions
  const depth=useOverlayBack(open??uncontrolled,()=>actions.current?.close())
  return <OverlayDepth value={depth+1}><DialogPrimitive.Root data-slot="dialog" {...props} open={open??uncontrolled} actionsRef={actions} onOpenChange={(next,details)=>{onOpenChange?.(next,details);if(!details.isCanceled)setUncontrolled(next)}} /></OverlayDepth>
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-200 [animation-fill-mode:both] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const swipeClose = React.useRef<HTMLButtonElement>(null)
  const dragRoot = React.useRef<HTMLElement|null>(null)
  function resetDrag(){if(dragRoot.current){dragRoot.current.style.bottom='';dragRoot.current.style.transition='bottom 180ms ease-out';dragRoot.current=null}}
  const gesture = React.useRef<{x:number;y:number;target:HTMLElement}|null>(null)
  function scrollAtTop(target:HTMLElement,root:HTMLElement) {
    for(let node:HTMLElement|null=target;node;node=node.parentElement){
      if(node.scrollHeight>node.clientHeight&&node.scrollTop>0)return false
      if(node===root)break
    }
    return true
  }
  const sheet = typeof className === 'string' && className.split(/\s+/).includes('notification-sheet')
  return (
    <DialogPortal>
      <DialogOverlay />
      <div data-slot="modal-viewport">
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm",
          !sheet && "duration-150 [animation-fill-mode:both] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
          className
        )}
        {...props}
        onTouchStart={event=>{
          props.onTouchStart?.(event)
          gesture.current=null
          if(event.defaultPrevented||event.touches.length!==1)return
          const root=event.currentTarget,target=event.target as HTMLElement
          if(Math.abs(root.getBoundingClientRect().bottom-window.innerHeight)>3||!scrollAtTop(target,root))return
          if(target.closest('input,textarea,select,button,a,[role="slider"],[role="combobox"]'))return
          dragRoot.current=root;root.style.transition='none'
          gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY,target}
        }}
        onTouchMove={event=>{
          props.onTouchMove?.(event)
          if(event.touches.length!==1){gesture.current=null;resetDrag();return}
          if(!gesture.current)return
          const dx=event.touches[0].clientX-gesture.current.x,dy=event.touches[0].clientY-gesture.current.y
          if(dy < -10||Math.abs(dx)>Math.max(20,Math.abs(dy))||!scrollAtTop(gesture.current.target,event.currentTarget)){gesture.current=null;resetDrag();return}
          event.currentTarget.style.bottom=-Math.max(0,dy)+'px'
        }}
        onTouchCancel={event=>{gesture.current=null;resetDrag();props.onTouchCancel?.(event)}}
        onTouchEnd={event=>{
          props.onTouchEnd?.(event)
          const start=gesture.current;gesture.current=null;resetDrag()
          if(event.defaultPrevented||!start||!event.changedTouches.length)return
          const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y
          if(dy>72&&dy>Math.abs(dx)*1.5&&scrollAtTop(start.target,event.currentTarget))swipeClose.current?.click()
        }}
      >
        {children}
        <DialogPrimitive.Close ref={swipeClose} tabIndex={-1} aria-hidden="true" className="hidden"/>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
