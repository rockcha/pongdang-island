import { useEffect, useReducer, useState } from 'react'
import {
  Bath,
  BriefcaseBusiness,
  Hand,
  Camera,
  PawPrint,
  Pencil,
  Utensils,
  CircleDot,
  Heart,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useAppClock } from '@/lib/app-clock'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  petActions,
  petBaits,
  petSpecies,
  petSpeciesById,
  type PetClip,
  PET_FOOD_GAIN,
} from './pet-catalog'
import {
  petIsWorking,
  petNeedsAt,
  petPreviewReducer,
  restorePetPreview,
  type PetPreviewAction,
} from './pet-preview-model'
import { PetSprite, usePetReactionReady } from './pet-sprite'
import { PetCareEffects } from './pet-care-effects'
import { PetJobsPanel, PetGold, petJobCountdown } from './pet-jobs-panel'
import './pet-preview.css'

const careIcons = { stroke: Hand, bath: Bath, sleep: Camera, play: CircleDot }
const tiers = { pet: '펫', common: '일반', rare: '희귀', epic: '특급', mythic: '신화' }
type Command = PetPreviewAction extends infer A
  ? A extends PetPreviewAction
    ? Omit<A, 'now'>
    : never
  : never
function Gauge({
  label,
  value,
  kind,
  gain,
  amount = 1,
}: {
  label: string
  value: number
  kind: string
  gain?: string
  amount?: number
}) {
  return (
    <div className={`pet-gauge ${kind}`}>
      <div>
        <span>{label}</span>
        <strong>
          {value}
          <small> / 100</small>
        </strong>
      </div>
      <progress aria-label={label} max={100} value={value} />
      {gain && (
        <span
          key={gain}
          className={`pet-affection-pop ${kind === 'fullness' ? 'pet-fullness-pop' : ''}`}
          data-pet-affection-pop={kind === 'affection' ? true : undefined}
          data-pet-fullness-pop={kind === 'fullness' ? true : undefined}
          aria-hidden="true"
        >
          {kind === 'fullness' ? <Utensils /> : <Heart />} +{amount}
        </span>
      )}
    </div>
  )
}

export function PetPreviewBoard({ owner }: { owner: string }) {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [page, setPage] = useState(0)
  const key = `pet-house-preview:v1:${owner}`
  const [state, dispatch] = useReducer(petPreviewReducer, null, () => {
    let raw = null
    try {
      raw = localStorage.getItem(key)
    } catch {}
    return restorePetPreview(raw, Date.now())
  })
  const clock = useAppClock(),
    now = Math.max(state.lastNow, clock + state.offset)
  const [tab, setTab] = useState('home'),
    [pose, setPose] = useState<PetClip | 'auto'>('auto'),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(''),
    [selling, setSelling] = useState<string | null>(null)
  const [affectionPop, setAffectionPop] = useState<{ id: string; petId: string } | null>(null)
  const [fullnessPop, setFullnessPop] = useState<{
    id: string
    petId: string
    amount: number
  } | null>(null)
  const send = (a: Command) =>
    dispatch({ ...a, now: Date.now() + state.offset } as PetPreviewAction)
  const pets = state.pets.map((p) => petNeedsAt(p, now)),
    active = pets.find((p) => p.id === state.activeId),
    working = active ? petIsWorking(active, now) : false
  const busy = !!state.care
  const petPage = Math.min(page, Math.max(0, Math.ceil(pets.length / 4) - 1))
  const reactionReady = usePetReactionReady(active?.speciesId)
  const eatingReady = usePetReactionReady(active?.speciesId, 'eat')
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])
  useEffect(() => {
    const care = state.care
    if (!care) return
    const timer = setTimeout(
      () => {
        const at = Date.now() + state.offset,
          pet = state.pets.find((p) => p.id === care.petId)
        dispatch({ type: 'complete-care', id: care.id, now: at })
        if (at >= care.endsAt && pet) {
          const needs = petNeedsAt(pet, at)
          if (care.action === 'feed') {
            if (state.food > 0 && needs.fullness < 100)
              setFullnessPop({
                id: care.id,
                petId: care.petId,
                amount: Math.min(PET_FOOD_GAIN, 100 - needs.fullness),
              })
          } else if (needs.affection < 100) setAffectionPop({ id: care.id, petId: care.petId })
        }
      },
      Math.max(0, care.endsAt - Date.now() - state.offset),
    )
    return () => clearTimeout(timer)
  }, [state.care, state.offset, state.pets, state.food])
  useEffect(() => {
    if (!affectionPop) return
    const timer = setTimeout(() => setAffectionPop(null), 1000)
    return () => clearTimeout(timer)
  }, [affectionPop])
  useEffect(() => {
    if (!fullnessPop) return
    const timer = setTimeout(() => setFullnessPop(null), 1000)
    return () => clearTimeout(timer)
  }, [fullnessPop])
  const busyClip: PetClip = state.care?.action === 'feed' ? 'eat' : 'happy'
  const autoClip: PetClip = busy ? busyClip : active && active.fullness < 30 ? 'hungry' : 'idleA'
  return (
    <main className="pet-preview">
      <header className="pet-heading">
        <div>
          <span className="pet-eyebrow">운영자 미리보기</span>
          <h2>
            작은 친구의 집 <PawPrint size={20} />
          </h2>
        </div>
        <div className="pet-wallet">
          <small>테스트 골드</small>
          <strong>
            <PetGold value={state.gold} />
          </strong>
        </div>
      </header>
      <nav className="pet-tabs" aria-label="펫 하우스">
        <button aria-current={tab === 'home' ? 'page' : undefined} onClick={() => setTab('home')}>
          하우스
        </button>
        <button aria-current={tab === 'pets' ? 'page' : undefined} onClick={() => setTab('pets')}>
          펫 목록 <small>{pets.length}</small>
        </button>
        <button aria-current={tab === 'jobs' ? 'page' : undefined} onClick={() => setTab('jobs')}>
          아르바이트
        </button>
        <button aria-current={tab === 'shop' ? 'page' : undefined} onClick={() => setTab('shop')}>
          간식 상점
        </button>
      </nav>
      {tab === 'home' && (
        <section className="pet-home">
          <div className="pet-stage">
            {active && !working ? (
              <>
                <span className="pet-grade">펫</span>
                <PetSprite
                  key={active.id}
                  speciesId={active.speciesId}
                  clip={busy ? busyClip : pose === 'auto' ? autoClip : pose}
                  label={`${active.name} ${busy ? (busyClip === 'eat' ? '먹기' : '만족') : autoClip === 'hungry' ? '배고픔' : '대기'} 애니메이션`}
                />
                {state.care && (
                  <PetCareEffects
                    key={state.care.id}
                    action={state.care.action}
                    speciesId={active.speciesId}
                  />
                )}
                <div className="pet-stage-caption">
                  {busy
                    ? state.care?.action === 'feed'
                      ? '오물오물 · 맛있게 먹는 중이에요'
                      : `${petActions.find((a) => a.id === state.care?.action)?.label} · 기분이 좋아져요`
                    : ''}
                </div>
              </>
            ) : (
              <div className="pet-away">
                <BriefcaseBusiness size={38} />
                <strong>
                  {working ? `${active?.name}의 알바 시간` : '어떤 친구와 함께할까요?'}
                </strong>
                <p>
                  {working && active?.job
                    ? `${petJobCountdown(active.job.endsAt, now)} 후 돌아와요`
                    : '펫 목록에서 한 마리를 꺼내 주세요.'}
                </p>
                <button onClick={() => setTab(working ? 'jobs' : 'pets')}>
                  {working ? '알바 확인' : '펫 고르기'}
                </button>
              </div>
            )}
          </div>
          {active && (
            <div className="pet-care-panel">
              <div className="pet-name">
                <div>
                  <h3>{active.name}</h3>
                  <p>{petSpeciesById(active.speciesId).name}</p>
                </div>
                <button
                  aria-label="펫 이름 바꾸기"
                  disabled={busy}
                  onClick={() => {
                    setName(active.name)
                    setEditing(true)
                  }}
                >
                  <Pencil size={15} />
                </button>
              </div>
              <div className="pet-gauges">
                <Gauge
                  label="포만도"
                  value={active.fullness}
                  kind="fullness"
                  gain={!busy && fullnessPop?.petId === active.id ? fullnessPop.id : undefined}
                  amount={fullnessPop?.amount}
                />
                <Gauge
                  label="애정"
                  value={active.affection}
                  kind="affection"
                  gain={!busy && affectionPop?.petId === active.id ? affectionPop.id : undefined}
                />
              </div>
              <div className="pet-care-buttons">
                {petActions.map((a) => {
                  const Icon = careIcons[a.id]
                  return (
                    <button
                      key={a.id}
                      disabled={busy || working || !reactionReady}
                      onClick={() => {
                        setPose('auto')
                        setAffectionPop(null)
                        setFullnessPop(null)
                        send({ type: 'care', action: a.id, id: crypto.randomUUID() })
                      }}
                    >
                      <Icon size={22} />
                      <span>{a.label}</span>
                    </button>
                  )
                })}
              </div>
              <button
                className="pet-feed"
                disabled={busy || working || !state.food || active.fullness === 100 || !eatingReady}
                onClick={() => {
                  setPose('auto')
                  setAffectionPop(null)
                  setFullnessPop(null)
                  send({ type: 'feed', id: crypto.randomUUID() })
                }}
              >
                <Utensils size={16} /> {state.care?.action === 'feed' ? '먹는 중…' : '사료 주기'}{' '}
                <span>포만도 +10 · {state.food}개 남음</span>
              </button>
            </div>
          )}
        </section>
      )}
      {tab === 'pets' && (
        <section className="pet-list">
          <p className="pet-note">
            한 번에 한 마리와 함께해요. 보관 중에도 10분마다 포만도와 애정이 1씩 줄어요.
          </p>
          <div className="pet-roster-grid">
          {pets.slice(petPage * 4, petPage * 4 + 4).map((p) => (
            <article className="pet-row" key={p.id}>
              <img src={`/pets/${p.speciesId}_v1_thumbnail.png`} alt="" />
              <div className="pet-row-copy">
                <strong>
                  {p.name} <span className="pet-inline-grade">펫</span>
                </strong>
                <small>
                  {petSpeciesById(p.speciesId).name}
                  {p.job ? (petIsWorking(p, now) ? ' · 근무 중' : ' · 알바 완료') : ''}
                </small>
                <small>
                  포만도 {p.fullness} · 애정 {p.affection}
                </small>
              </div>
              <div className="pet-row-actions">
                <button
                  disabled={busy || p.id === state.activeId}
                  onClick={() => send({ type: 'select', id: p.id })}
                >
                  {p.id === state.activeId ? '함께하는 중' : '꺼내기'}
                </button>
                <button disabled={busy || !!p.job} onClick={() => setSelling(p.id)}>
                  판매
                </button>
              </div>
            </article>
          ))}
          </div>
          <div className="pet-pagination">
            <button disabled={petPage === 0} onClick={() => setPage(petPage - 1)}>이전</button>
            <span>{petPage + 1} / {Math.max(1, Math.ceil(pets.length / 4))}</span>
            <button disabled={(petPage + 1) * 4 >= pets.length} onClick={() => setPage(petPage + 1)}>다음</button>
          </div>
          {!pets.length && (
            <p className="pet-note">친구가 없어요. 아래 테스트 도구에서 추가해 주세요.</p>
          )}
          <button disabled={busy || !active} onClick={() => send({ type: 'select', id: null })}>
            모두 쉬게 하기
          </button>
        </section>
      )}
      {tab === 'jobs' && (
        <PetJobsPanel
          pets={pets}
          active={active}
          now={now}
          busy={busy}
          onStart={(jobId) => send({ type: 'start-job', jobId, roll: Math.random() })}
          onClaim={(id) => send({ type: 'claim-job', id })}
          onChoosePet={() => setTab('pets')}
          onCare={() => setTab('home')}
        />
      )}
      {tab === 'shop' && (
        <section className="pet-list">
          <article className="pet-job">
            <div>
              <strong>든든 사료</strong>
              <p>포만도 +10 · 보유 {state.food}개</p>
            </div>
            <button disabled={busy || state.gold < 100} onClick={() => send({ type: 'buy-food' })}>
              <span className="pet-job-shop-price">
                <PetGold value={100} /> 구매
              </span>
            </button>
          </article>
          {petBaits.map((b) => (
            <article className="pet-shop-card" key={b.id}>
              <span className="pet-eyebrow">간식주머니 · 어디서나 만나는 펫</span>
              <h3>{b.name}</h3>
              <p>{b.description}</p>
              <strong>펫 {b.petBp / 100}%</strong>
              <p className="pet-note">
                일반 {b.commonBp / 100}% · 희귀 {b.rareBp / 100}% · 특급 {b.epicBp / 100}% · 신화{' '}
                {b.mythicBp / 100}%
              </p>
              <button
                disabled={busy || state.gold < b.price}
                onClick={() =>
                  send({
                    type: 'fish',
                    baitId: b.id,
                    roll: Math.random(),
                    speciesRoll: Math.random(),
                  })
                }
              >
                <span className="pet-job-shop-price">
                  <PetGold value={b.price} /> · 뽑기 테스트
                </span>
              </button>
            </article>
          ))}
          {state.lastCatch && (
            <p className="pet-catch" role="status">
              {state.lastCatch.speciesId
                ? `${petSpeciesById(state.lastCatch.speciesId).name}를 만났어요!`
                : `${tiers[state.lastCatch.kind]} 당첨`}{' '}
              · 테스트 결과
            </p>
          )}
        </section>
      )}
      <p className="pet-feedback" role="status">
        {state.notice || ' '}
      </p>
      <button className="pet-tools-trigger" onClick={() => setToolsOpen(true)}>테스트 도구</button>
      <Dialog open={toolsOpen} onOpenChange={setToolsOpen}>
      <DialogContent className="pet-tools pet-tools-dialog" aria-describedby={undefined}>
        <DialogTitle>테스트 도구</DialogTitle>
        <p>이 브라우저의 운영자 계정별로 저장되는 테스트 데이터예요.</p>
        <div className="pet-tool-buttons">
          {[10, 60, 720].map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => send({ type: 'advance', milliseconds: m * 60000 })}
            >
              {m < 60 ? `${m}분` : `${m / 60}시간`} 경과
            </button>
          ))}
          <button
            disabled={busy || !active}
            onClick={() => send({ type: 'set-needs', fullness: 20, affection: 20 })}
          >
            배고픔 20 / 20
          </button>
          <button
            disabled={busy || !active}
            onClick={() => send({ type: 'set-needs', fullness: 80, affection: 80 })}
          >
            출발선 80 / 80
          </button>
          <button
            disabled={busy || !active}
            onClick={() => send({ type: 'set-needs', fullness: 100, affection: 100 })}
          >
            만족 100 / 100
          </button>
        </div>
        <label>
          애니메이션 확인{' '}
          <select
            value={pose}
            disabled={busy}
            onChange={(e) => setPose(e.target.value as PetClip | 'auto')}
          >
            <option value="auto">자동</option>
            <option value="idleA">평온한 대기</option>
            <option value="idleB">졸린 대기</option>
            <option value="hungry">배고픈 대기</option>
            <option value="happy">만족</option>
            <option value="eat">사료 먹기</option>
          </select>
        </label>
        <div className="pet-tool-buttons">
          {petSpecies.map((p) => (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => send({ type: 'add-pet', speciesId: p.id })}
            >
              {p.name} 추가
            </button>
          ))}
        </div>
        <button
          disabled={busy}
          onClick={() => {
            setPose('auto')
            send({ type: 'reset' })
          }}
        >
          테스트 초기화
        </button>
      </DialogContent>
      </Dialog>
      {editing && active && (
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent aria-label="펫 이름 바꾸기">
            <form
              className="pet-modal"
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim() && Array.from(name.trim()).length <= 12) {
                  send({ type: 'rename', id: active.id, name })
                  setEditing(false)
                }
              }}
            >
              <DialogTitle>어떻게 불러줄까요?</DialogTitle>
              <input
                aria-label="새 이름"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <small>1~12자</small>
              <div>
                <button type="button" onClick={() => setEditing(false)}>
                  취소
                </button>
                <button type="submit">이름 저장</button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {selling && (
        <Dialog
          open={!!selling}
          onOpenChange={(open) => {
            if (!open) setSelling(null)
          }}
        >
          <DialogContent aria-label="펫 판매 확인">
            <div className="pet-modal">
              <DialogTitle>이 친구를 판매할까요?</DialogTitle>
              <DialogDescription>1,000 테스트 골드를 받아요.</DialogDescription>
              <div>
                <button onClick={() => setSelling(null)}>취소</button>
                <button
                  onClick={() => {
                    send({ type: 'sell', id: selling })
                    setSelling(null)
                  }}
                >
                  판매하기
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}
export function PetPreviewPage() {
  const { session } = useAuth()
  return session ? <PetPreviewBoard key={session.user.id} owner={session.user.id} /> : null
}
