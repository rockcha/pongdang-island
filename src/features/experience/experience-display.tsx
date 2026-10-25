import {useExperience} from './experience-provider'
import {LevelTag,LevelInsigniaGallery} from './level-insignia'

export function LevelBadge(){
 const experience=useExperience()
 if(!experience)return null
 return <LevelTag level={experience.state?.level} xp={experience.state??undefined} loading={experience.loading} className="size-9" ariaLabel={experience.state?`레벨 ${experience.state.level} 확인`:'레벨 정보 확인'}/>
}
export function ExperienceProgress(){
 const experience=useExperience()
 if(!experience)return null
 const {state,loading,error,refresh}=experience
 return <div aria-label="나의 레벨과 경험치" className="mx-4 mb-5 rounded-xl border border-primary/15 bg-secondary/30 p-4 text-left">
  <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5"><LevelTag level={state?.level} xp={state??undefined} loading={loading} ariaLabel={state?`현재 레벨 ${state.level} 확인`:'현재 레벨 확인 중'}/>{state&&<span className="text-sm font-medium tabular-nums text-primary">Lv.{state.level}</span>}</div><span className="text-[11px] tabular-nums text-muted-foreground">{state?`${state.currentXp.toLocaleString('ko-KR')} / ${state.nextLevelXp.toLocaleString('ko-KR')} XP`:'경험치를 불러오는 중…'}</span></div>
  {state&&<><div role="progressbar" aria-label="다음 레벨까지 경험치" aria-valuemin={0} aria-valuemax={state.nextLevelXp} aria-valuenow={state.currentXp} className="my-2 h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary/65 motion-safe:transition-[width]" style={{width:`${100*state.currentXp/state.nextLevelXp}%`}}/></div><p className="text-[11px] leading-5 text-muted-foreground">다음 레벨까지 {(state.nextLevelXp-state.currentXp).toLocaleString('ko-KR')} XP</p></>}
  {error&&<button type="button" onClick={refresh} className="mt-2 min-h-9 text-xs text-primary underline">경험치를 불러오지 못했어요. 다시 확인</button>}
  {state&&<LevelInsigniaGallery level={state.level}/>}
  <details className="mt-3 border-t border-primary/10 pt-2 text-[11px] text-muted-foreground"><summary className="cursor-pointer py-1">경험치는 어떻게 쌓이나요?</summary><p className="mt-1 leading-5">직접 낚시: 일반 10 · 희귀 30 · 특급 100 · 신화 400 XP. 쓰레기는 절반, 실패는 2 XP를 얻어요. 지도 조각·유물도 해당 등급의 경험치를 얻어요. 통발·어선은 수령한 개체마다 직접 낚시의 30%를 얻어요.</p><p className="mt-2 leading-5">기존 기록은 직접 낚시 1회당 15 XP, 통발·어선 수령 개체당 6 XP로 한 번 반영했어요. 다음 레벨 경험치는 100부터 레벨마다 80씩 늘어나요. 레벨업 보상은 달성한 레벨 기준 2~10레벨 100골드, 11~20레벨 200골드처럼 10레벨 구간마다 100골드씩 늘어나며 보관함에 도착해요.</p></details>
 </div>
}
