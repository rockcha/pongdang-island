import {appArt} from '@/components/app-art'

export function FarmPage(){
 return <section aria-labelledby="farm-title" className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
  <appArt.farm className="mb-5 size-24"/>
  <h1 id="farm-title" className="text-lg font-medium text-primary">농장</h1>
  <span className="mt-3 rounded-full bg-secondary px-3 py-1 text-xs text-primary">준비 중</span>
  <p className="mt-4 text-sm leading-6 text-muted-foreground">작은 텃밭을 가꿀 공간을 준비하고 있어요.</p>
 </section>
}
