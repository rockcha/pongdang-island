import { useState, type ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'
import { Button } from './ui/button'

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; retryable?:boolean }
export function LandscapeImage(props: Props) {
  return <ImageContent key={props.src} {...props}/>
}
function ImageContent({ className = '', retryable=true, ...props }: Props) {
  const [status, setStatus] = useState<'loading'|'ready'|'failed'>('loading')
  const [attempt, setAttempt] = useState(0)
  return <>
    {status === 'loading' && <div role="status" aria-label="이미지를 불러오는 중" className="absolute inset-0 bg-secondary motion-safe:animate-pulse"/>}
    {status === 'failed' ? <div className="absolute inset-0 flex items-start justify-end gap-2 bg-secondary p-3 text-foreground"><ImageOff aria-hidden="true" className="mt-2 size-4"/>{retryable&&<Button variant="outline" size="sm" className="relative z-20" onClick={() => {setStatus('loading');setAttempt(value => value+1)}}>이미지 다시 시도</Button>}</div> :
      <img {...props} key={attempt} className={`${className} transition-opacity duration-150 motion-reduce:transition-none ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} ref={image => {if(image?.complete && image.naturalWidth > 0)setStatus('ready')}} onLoad={() => setStatus('ready')} onError={() => setStatus('failed')}/>}
  </>
}
