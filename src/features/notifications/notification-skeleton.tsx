export function NotificationSkeleton({label='알림을 불러오는 중…'}:{label?:string}) {
  return <div role="status" aria-label={label}><span className="sr-only">{label}</span><div aria-hidden="true" className="divide-y divide-border/70">{Array.from({length:5},(_,i)=><div key={i} className="flex gap-3 py-4 motion-safe:animate-pulse"><div className="size-10 shrink-0 rounded-lg bg-secondary"/><div className="flex-1 space-y-3"><div className="h-4 w-3/4 rounded bg-secondary"/><div className="h-3 w-full rounded bg-secondary/60"/><div className="h-3 w-20 rounded bg-secondary/60"/></div></div>)}</div></div>
}
