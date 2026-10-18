import { useAppTheme } from '@/components/theme-provider'
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {createPortal} from 'react-dom'

function Starfish({loading=false}:{loading?:boolean}){
  return <img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" width={28} height={28} className={`size-7 shrink-0 object-contain ${loading?'animate-pulse motion-reduce:animate-none':''}`}/>
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useAppTheme()
  return typeof document==='undefined'?null:createPortal(
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <Starfish />
        ),
        info: (
          <Starfish />
        ),
        warning: (
          <Starfish />
        ),
        error: (
          <Starfish />
        ),
        loading: (
          <Starfish loading />
        ),
      }}
      style={
        {
          fontFamily: "var(--font-sans)",
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />, document.body
  )
}

export { Toaster }
