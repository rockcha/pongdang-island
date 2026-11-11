import { useEffect, useReducer, useState, type CSSProperties } from 'react'
import {PetSnackShop} from './pet-snack-shop'
import {PetPurchaseQuantity} from './pet-purchase-quantity'
import {playPurchaseSound} from '@/features/gold/purchase-sound'
import { petGroundY } from './pet-draw-layout'
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
  Ellipsis,
  Check,
  Sparkles,
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
  type PetBaitId,
  PET_FOOD_GAIN,
  PET_FOOD_PRICE,
  PET_AFFECTION_GAIN,
  PET_NAME_MAX_LENGTH,
} from './pet-catalog'
import {
  petIsWorking,
  petNeedsAt,
  petPreviewReducer,
  restorePetPreview,
  type PetPreviewAction,
  type PetPreviewState,
} from './pet-preview-model'
import { PetSprite, usePetReactionReady } from './pet-sprite'
import { PetCareEffects } from './pet-care-effects'
import { PetThoughtBubble } from './pet-thought-bubble'
import { PetEnhancementDialog } from './pet-enhancement-dialog'
import { PetJobsPanel, PetGold, petJobCountdown } from './pet-jobs-panel'
import './pet-preview.css'

const careIcons = { stroke: Hand, bath: Bath, sleep: Camera, play: CircleDot }
const tiers = { pet: '펫', common: '일반', rare: '희귀', epic: '특급', mythic: '신화' }
export type PetHouseCommand = PetPreviewAction extends infer A
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

export function PetPreviewBoard({ owner,live }: { owner: string;live?:{state:PetPreviewState;busy:boolean;error:string;send:(a:PetHouseCommand)=>Promise<boolean>} }) {
  const [choosing, setChoosing] = useState(false)
  const [jobsOpen, setJobsOpen] = useState(false)
  const [enhancing, setEnhancing] = useState<string|null>(null)
  const [options, setOptions] = useState<string | null>(null)
  const [odds, setOdds] = useState<string | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [purchase,setPurchase]=useState<'food'|PetBaitId|null>(null),[purchaseQuantity,setPurchaseQuantity]=useState(1)
  const purchaseItem=petBaits.find(b=>b.id===purchase),purchasePrice=purchaseItem?.price??PET_FOOD_PRICE
  const key = `pet-house-preview:v1:${owner}`
  const [previewState, dispatch] = useReducer(petPreviewReducer, null, () => {
    let raw = null
    try {
      raw = localStorage.getItem(key)
    } catch {}
    return restorePetPreview(raw, Date.now())
  })
  const state=live?.state??previewState
  const clock = useAppClock(),
    now = Math.max(state.lastNow, clock + state.offset)
  const [tab, setTab] = useState('home'),
    [pose, setPose] = useState<PetClip | 'auto'>('auto'),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(''),
    [selling, setSelling] = useState<string | null>(null)
  const [affectionPop, setAffectionPop] = useState<{ id: string; petId: string; amount: number } | null>(null)
  const [fullnessPop, setFullnessPop] = useState<{
    id: string
    petId: string
    amount: number
  } | null>(null)
  const send = (a: PetHouseCommand) => {
    if(live){live.send(a);return}
    dispatch({ ...a, now: Date.now() + state.offset } as PetPreviewAction)
    if((a.type==='buy-food'||a.type==='buy-bait')&&state.gold>=(a.type==='buy-food'?PET_FOOD_PRICE*(a.quantity??1):(petBaits.find(b=>b.id===a.baitId)?.price??0)*a.quantity))playPurchaseSound(crypto.randomUUID())
  }
  const pets = state.pets.map((p) => petNeedsAt(p, now)),
    active = pets.find((p) => p.id === state.activeId),
    working = active ? petIsWorking(active, now) : false
  const busy = !!state.care||!!live?.busy
  const employed = pets.find(p => p.job)
  const enhancingPet = pets.find(p => p.id === enhancing)
  const petPage = Math.min(page, Math.max(0, Math.ceil(pets.length / 4) - 1))
  const reactionReady = usePetReactionReady(active?.speciesId)
  const eatingReady = usePetReactionReady(active?.speciesId, 'eat')
  useEffect(() => {
    if(live)return
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])
  useEffect(() => {
    const care = state.care
    if (!care) return
    const timer = setTimeout(
      async () => {
        const at = Date.now() + state.offset,
          pet = state.pets.find((p) => p.id === care.petId)
        if(live){if(!await live.send({type:'complete-care',id:care.id}))return}
        else dispatch({ type: 'complete-care', id: care.id, now: at })
        if (at >= care.endsAt && pet) {
          const needs = petNeedsAt(pet, at)
          if (care.action === 'feed') {
            if (state.food > 0 && needs.fullness < 100)
              setFullnessPop({
                id: care.id,
                petId: care.petId,
                amount: Math.min(PET_FOOD_GAIN, 100 - needs.fullness),
              })
          } else if (needs.affection < 100) setAffectionPop({ id: care.id, petId: care.petId, amount: Math.min(PET_AFFECTION_GAIN, 100 - needs.affection) })
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
  const hungry = !!active && active.fullness < 80
  const lonely = !!active && active.affection <= 80
  const autoClip: PetClip = state.care ? busyClip : hungry ? 'hungry' : lonely ? 'lonely' : 'idleA'
  const openChooser = () => { setPage(0); setChoosing(true) }
  const choosePet = (id: string) => {
    send({ type: 'select', id })
    setPose('auto')
    setChoosing(false)
    setTab('home')
  }
  const renderJobs = (statusOnly = false) => <PetJobsPanel
    pets={pets} active={active} now={now} busy={busy} statusOnly={statusOnly}
    onStart={jobId => {send({type:'start-job',jobId,roll:Math.random()});setJobsOpen(false);setTab('jobs')}}
    onClaim={id => {send({type:'claim-job',id});setJobsOpen(false);setTab('jobs')}}
    onCancel={(id,runKey) => {send({type:'cancel-job',id,runKey});setTab('jobs');setJobsOpen(true)}}
    onOpenJobs={() => setJobsOpen(true)}
    onChoosePet={() => {setJobsOpen(false);openChooser()}}
    onCare={() => {setJobsOpen(false);setTab('home')}}
    onEnhance={() => {if(active){setJobsOpen(false);setEnhancing(active.id)}}}
  />
  const roster = (picker = false) => <>
    <div className="pet-roster-grid">
      {pets.slice(petPage * 4, petPage * 4 + 4).map(p => {
        const atWork = petIsWorking(p, now), selected = p.id === state.activeId && !atWork
        const profile=<><img src={`/pets/${p.speciesId}_v1_thumbnail.png`} alt=""/><div className="pet-row-copy"><strong>{p.name} <span className="pet-level-badge">+{p.level}</span></strong><span className="pet-roster-status">{atWork && p.job ? `근무 중 · ${petJobCountdown(p.job.endsAt, now)}` : selected ? '함께하는 중' : p.job ? '알바 완료' : petSpeciesById(p.speciesId).name}</span></div>{!picker&&<Sparkles size={13} aria-hidden="true"/>}</>
        return <article className={`pet-row ${selected ? 'is-selected' : ''}`} key={p.id}>
          {picker?<div className="pet-row-profile">{profile}</div>:<button className="pet-row-profile" disabled={busy} aria-label={`${p.name} +${p.level} 강화`} onClick={()=>setEnhancing(p.id)}>{profile}</button>}
          <div className="pet-mini-needs">
            <span><Utensils size={11}/><progress max={100} value={p.fullness} aria-label={`${p.name} 포만도`}/><small>{p.fullness}</small></span>
            <span><Heart size={11}/><progress max={100} value={p.affection} aria-label={`${p.name} 애정`}/><small>{p.affection}</small></span>
          </div>
          <div className="pet-row-actions">
            <button disabled={busy || selected || atWork} onClick={() => choosePet(p.id)}>{selected ? <><Check size={12}/> 함께해요</> : atWork ? '근무 중' : '데려오기'}</button>
            {!picker && <button className="pet-sale-button" disabled={busy || !!p.job} onClick={() => setSelling(p.id)}>판매하기</button>}
          </div>
        </article>
      })}
    </div>
    {pets.length > 4 && <div className="pet-pagination"><button disabled={petPage === 0} onClick={() => setPage(petPage - 1)}>이전</button><span>{petPage + 1} / {Math.ceil(pets.length / 4)}</span><button disabled={(petPage + 1) * 4 >= pets.length} onClick={() => setPage(petPage + 1)}>다음</button></div>}
    {!pets.length && <div className="pet-no-friends"><PawPrint size={30}/><p>아직 함께할 친구가 없어요.</p><button onClick={() => { setChoosing(false); setTab('shop') }}>간식 상점 둘러보기</button></div>}
  </>
  return (
    <main className="pet-preview">
      <header className="pet-heading">
        <div>
          <span className="pet-eyebrow">{live?'펫 하우스':'운영자 미리보기'}</span>
          <h2>
            작은 친구의 집 <PawPrint size={20} />
          </h2>
        </div>
        <div className="pet-wallet">
          <small>{live?'보유 골드':'테스트 골드'}</small>
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
        <button aria-label="아르바이트" aria-current={tab === 'jobs' ? 'page' : undefined} onClick={() => setTab('jobs')}>
          아르바이트{employed && <span className={`pet-job-tab-dot ${employed.job!.endsAt<=now?'is-done':''}`} aria-label={employed.job!.endsAt<=now?'보상 수령 가능':'근무 중'}/>}
        </button>
        <button aria-current={tab === 'shop' ? 'page' : undefined} onClick={() => setTab('shop')}>
          간식 상점
        </button>
      </nav>
      {tab === 'home' && (
        <section className="pet-home">
          <div className={`pet-stage ${active ? 'has-pet' : ''}`}>
            <button className="pet-house-menu" aria-label="하우스 메뉴" disabled={busy} onClick={() => setOptions('home')}><Ellipsis size={18}/></button>
            {active && <header className="pet-stage-toolbar">
              <div className="pet-stage-identity">
                <h3 title={active.name}>{active.name}</h3>
                <span className="pet-level-badge">+{active.level}{active.level === 5 && <small> MAX</small>}</span>
                <button className="pet-stage-rename" aria-label="펫 이름 바꾸기" title="이름 수정" disabled={busy || working} onClick={() => {setName(active.name);setEditing(true)}}><Pencil size={12}/></button>
              </div>
              <div className="pet-stage-actions">
                <button className="pet-job-launch" aria-label="알바 보내기" title={employed ? '진행 중인 알바는 아르바이트 탭에서 확인해요.' : '아르바이트 보내기'} disabled={busy || !!employed} onClick={() => setJobsOpen(true)}><BriefcaseBusiness size={13}/><span>알바 보내기</span></button>
                <button className="pet-stage-enhance" aria-label="펫 강화" disabled={busy || !!active.job} onClick={() => setEnhancing(active.id)}><Sparkles size={13}/><span>강화</span></button>
              </div>
            </header>}
            <div className="pet-stage-body" style={{'--pet-floor':active ? petGroundY(active.speciesId)/640 : .78} as CSSProperties}>
            <img className="pet-house-cushion" src="/pets/house/cozy-cushion_v1.webp" alt="" aria-hidden="true"/>
            {active && !working ? (
              <>
                <div className="pet-visual">
                <PetSprite
                  key={active.id}
                  speciesId={active.speciesId}
                  clip={busy ? busyClip : pose === 'auto' ? autoClip : pose}
                  label={`${active.name} ${busy ? (busyClip === 'eat' ? '먹기' : '만족') : autoClip === 'hungry' ? '배고픔' : autoClip === 'lonely' ? '애정 부족' : '대기'} 애니메이션`}
                />
                {!busy && (hungry || lonely) && (
                  <PetThoughtBubble key={hungry ? 'hungry' : 'lonely'} kind={hungry ? 'hungry' : 'lonely'} />
                )}
                <div className="pet-effect-layer" aria-hidden="true">
                {state.care && (
                  <PetCareEffects
                    key={state.care.id}
                    action={state.care.action}
                    speciesId={active.speciesId}
                  />
                )}
                </div>
                {busy && <div className="pet-stage-caption" role="status">
                  <strong>{state.care?.action === 'feed' ? '오물오물' : petActions.find((a) => a.id === state.care?.action)?.label}</strong>
                  <span>{state.care?.action === 'feed' ? '맛있게 먹는 중이에요' : '기분이 좋아져요'}</span>
                </div>}
                </div>
              </>
            ) : (
              <div className="pet-away">
                {working ? <BriefcaseBusiness size={38} /> : <svg className="pet-empty-room" viewBox="0 0 160 120" aria-hidden="true"><path d="M24 88V32l56-21 56 21v56" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M80 12v66M24 88l56-10 56 10" fill="none" stroke="currentColor" opacity=".45"/><rect x="43" y="37" width="20" height="25" rx="4" fill="none" stroke="currentColor"/><path d="M53 38v23M44 49h18" stroke="currentColor"/><ellipse cx="83" cy="93" rx="39" ry="12" fill="currentColor" opacity=".12"/><ellipse cx="83" cy="89" rx="34" ry="10" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>}
                <strong>
                  {working ? `${active?.name}의 알바 시간` : '잠시 비어 있는 집'}
                </strong>
                <p>
                  {working && active?.job
                    ? `${petJobCountdown(active.job.endsAt, now)} 후 돌아와요`
                    : '함께할 친구를 데려와 주세요.'}
                </p>
                <button onClick={() => working ? setTab('jobs') : pets.length ? openChooser() : setTab('shop')}>
                  {working ? '알바 확인' : pets.length ? '펫 데려오기' : '간식 상점 둘러보기'}
                </button>
                {working && <button className="pet-text-button" onClick={openChooser}>다른 펫 데려오기</button>}
              </div>
            )}
            </div>
          </div>
          {active && !working && (
            <div className="pet-care-panel">
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
                  amount={affectionPop?.amount}
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
                <span>포만도 +{PET_FOOD_GAIN} · {state.food}개 남음</span>
              </button>
            </div>
          )}
          {!active && employed && <button className="pet-job-launch pet-job-launch-empty" disabled={busy} onClick={() => setTab('jobs')}><BriefcaseBusiness size={14}/><span>{employed.name} · {employed.job!.endsAt <= now ? '보상 받기' : petJobCountdown(employed.job!.endsAt,now)}</span></button>}
        </section>
      )}
      {tab === 'pets' && <section className="pet-list pet-roster-panel">{roster()}</section>}
      {tab === 'jobs' && renderJobs(true)}
      <Dialog open={jobsOpen} onOpenChange={setJobsOpen}><DialogContent className="pet-job-dialog">
        <DialogTitle>아르바이트</DialogTitle>
        <DialogDescription className="sr-only">함께하는 펫의 전용 알바를 고르거나 진행 중인 알바를 확인해요.</DialogDescription>
        {renderJobs()}
      </DialogContent></Dialog>
      {tab === 'shop' && live&&<PetSnackShop/>}
      {tab === 'shop' && !live&&(
        <section className="pet-list pet-shop-panel">
          <article className="pet-shop-product">
            <span className="pet-product-art food"><img src="/pets/items/food_v1.webp" alt=""/></span>
            <div>
              <strong>든든 사료</strong>
              <p>포만도 +{PET_FOOD_GAIN} · 보유 {state.food}개</p>
            </div>
            <button disabled={busy || state.gold < PET_FOOD_PRICE} onClick={() => {setPurchase('food');setPurchaseQuantity(1)}}>
              <span className="pet-job-shop-price">
                <PetGold value={PET_FOOD_PRICE} /> 구매
              </span>
            </button>
          </article>
          {petBaits.map((b) => (
            <article className="pet-shop-product" key={b.id}>
              <span className={`pet-product-art ${b.id}`}><img src={`/pets/items/${b.id}_v1.webp`} alt=""/></span>
              <div><h3>{b.name}</h3><p>펫 만남 확률 {b.petBp / 100}% · 보유 {state.baitInventory?.[b.id]??0}개</p><button className="pet-odds-link" onClick={() => setOdds(b.id)}>확률 보기</button>{!!state.baitInventory?.[b.id]&&<button className="pet-odds-link" disabled={busy} onClick={()=>send({type:'fish',baitId:b.id,roll:Math.random(),speciesRoll:Math.random()})}>1개 사용 · 낚시 테스트</button>}</div>
              <button
                disabled={busy || state.gold < b.price}
                onClick={() => {setPurchase(b.id);setPurchaseQuantity(1)}}
              >
                <span className="pet-job-shop-price">
                  <PetGold value={b.price} /> 구매
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
        {live?.error||state.notice || ' '}
      </p>
      {!live&&<Dialog open={!!purchase} onOpenChange={open=>{if(!open)setPurchase(null)}}>
        <DialogContent className="max-w-sm gap-5 rounded-2xl p-5">
          <DialogTitle>{purchaseItem?.name??'든든 사료'} 구매</DialogTitle>
          <DialogDescription>테스트 전용 · 실제 아이템은 지급되지 않아요.</DialogDescription>
          <div className="space-y-2 py-1">
            <img src={`/pets/items/${purchase}_v1.webp`} alt="" className="mx-auto size-24 object-contain"/>
            <p className="text-center text-xs text-muted-foreground">개당 {purchasePrice.toLocaleString()} 골드</p>
          </div>
          <PetPurchaseQuantity value={purchaseQuantity} disabled={busy} onChange={setPurchaseQuantity}/>
          <button disabled={busy||state.gold<purchasePrice*purchaseQuantity} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary text-sm" onClick={()=>{
            if(purchase==='food')send({type:'buy-food',quantity:purchaseQuantity})
            else if(purchase)send({type:'buy-bait',baitId:purchase,quantity:purchaseQuantity})
            setPurchase(null)
          }}><PetGold value={purchasePrice*purchaseQuantity}/> · {purchaseQuantity}개 구매</button>
        </DialogContent>
      </Dialog>}
      {!live&&<button className="pet-tools-trigger" onClick={() => setToolsOpen(true)}>테스트 도구</button>}
      {enhancingPet&&<PetEnhancementDialog key={enhancingPet.id} pet={enhancingPet} pets={pets} busy={busy} onClose={()=>setEnhancing(null)} onEnhance={(materialId,expectedLevel)=>send({type:'enhance',targetId:enhancingPet.id,materialId,expectedLevel})} onJobs={()=>{send({type:'select',id:enhancingPet.id});setEnhancing(null);setTab('home');setJobsOpen(true)}}/>}
      <Dialog open={choosing} onOpenChange={setChoosing}><DialogContent className="pet-select-dialog" aria-describedby={undefined}><DialogTitle>함께할 친구 고르기</DialogTitle><div className="pet-dialog-body">{roster(true)}</div></DialogContent></Dialog>
      <Dialog open={!!options} onOpenChange={open => { if (!open) setOptions(null) }}><DialogContent className="pet-options-dialog" aria-describedby={undefined}>
        <DialogTitle>{options === 'home' ? '하우스 메뉴' : `${pets.find(p => p.id === options)?.name ?? '펫'} 관리`}</DialogTitle>
        {options === 'home' ? <>
          <button disabled={busy} onClick={() => { setOptions(null); openChooser() }}>다른 펫 데려오기</button>
          <button disabled={busy || !active} onClick={() => { send({type:'select',id:null});setOptions(null) }}>집 비우기</button>
        </> : <button disabled={busy || !!pets.find(p => p.id === options)?.job} onClick={() => { setSelling(options);setOptions(null) }}>판매 · 1,000 골드</button>}
      </DialogContent></Dialog>
      <Dialog open={!!odds} onOpenChange={open => { if (!open) setOdds(null) }}><DialogContent className="pet-odds-dialog"><DialogTitle>{petBaits.find(b => b.id === odds)?.name} 확률</DialogTitle><DialogDescription>한 번의 뽑기로 아래 결과 중 하나를 만나요.</DialogDescription>{petBaits.filter(b => b.id === odds).map(b => <div key={b.id}><p>{b.description}</p><dl>{([['펫',b.petBp],['일반',b.commonBp],['희귀',b.rareBp],['특급',b.epicBp],['신화',b.mythicBp]] as const).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value / 100}%</dd></div>)}</dl><p className="pet-note">펫 당첨 시 네 종류가 같은 확률로 등장해요.</p></div>)}</DialogContent></Dialog>
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
            <option value="lonely">애정 부족</option>
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
                if (name.trim() && Array.from(name.trim()).length <= PET_NAME_MAX_LENGTH) {
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
                onChange={(e) => setName(Array.from(e.target.value).slice(0, PET_NAME_MAX_LENGTH).join(''))}
              />
              <small>{Array.from(name.trim()).length} / {PET_NAME_MAX_LENGTH}자</small>
              <div>
                <button type="button" onClick={() => setEditing(false)}>
                  취소
                </button>
                <button type="submit" disabled={!name.trim() || Array.from(name.trim()).length > PET_NAME_MAX_LENGTH}>이름 저장</button>
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
              <DialogTitle>{pets.find(p => p.id === selling)?.name}을 판매할까요?</DialogTitle>
              <DialogDescription>판매하면 펫 목록에서 사라지고 되돌릴 수 없어요. 1,000 {live?'골드':'테스트 골드'}를 받아요.</DialogDescription>
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
