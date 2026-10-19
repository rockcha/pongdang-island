import { useState, type ImgHTMLAttributes } from 'react'
import { Button } from './ui/button'

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; retryable?:boolean; placeholderClassName?:string }
export function LandscapeImage(props: Props) {
  return <ImageContent key={props.src} {...props}/>
}
function ImageContent({ className = '', retryable=true, placeholderClassName='bg-secondary motion-safe:animate-pulse', ...props }: Props) {
  const [status, setStatus] = useState<'loading'|'ready'|'failed'>('loading')
  const [attempt, setAttempt] = useState(0)
  return <>
    {status === 'loading' && <div role="status" aria-label="이미지를 불러오는 중" className={`pointer-events-none absolute inset-0 ${placeholderClassName}`}/>}
    {status === 'failed' ? <div className="absolute inset-0 bg-secondary text-foreground"><img src="/fallback-image.svg" alt={`${props.alt||'이미지'} · 이미지를 불러오지 못했어요`} className="size-full object-cover"/>{retryable&&<Button variant="outline" size="sm" className="absolute right-2 top-2 z-20 bg-background/95" onClick={() => {setStatus('loading');setAttempt(value => value+1)}}>이미지 다시 시도</Button>}</div> :
      <img {...props} key={attempt} className={`${className} transition-opacity duration-150 motion-reduce:transition-none ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} ref={image => {if(image?.complete && image.naturalWidth > 0)setStatus('ready')}} onLoad={() => setStatus('ready')} onError={() => setStatus('failed')}/>}
  </>
}
