export const titleTiers={
 1:{label:'일반',text:'text-stone-600 dark:text-stone-300',dot:'bg-stone-400'},
 2:{label:'희귀',text:'text-blue-600 dark:text-blue-300',dot:'bg-blue-500'},
 3:{label:'특급',text:'text-violet-600 dark:text-violet-300',dot:'bg-violet-500'},
 4:{label:'신화',text:'text-amber-700 dark:text-amber-300',dot:'bg-amber-500'},
} as const
export type TitleTier=keyof typeof titleTiers
export function TitleTierDot({tier}:{tier:TitleTier}){
 const grade=titleTiers[tier]??titleTiers[1]
 return <span role="img" aria-label={`${grade.label} 등급`} title={`${grade.label} 칭호`} className={`inline-block size-1.5 shrink-0 rounded-full ${grade.dot}`}/>
}
export function TitleTierLegend(){
 return <div aria-label="칭호 등급 색상 안내" className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-border/60 px-4 py-2.5 text-[10px] text-muted-foreground">{([1,2,3,4] as const).map(tier=><span key={tier} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`size-1.5 rounded-full ${titleTiers[tier].dot}`}/>{titleTiers[tier].label}</span>)}</div>
}
