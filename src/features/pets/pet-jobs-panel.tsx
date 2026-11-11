import { useState } from 'react'
import { Check, Clock3, Heart, Utensils, BriefcaseBusiness } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { petJobsFor, petJobById, petJobBonus, petJobRewards, petSpeciesById, petJobDuration, PET_MAX_LEVEL, type PetJobId } from './pet-catalog'
import {petJobRunKey, type PreviewPet} from './pet-preview-model'
import { PetJobArtwork } from './pet-job-artwork'
import './pet-jobs-panel.css'

export function PetGold({ value }: { value: number | string }) {
  return (
    <span className="pet-gold">
      <img src="/currency/gold-coin-starfish.png" alt="" aria-hidden="true" />
      <span>{typeof value === 'number' ? value.toLocaleString('ko-KR') : value}</span>
      <span className="sr-only"> 골드</span>
    </span>
  )
}
const pad = (n: number) => String(n).padStart(2, '0')
export function petJobCountdown(end: number, now: number) {
  const total = Math.max(0, Math.ceil((end - now) / 1000))
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}
function returnTime(end: number, now: number) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }),
    clock = new Intl.DateTimeFormat('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    })
  return `${day.format(end) === day.format(now) ? '' : '내일 '}${clock.format(end)}`
}
type Props = {
  pets: PreviewPet[]
  active: PreviewPet | undefined
  now: number
  busy: boolean
  onStart: (id: PetJobId) => void
  onClaim: (id: string) => void
  onChoosePet: () => void
  onCare: () => void
  onEnhance?: () => void
  statusOnly?: boolean
  onOpenJobs?: () => void
  onCancel?: (id: string, runKey: string) => void
}
export function PetJobsPanel({
  pets,
  active,
  now,
  busy,
  onStart,
  onClaim,
  onChoosePet,
  onCare,
  onEnhance,
  statusOnly = false,
  onOpenJobs,
  onCancel,
}: Props) {
  const [showOptions, setShowOptions] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<{id:string;key:string;name:string}|null>(null)
  const employed = pets.find((p) => p.job),
    run = employed?.job,
    job = run ? petJobById(run.id) : undefined,
    done = !!run && run.endsAt <= now
  const progress = run
    ? Math.max(
        0,
        Math.min(100, Math.floor(((now - run.startedAt) / (run.endsAt - run.startedAt)) * 100)),
      )
    : 0
  const eligible = !!active && active.fullness >= 80 && active.affection >= 80
  return (
    <section className={`pet-jobs-panel ${statusOnly ? 'pet-job-status' : ''}`} aria-label="펫 아르바이트">
      {employed && run && job ? ((!showOptions || statusOnly) && (
        <>
          <article className={`pet-work-card ${done ? 'is-done' : ''}`}>
            <header className="pet-work-heading">
              <div className="pet-work-art">
                <span className="pet-work-job-icon"><PetJobArtwork jobId={job.id} /></span>
                <img
                  className="pet-work-portrait"
                  src={`/pets/${employed.speciesId}_v1_thumbnail.png`}
                  alt=""
                />
              </div>
              <div className="pet-work-person">
                <strong>{employed.name} <span className="pet-level-badge">+{employed.level}</span></strong>
                <p>{job.name}</p>
              </div>
              <span className="pet-work-status">
                {done ? (
                  <>
                    <Check size={11} />
                    완료
                  </>
                ) : (
                  <>
                    <span />
                    근무 중
                  </>
                )}
              </span>
            </header>
            {done ? (
              <div className="pet-work-finished">
                <strong>다녀왔어요!</strong>
                <p>{employed.name}의 알바가 끝났어요.</p>
              </div>
            ) : (
              <div className="pet-work-countdown">
                <span>돌아오기까지</span>
                <time role="timer" aria-live="off" aria-label="돌아오기까지 남은 시간">
                  {petJobCountdown(run.endsAt, now)}
                </time>
                <p>{returnTime(run.endsAt, now)} 복귀 예정</p>
              </div>
            )}
            <div className="pet-work-progress">
              <progress aria-label="알바 진행률" value={progress} max={100} />
              <span>{progress}%</span>
            </div>
            <div className="pet-work-reward">
              <span>{done ? '받을 보상' : '예상 보상'}</span>
              <strong>
                <PetGold
                  value={
                    done ? run.reward : `${(run.minReward ?? run.reward).toLocaleString()}~${(run.maxReward ?? run.reward).toLocaleString()}`
                  }
                />
              </strong>
            </div>
            {done && (
              <button
                className="pet-work-claim"
                disabled={busy}
                onClick={() => onClaim(employed.id)}
              >
                보상 받기
              </button>
            )}
            {!done && onCancel && <button className="pet-work-cancel" disabled={busy} onClick={() => setCancelTarget({id:employed.id,key:petJobRunKey(run),name:employed.name})}>알바 취소</button>}
          </article>
          {!statusOnly && <p className="pet-work-hint">
            {done
              ? '보상을 받으면 다음 알바를 보낼 수 있어요.'
              : `${employed.name}이 돌아오면 다시 보낼 수 있어요.`}
          </p>}
          {statusOnly && !done && <p className="pet-work-hint">취소하면 보상은 지급되지 않아요.</p>}
        </>
      )) : statusOnly ? (
        <div className="pet-work-empty"><BriefcaseBusiness size={30}/><h3>진행 중인 알바가 없어요</h3>{active&&<button disabled={busy} onClick={onOpenJobs}>알바 보내기</button>}</div>
      ) : (
        <div className="pet-job-intro">
          <h3>오늘은 어디로 가볼까요?</h3>
          {active ? (
            <>
              <p>{active.name} <span className="pet-level-badge">+{active.level}</span> · 전용 알바 2개</p>
              <button className="pet-job-change-pet" disabled={busy} onClick={onChoosePet}>친구 바꾸기</button>
              <div className="pet-job-specialty"><span>{'profile' in petSpeciesById(active.speciesId) ? (petSpeciesById(active.speciesId) as {profile: string}).profile : '나만의 특기'}</span><span>강화 보너스 +{petJobBonus(active.level)}%</span></div>
              <div className="pet-job-conditions" aria-label="출발 조건">
                <span className={active.fullness >= 80 ? 'is-met' : ''}>
                  <Utensils size={12} />
                  포만도 80 이상{active.fullness >= 80 && <Check size={11} />}
                </span>
                <span className={active.affection >= 80 ? 'is-met' : ''}>
                  <Heart size={12} />
                  애정 80 이상{active.affection >= 80 && <Check size={11} />}
                </span>
              </div>
              {!eligible && (
                <p className="pet-job-needs">
                  조금 더 돌봐준 뒤 출발할 수 있어요. <button onClick={onCare}>돌보러 가기</button>
                </p>
              )}
            </>
          ) : (
            <p>
              함께할 친구를 먼저 꺼내 주세요.
            </p>
          )}
        </div>
      )}
      {!statusOnly && run && <button onClick={() => setShowOptions(!showOptions)}>{showOptions ? '근무 현황 보기' : '알바 목록 보기'}</button>}
      {!statusOnly && active && (!run || showOptions) && <div className="pet-job-options">
        {petJobsFor(active.speciesId).map((j) => {
          const range = petJobRewards(j, active.level)
          return (
            <article className="pet-job-option" key={j.id}>
              <div className="pet-job-thumb">
                <PetJobArtwork jobId={j.id} />
              </div>
              <div className="pet-job-option-copy">
                <strong>{j.name}</strong>
                <p className="pet-job-description">{j.description}</p>
                <div className="pet-job-option-meta">
                  <span>
                    <Clock3 size={11} />
                    {petJobDuration(j.minutes)}
                  </span>
                  <span className="pet-job-meta-dot">·</span>
                  <PetGold value={`${range.min.toLocaleString()}~${range.max.toLocaleString()}`} />
                </div>
              </div>
              {!run && (
                <button
                  disabled={busy || !eligible}
                  onClick={() => { setShowOptions(false); onStart(j.id) }}
                  aria-label={`${j.name} 보내기`}
                >
                  보내기
                </button>
              )}
            </article>
          )})}
        {onEnhance && !run && active.level < PET_MAX_LEVEL && <button className="pet-job-guide" onClick={onEnhance}>강화로 보상 높이기</button>}
      </div>}
      <Dialog open={!!cancelTarget} onOpenChange={open => {if(!open)setCancelTarget(null)}}><DialogContent>
        <DialogTitle>알바를 취소할까요?</DialogTitle>
        <DialogDescription>{cancelTarget?.name}이 바로 돌아와요. 지금까지 일한 시간의 보상도 지급되지 않아요. 다시 출발할 때 포만도·애정 80 이상 조건을 확인해요.</DialogDescription>
        <div className="pet-work-cancel-actions"><button onClick={() => setCancelTarget(null)}>계속 근무하기</button><button disabled={busy || !run || !cancelTarget || employed?.id!==cancelTarget.id || petJobRunKey(run)!==cancelTarget.key || done} onClick={() => {if(cancelTarget){onCancel?.(cancelTarget.id,cancelTarget.key);setCancelTarget(null)}}}>취소하고 다시 고르기</button></div>
      </DialogContent></Dialog>

    </section>
  )
}
