import { useState } from 'react'
import { Check, Clock3, Heart, Utensils, LockKeyhole } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { petJobs, PET_JOB_TIERS, petJobDuration, type PetJobId } from './pet-catalog'
import type { PreviewPet } from './pet-preview-model'
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
}: Props) {
  const [tier, setTier] = useState<number>(() => active && active.level >= 4 ? 4 : active && active.level >= 2 ? 2 : 0)
  const [showOptions, setShowOptions] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const employed = pets.find((p) => p.job),
    run = employed?.job,
    job = petJobs.find((j) => j.id === run?.id),
    done = !!run && run.endsAt <= now
  const progress = run
    ? Math.max(
        0,
        Math.min(100, Math.floor(((now - run.startedAt) / (run.endsAt - run.startedAt)) * 100)),
      )
    : 0
  const eligible = !!active && active.fullness >= 80 && active.affection >= 80
  return (
    <section className="pet-jobs-panel" aria-label="펫 아르바이트">
      {employed && run && job ? (!showOptions && (
        <>
          <article className={`pet-work-card ${done ? 'is-done' : ''}`}>
            <header className="pet-work-heading">
              <div className="pet-work-art">
                <PetJobArtwork jobId={job.id} />
                <img
                  className="pet-work-companion"
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
          </article>
          <p className="pet-work-hint">
            {done
              ? '보상을 받으면 다음 알바를 보낼 수 있어요.'
              : `${employed.name}이 돌아오면 다시 보낼 수 있어요.`}
          </p>
        </>
      )) : (
        <div className="pet-job-intro">
          <h3>오늘은 어디로 가볼까요?</h3>
          {active ? (
            <>
              <p>{active.name} <span className="pet-level-badge">+{active.level}</span> · 열려 있는 알바 {petJobs.filter(j => j.requiredLevel <= active.level).length}개</p>
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
              함께할 친구를 먼저 꺼내 주세요. <button onClick={onChoosePet}>펫 고르기</button>
            </p>
          )}
        </div>
      )}
      {run && <button onClick={() => setShowOptions(!showOptions)}>{showOptions ? '근무 현황 보기' : '알바 목록 보기'}</button>}
      {(!run || showOptions) && <div className="pet-job-options">
        <div className="pet-job-tiers" role="group" aria-label="알바 해금 단계">
          {PET_JOB_TIERS.map(level => <button key={level} aria-pressed={tier === level} onClick={() => setTier(level)}>{level === 0 ? '기본' : `+${level}`}{(!active || active.level < level) && level > 0 && <LockKeyhole size={11}/>}</button>)}
        </div>
        {active && active.level < tier && !run && <p className="pet-job-tier-hint">+{tier} 강화하면 열려요. <button onClick={onEnhance ?? onCare}>강화하러 가기</button></p>}
        {petJobs
          .filter((j) => j.requiredLevel === tier)
          .map((j) => (
            <article className="pet-job-option" key={j.id}>
              <div className="pet-job-thumb">
                <PetJobArtwork jobId={j.id} />
              </div>
              <div className="pet-job-option-copy">
                <strong>{j.name}</strong>
                <div className="pet-job-option-meta">
                  <span>
                    <Clock3 size={11} />
                    {petJobDuration(j.minutes)}
                  </span>
                  <span className="pet-job-meta-dot">·</span>
                  <PetGold value={`${j.min.toLocaleString()}~${j.max.toLocaleString()}`} />
                </div>
              </div>
              {!run && (
                <button
                  disabled={busy || !eligible || !active || active.level < j.requiredLevel}
                  onClick={() => onStart(j.id)}
                  aria-label={active && active.level < j.requiredLevel ? `${j.name} +${j.requiredLevel} 강화 필요` : `${j.name} 보내기`}
                >
                  {active && active.level < j.requiredLevel ? `+${j.requiredLevel} 필요` : '보내기'}
                </button>
              )}
            </article>
          ))}
      </div>}
      <button className="pet-job-guide" onClick={() => setGuideOpen(true)}>알바 안내</button>
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}><DialogContent>
        <DialogTitle>알바 안내</DialogTitle>
        <DialogDescription>출발할 때 포만도와 애정이 모두 80 이상이어야 해요. 한 번에 한 마리만 보낼 수 있어요.
          강화 +0, +2, +4에서 알바가 세 개씩 열려요. 이전 단계의 알바도 계속 보낼 수 있어요.
          근무 중과 미접속 중에도 10분마다 포만도·애정이 1씩 줄지만, 출발한 알바는 끝까지 마쳐요.
        </DialogDescription>
      </DialogContent></Dialog>
    </section>
  )
}
