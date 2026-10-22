import { useEffect,useMemo,useRef,useState } from 'react'
import {baitWaitFlavor} from './bait-wait-flavor'
import { TensionFishingGame } from './tension-fishing-game'
import {
  labBaits,
  labBaitsAt,
  advanceLabWait,
  labRegions,
  labStorageKey,
  freshLab,
  startLab,
  finishLab,
  buyLab,
  labOdds,
  labTarget,
  type LabState,
} from './bait-lab-model'
import { GoldIcon } from '@/features/gold/gold-provider'
import { rarities } from '@/lib/game/rarity'

function readState(): LabState {
  try {
    const saved = JSON.parse(localStorage.getItem(labStorageKey) ?? 'null')
    if (
      saved &&
      Number.isFinite(saved.gold) &&
      saved.inventory &&
      Array.isArray(saved.discoveries) &&
      Array.isArray(saved.history)
    )
      return {...saved,inventory:{...Object.fromEntries(labBaits.map(b=>[b.id,20])),...saved.inventory}}
  } catch {
    /* A broken preview save can be replaced with fresh test supplies. */
  }
  return freshLab()
}
export default function BaitLabPage() {
  const [state, setState] = useState(readState)
  const current = useRef(state)
  const [selected, setSelected] = useState(state.pending?.baitId ?? 'bait')
  const [region, setRegion] = useState(state.pending?.regionId ?? 'pongdang')
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState('미끼를 선택하고 낚시를 시작해 보세요.')
  const [now,setNow]=useState(Date.now)
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer)},[])
  const baits=useMemo(()=>labBaitsAt(now),[now])
  const bait = state.pending?.baitSnapshot??baits.find((b) => b.id === selected) ?? baits[0]
  const cast = state.pending
  function update(work: (previous: LabState) => LabState) {
    try {
      const next = work(current.current)
      localStorage.setItem(labStorageKey, JSON.stringify(next))
      current.current = next
      setState(next)
      return next
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '테스트 저장에 실패했어요.')
      return null
    }
  }
  function start() {
    const next = update((previous) => startLab(previous, selected, region))
    if (!next?.pending) return
    setSelected(next.pending.baitId)
    setRegion(next.pending.regionId)
    setMessage('입질을 기다린 뒤 릴을 눌렀다 떼며 힘을 조절하세요.')
    setPlaying(true)
  }
  function finish(won: boolean, reason?: string) {
    const pending = current.current.pending
    if (!pending) return
    if (!update((previous) => finishLab(previous, won))) return
    setPlaying(false)
    setMessage(
      won
        ? `${pending.species.name} · ${rarities[pending.species.rarity].label} 포획!`
        : reason === 'cancelled'
          ? '테스트 낚시를 취소했어요. 사용한 미끼는 돌아오지 않아요.'
          : '게이지 조작에 실패했어요. 미끼 확률로 인한 강제 실패는 없어요.',
    )
  }
  return (
    <main className="mx-auto flex h-dvh max-w-6xl flex-col bg-background text-foreground">
      <header className="shrink-0 border-b px-4 py-3">
        <h1 className="text-lg font-semibold">미끼 밸런스 로컬 테스트</h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          테스트 골드·미끼·결과는 이 브라우저에만 저장돼요. 실제 계정에는 반영되지 않아요.
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:grid-cols-[340px_1fr] md:overflow-hidden">
        <aside className="order-2 space-y-3 p-4 md:order-first md:overflow-y-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <GoldIcon />
              {state.gold.toLocaleString('ko-KR')}
            </span>
            <button
              className="min-h-10 rounded-lg border px-3 text-xs"
              disabled={playing}
              onClick={() => {
                if (update(() => freshLab())) {
                  setPlaying(false)
                  setMessage('테스트 골드 50,000과 미끼별 20개를 다시 받았어요.')
                }
              }}
            >
              테스트 초기화
            </button>
          </div>
          <label className="block text-xs">
            해역
            <select
              className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3"
              value={region}
              disabled={!!cast}
              onChange={(e) => setRegion(e.target.value)}
            >
              {labRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            미끼 확률로 인한 강제 실패 없음 · 마지막 게이지 조작 유지
          </p>
          <ul className="space-y-2" aria-label="테스트 미끼 목록">
            {baits.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border p-3 ${item.id === selected ? 'border-primary bg-primary/5' : ''}`}
              >
                <button
                  className="flex min-h-12 w-full items-center gap-2 text-left"
                  disabled={!!cast}
                  aria-pressed={selected === item.id}
                  onClick={() => setSelected(item.id)}
                >
                  <img src={item.image_path} alt="" className="size-10 object-contain" />
                  <span className="text-sm">
                    {item.name}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      보유 {state.inventory[item.id] ?? 0}개
                    </span>
                  </span>
                </button>
                <p className="mt-2 text-xs leading-5">{labTarget(item)}</p>
                <p className="text-xs leading-5 text-muted-foreground">{labOdds(item)}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{baitWaitFlavor(item.id)}</p>
                {item.period&&<p className="mt-1 text-[10px] text-primary">현재 {item.period==='day'?'낮':'밤'}의 향기</p>}
                <button
                  disabled={!!cast || item.price === null || state.gold < item.price}
                  className="mt-2 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border text-xs disabled:opacity-40"
                  onClick={() => update((previous) => buyLab(previous, item.id))}
                >
                  {item.price === null ? (
                    '보상형 · 테스트 지급만 가능'
                  ) : (
                    <>
                      <GoldIcon className="size-4" />
                      {item.price} · 1개 구매
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section
          className="order-1 flex min-h-[75dvh] flex-col md:order-last md:min-h-0"
          aria-label="로컬 낚시 테스트"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 text-sm">
            <label className="min-w-0 flex-1">
              <span className="sr-only">테스트 미끼 선택</span>
              <select
                className="min-h-10 w-full rounded-lg border bg-background px-2 text-xs"
                value={selected}
                disabled={!!cast}
                onChange={(e) => setSelected(e.target.value)}
              >
                {baits.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ·{' '}
                    {b.price === null ? '보상형' : `${b.price}골드`}
                  </option>
                ))}
              </select>
              {bait.alternating && (
                <span className="text-xs">다음 {state.nextRare ? '희귀' : '일반'}</span>
              )}
            </label>
            {cast && (
              <button
                className="min-h-10 rounded-lg border px-3 text-xs"
                onClick={() => finish(false, 'cancelled')}
              >
                낚시 취소
              </button>
            )}
          </div>
          <div className="relative min-h-[480px] flex-1 md:min-h-0">
            <TensionFishingGame
              active={playing}
              castId={cast?.id ?? 'lab-ready'}
              regionId={region}
              regionName={labRegions.find((r) => r.id === region)?.name}
              baitImage={bait.image_path}
              outline={cast?.species}
              challenge={{ rarity: cast?.species.rarity ?? 'common', wait: cast?.wait }}
              waitReductionSeconds={cast?.waitReduction??0}
              onAdvanceWait={()=>{update(advanceLabWait)}}
              start={{
                label: cast ? '진행 중인 로컬 낚시 이어하기' : `${bait.name} 로컬 낚시 시작`,
                caption: cast ? '이어하기' : '테스트 시작',
                disabled: !(state.inventory[selected] > 0) && !cast,
                onStart: start,
              }}
              onCaught={() => finish(true)}
              onFailed={(reason) => finish(false, reason)}
              onCancel={() => finish(false, 'cancelled')}
            />
          </div>
          <div className="shrink-0 space-y-2 border-t p-4">
            <p role="status" className="text-sm">
              {message}
            </p>
            <p className="text-xs text-muted-foreground">
              새로고침 후 이어하기는 같은 결과·같은 대기시간으로 재시작해요. 게이지 시간은 입질
              대기와 별도예요.
            </p>
            <details>
              <summary className="cursor-pointer text-xs">
                최근 테스트 결과 ({state.history.length})
              </summary>
              <ul className="mt-2 max-h-32 overflow-y-auto text-xs leading-6">
                {state.history.map((h) => (
                  <li key={h.id}>
                    {h.won ? `${h.name} · ${rarities[h.rarity].label}` : '조작 실패·취소'} · 미끼 {h.price ?? '보상형'}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      </div>
    </main>
  )
}
