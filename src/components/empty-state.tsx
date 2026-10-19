import type {ReactNode} from 'react'
import {appArt} from './app-art'

export function EmptyState({children,className='py-10'}:{children:ReactNode;className?:string}){
 return <div className={`flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground ${className}`}><appArt.empty className="size-14"/><div className="space-y-1">{children}</div></div>
}
