import {Link} from 'react-router'
import type {ReactNode} from 'react'

/** Keep the identity's level trigger outside the navigation link. */
export function PlayerIdentityLink({to,label,title,className,children,onClick,state}:{to:string;label:string;title?:string;className?:string;children:ReactNode;onClick?:()=>void;state?:unknown}){
 return <div className={`relative ${className??''}`}>
  <Link to={to} state={state} aria-label={label} title={title} onClick={onClick} className="absolute inset-0 z-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"/>
  <div className="pointer-events-none contents">{children}</div>
 </div>
}

export function PlayerIdentityChoice({label,selected,disabled,className,children,onClick}:{label:string;selected:boolean;disabled?:boolean;className?:string;children:ReactNode;onClick:()=>void}){
 return <div className={`relative ${className??''}`}>
  <button type="button" aria-label={label} aria-pressed={selected} disabled={disabled} onClick={onClick} className="absolute inset-0 z-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default"/>
  <div className="pointer-events-none contents">{children}</div>
 </div>
}
