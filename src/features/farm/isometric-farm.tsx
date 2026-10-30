import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowLeft,
  Box,
  Check,
  Eraser,
  Fence,
  House,
  Layers3,
  Minus,
  Move,
  Plus,
  RotateCw,
  Sprout,
  Tractor,
  Undo2,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { useAccountResource } from '@/lib/account-query'
import { randomId } from '@/lib/random-id'
import {
  readIsland,
  saveIsland,
  tradeIsland,
  islandError,
  definitiveIslandError,
  type IslandSnapshot,
  type IslandTradeArgs,
} from '../my-island/api'
import { useIslandDraft } from '../my-island/use-island-draft'
import {
  defaultState,
  facilityFor,
  footprint,
  canRotate,
  floorTiles,
  type Placement,
  type Cell,
  type FloorKind,
  type IslandState,
} from '../my-island/island-model'
import {
  extendLandStroke,
  planFloorStroke,
  planLandStroke,
} from '../my-island/island-land-placement'
import {
  planDecorationRemoval,
  applyDecorationPlacement,
  planDecorationPlacement,
} from '../my-island/island-batch-placement'
import { farmAction, type FarmActionArgs } from './api'
import { farmAnimalIds, farmBuildingIds, duration, remaining } from './model'
import {
  canPlaceFarm,
  depth,
  farmBounds,
  fromIso,
  landCells,
  tilePoints,
  turnPlacement,
} from './isometric'
import { FarmObject, FarmSprite, Ground, WhiteFence } from './art'
import './isometric-farm.css'

type Operation = { type: 'trade'; args: IslandTradeArgs } | { type: 'farm'; args: FarmActionArgs }
type Panel = 'building' | 'animal' | 'decoration' | 'plot' | 'floor' | 'land' | 'inventory' | null
type Mode =
  'play' | 'edit' | 'place' | 'land' | 'floor' | 'remove-item' | 'remove-land' | 'remove-floor'
function restore(key: string): Operation | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null'),
      a = v?.args
    if (
      !['trade', 'farm'].includes(v?.type) ||
      typeof a?.itemId !== 'string' ||
      typeof a.operationId !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(a.operationId) ||
      !Number.isSafeInteger(a.quantity) ||
      a.quantity < 1 ||
      !Number.isSafeInteger(a.price) ||
      a.price < 0
    )
      return null
    if (v.type === 'trade' && !['buy', 'sell'].includes(a.action)) return null
    if (
      v.type === 'farm' &&
      (!['plant', 'harvest', 'feed', 'collect', 'sell'].includes(a.action) ||
        typeof a.kind !== 'string')
    )
      return null
    return v
  } catch {
    return null
  }
}
export function IsometricFarmPage() {
  const { session } = useAuth(),
    query = useAccountResource('island', readIsland)
  const refetch = query.refetch
  const reload = useCallback(async () => {
    const result = await refetch()
    if (result.error) throw result.error
    return result.data
  }, [refetch])
  if (!query.data)
    return (
      <section className="iso-loading">
        <Sprout size={34} />
        <p>{query.error ? islandError(query.error) : '농장으로 가는 중…'}</p>
        {query.error && <Button onClick={() => void reload()}>다시 불러오기</Button>}
      </section>
    )
  return (
    <FarmStudio
      key={session?.user.id ?? 'guest'}
      snapshot={query.data}
      reload={reload}
      receivedAt={query.dataUpdatedAt}
      storageKey={`pongdang:farm:${session?.user.id ?? 'guest'}`}
    />
  )
}
type StudioProps = {
  snapshot: IslandSnapshot
  reload: () => Promise<IslandSnapshot | undefined>
  receivedAt?: number
  storageKey: string
  save?: typeof saveIsland
}
export function FarmStudio(props: StudioProps) {
  const gold = useGold()
  return <FarmView {...props} gold={gold} />
}
export function FarmView({
  snapshot,
  reload,
  receivedAt,
  storageKey,
  gold,
  save = saveIsland,
}: StudioProps & { gold: Pick<ReturnType<typeof useGold>, 'wallet' | 'loading' | 'error'> }) {
  const navigate = useNavigate(),
    wallet = gold.wallet
  const draft = useIslandDraft({ snapshot, save, reload }, defaultState)
  const state = useMemo(() => ({ ...draft.local, coins: wallet.gold }), [draft.local, wallet.gold])
  const farm = snapshot.farm,
    inventory = farm?.inventory ?? {},
    crops = farm?.crops ?? [],
    animals = farm?.animalTypes ?? [],
    buildings = farm?.buildings ?? [],
    cropJobs = farm?.cropJobs ?? [],
    animalJobs = farm?.animalJobs ?? []
  const used = Object.values(inventory).reduce((a, b) => a + b, 0),
    capacity = farm?.storeCapacity ?? 20,
    animalLimit = farm?.animalLimit ?? 0
  const [mode, setMode] = useState<Mode>('play'),
    [panel, setPanel] = useState<Panel>(null),
    [selected, setSelected] = useState<string | null>(null),
    [inspect, setInspect] = useState<string | null>(null),
    [building, setBuilding] = useState<string | null>(null),
    [ghost, setGhost] = useState<Placement | null>(null),
    [floor, setFloor] = useState<FloorKind>('stone'),
    [stroke, setStroke] = useState<Cell[]>([]),
    [rotation, setRotation] = useState(0),
    [quantity, setQuantity] = useState(1),
    [storage, setStorage] = useState(false),
    [removalOpen, setRemovalOpen] = useState(false)
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<Operation | null>(() => restore(storageKey + ':operation')),
    [history, setHistory] = useState<IslandState[]>([]),
    [clock, setClock] = useState(() => Date.now())
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight }),
    [camera, setCamera] = useState<{ x: number; y: number; zoom: number } | null>(null)
  const svg = useRef<SVGSVGElement>(null),
    root = useRef<HTMLElement>(null),
    lock = useRef(false),
    active = useRef(true),
    gesture = useRef<{
      x: number
      y: number
      cameraX: number
      cameraY: number
      id: string | null
      cell: Cell
      dx: number
      dy: number
      moved: boolean
    } | null>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const offset =
      farm?.serverNow && receivedAt !== undefined ? Date.parse(farm.serverNow) - receivedAt : 0,
    now = clock + offset
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    const el = root.current
    if (!el) return
    const o = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    )
    o.observe(el)
    return () => o.disconnect()
  }, [])
  const cells = useMemo(
      () => landCells({ land: state.land, removedLand: state.removedLand }),
      [state.land, state.removedLand],
    ),
    bounds = useMemo(
      () => farmBounds({ land: state.land, removedLand: state.removedLand }),
      [state.land, state.removedLand],
    )
  const center = camera ?? {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2 + 25,
      zoom: size.w < 600 ? 1.65 : 1.15,
    },
    baseScale = Math.min(
      (size.w - 30) / (bounds.right - bounds.left + 50),
      (size.h - 230) / (bounds.bottom - bounds.top + 60),
    ),
    scale = Math.max(0.15, baseScale) * center.zoom
  const view = {
    x: center.x - size.w / scale / 2,
    y: center.y - size.h / scale / 2,
    w: size.w / scale,
    h: size.h / scale,
  }
  const selectedPlacement = state.layout.find((p) => p.id === selected),
    selectedType = selected ? facilityFor(selected) : undefined,
    inspected = state.layout.find((p) => p.id === inspect),
    inspectedType = inspected ? facilityFor(inspected.id) : undefined
  const cropJob = cropJobs.find((j) => j.item_id === inspect),
    animalJob = animalJobs.find((j) => j.item_id === inspect),
    animalType = animals.find((a) => a.id === inspectedType?.id),
    cropType = crops.find((c) => c.id === cropJob?.crop_id),
    buildingType = buildings.find((b) => b.id === building)
  const stock = state.owned.filter((id) => !state.layout.some((p) => p.id === id))
  const stamping =
    mode === 'place' &&
    !!selectedType &&
    ['farm-plot', 'farm-white-fence'].includes(selectedType.id)
  const stampPlan =
    stamping && selectedType && stroke.length
      ? planDecorationPlacement(state, selectedType.id, stroke[0], stroke.at(-1)!, rotation)
      : null
  function remember(op: Operation | null) {
    setPending(op)
    try {
      if (op) localStorage.setItem(storageKey + ':operation', JSON.stringify(op))
      else localStorage.removeItem(storageKey + ':operation')
    } catch {
      /* Preserve the operation in memory. */
    }
  }
  function change(next: IslandState) {
    setHistory((h) => [...h.slice(-19), state])
    draft.setLocal(next)
  }
  function startPlace(id: string) {
    setPanel(null)
    setInspect(null)
    setBuilding(null)
    setSelected(id)
    setRotation(state.layout.find((p) => p.id === id)?.rotation ?? 0)
    setGhost(null)
    setMode('place')
    setMessage('빈 땅을 눌러 배치하세요. 회전해서 방향을 바꿀 수 있어요.')
  }
  async function run(request?: Operation) {
    if (lock.current || busy || (!request && !pending)) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const operation = pending ?? request!
      if (!pending) await draft.flush()
      if (!active.current) return
      remember(operation)
      const result =
        operation.type === 'trade'
          ? await tradeIsland(operation.args, () => active.current)
          : await farmAction(operation.args)
      if (!active.current) return
      remember(null)
      setMessage('완료했어요.')
      if (operation.type === 'trade') {
        setPanel(null)
        setBuilding(null)
        const ids = 'itemIds' in result.receipt ? result.receipt.itemIds : []
        const id = ids.find((id) => !result.island.document.layout.some((p) => p.id === id))
        if (operation.args.action === 'buy' && id) startPlace(id)
        else if (operation.args.action === 'buy' && operation.args.itemId === 'land-piece') {
          setMode('land')
          setMessage('바다를 눌러 땅을 놓아주세요.')
        } else if (operation.args.action === 'buy' && operation.args.itemId.startsWith('floor-')) {
          setFloor(operation.args.itemId.slice(6) as FloorKind)
          setMode('floor')
          setMessage('땅을 눌러 타일을 깔아주세요.')
        }
      } else if (operation.args.action !== 'sell') setInspect(null)
    } catch (cause) {
      if (!active.current) return
      if (definitiveIslandError(cause)) {
        remember(null)
        try {
          await reload()
        } catch {
          /* The retry button remains available. */
        }
      }
      if (active.current) setError(islandError(cause))
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  const buy = (id: string, price: number, n = 1) =>
    void run({
      type: 'trade',
      args: { action: 'buy', itemId: id, price, quantity: n, operationId: randomId() },
    })
  const action = (name: FarmActionArgs['action'], id: string, kind = '', price = 0, n = 1) =>
    void run({
      type: 'farm',
      args: { action: name, itemId: id, kind, price, quantity: n, operationId: randomId() },
    })
  async function finish() {
    try {
      await draft.flush()
      if (active.current) {
        setMode('play')
        setSelected(null)
        setGhost(null)
        setStroke([])
      }
    } catch {
      /* Keep the draft visible with its error. */
    }
  }
  async function leave() {
    try {
      await draft.flush()
      if (active.current) navigate('/aquarium')
    } catch {
      /* Preserve unsaved placements. */
    }
  }
  function cellAt(e: { clientX: number; clientY: number }) {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()),
      cell = fromIso(p.x, p.y)
    return { x: Math.floor(cell.x), y: Math.floor(cell.y) }
  }
  function place(p: Placement) {
    if (!canPlaceFarm(state, p, animalLimit)) {
      setError(
        selectedType?.id === 'farm-plot'
          ? '밭 한도나 빈 공간을 확인해 주세요.'
          : '비어 있는 땅과 가축 한도를 확인해 주세요.',
      )
      return
    }
    change({ ...state, layout: [...state.layout.filter((old) => old.id !== p.id), p] })
    setMode('edit')
    setGhost(null)
    setSelected(p.id)
    setError('')
  }
  function down(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || busy || pending) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: center.zoom }
      gesture.current = null
      setStroke([])
      return
    }
    const id =
        (e.target as Element).closest('[data-farm-object]')?.getAttribute('data-farm-object') ??
        null,
      cell = cellAt(e),
      p = state.layout.find((p) => p.id === id)
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      cameraX: center.x,
      cameraY: center.y,
      id,
      cell,
      dx: p ? cell.x - p.x : 0,
      dy: p ? cell.y - p.y : 0,
      moved: false,
    }
    if (stamping || ['land', 'floor', 'remove-item', 'remove-land', 'remove-floor'].includes(mode))
      setStroke([cell])
  }
  function move(e: ReactPointerEvent<SVGSVGElement>) {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      setCamera({
        ...center,
        zoom: Math.max(
          0.6,
          Math.min(
            3,
            (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.distance,
          ),
        ),
      })
      return
    }
    const g = gesture.current,
      cell = cellAt(e)
    if (!g) {
      if (mode === 'place' && selected) setGhost({ id: selected, ...cell, rotation })
      return
    }
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 5) g.moved = true
    if (
      stamping ||
      ['land', 'floor', 'remove-item', 'remove-land', 'remove-floor'].includes(mode)
    ) {
      setStroke((old) => extendLandStroke(old, cell))
      return
    }
    if (mode === 'edit' && g.id && g.moved) {
      const old = state.layout.find((p) => p.id === g.id)!
      setSelected(g.id)
      setGhost({ ...old, x: cell.x - g.dx, y: cell.y - g.dy })
      return
    }
    if (g.moved)
      setCamera({
        ...center,
        x: g.cameraX - (e.clientX - g.x) / scale,
        y: g.cameraY - (e.clientY - g.y) / scale,
      })
  }
  function applyStroke(list: Cell[]) {
    if (mode === 'land') {
      const plan = planLandStroke(state, list)
      if (plan.count) change(plan.state)
      else setMessage('보관한 땅을 확인하고 빈 바다에 놓아주세요.')
      return
    }
    if (mode === 'remove-land') {
      const plan = planLandStroke(state, list, 'remove')
      if (plan.count) change(plan.state)
      else setMessage('빈 땅부터 회수해 주세요.')
      return
    }
    if (mode === 'floor' || mode === 'remove-floor') {
      const plan = planFloorStroke(state, list, mode === 'remove-floor' ? 'bare' : floor)
      if (plan.count) change(plan.state)
      else setMessage('보관 중인 타일과 배치할 땅을 확인해 주세요.')
      return
    }
    if (mode === 'remove-item') {
      const safe = planDecorationRemoval(state, list),
        growing = new Set(cropJobs.map((j) => j.item_id)),
        blocked = safe.placements.some((p) => growing.has(p.id))
      if (blocked) {
        setMessage('작물이 있는 밭은 수확한 뒤 회수할 수 있어요.')
        return
      }
      if (safe.count) change(safe.state)
    }
  }
  function up(e: ReactPointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId)
    if (pinch.current) {
      if (!pointers.current.size) pinch.current = null
      gesture.current = null
      return
    }
    const g = gesture.current
    gesture.current = null
    if (!g) return
    const cell = cellAt(e)
    if (stamping && selectedType) {
      const result = applyDecorationPlacement(state, selectedType.id, g.cell, cell, rotation)
      if (result) {
        change(result.state)
        const next = result.state.owned.find(
          (id) =>
            facilityFor(id)?.id === selectedType.id &&
            !result.state.layout.some((p) => p.id === id),
        )
        setSelected(next ?? null)
        setMode(next ? 'place' : 'edit')
        setGhost(null)
        setMessage(
          `${result.plan.placements.length}개를 배치했어요. · 남은 수량 ${result.plan.remaining}개`,
        )
      } else
        setMessage(
          selectedType.id === 'farm-plot'
            ? '빈 공간과 밭 한도를 확인해 주세요.'
            : '비어 있는 땅에 울타리를 놓아주세요.',
        )
      setStroke([])
      return
    }
    if (['land', 'floor', 'remove-item', 'remove-land', 'remove-floor'].includes(mode)) {
      applyStroke(extendLandStroke(stroke, cell, g.cell))
      setStroke([])
      return
    }
    if (mode === 'place' && !g.moved && selected) {
      place({ id: selected, ...cell, rotation })
      return
    }
    if (mode === 'edit' && g.id && g.moved && ghost) {
      place(ghost)
      return
    }
    if (g.moved) return
    if (g.id) {
      const f = facilityFor(g.id)
      if (mode === 'edit') {
        setSelected(g.id)
        setRotation(state.layout.find((p) => p.id === g.id)?.rotation ?? 0)
      } else if (farmBuildingIds.includes(f?.id ?? '')) setBuilding(f!.id)
      else if (f?.id === 'farm-plot' || farmAnimalIds.includes(f?.id ?? '')) setInspect(g.id)
      else {
        setMode('edit')
        setSelected(g.id)
        setRotation(state.layout.find((p) => p.id === g.id)?.rotation ?? 0)
      }
    } else setSelected(null)
  }
  function rotate() {
    const next = (rotation + 90) % 360
    const candidate = selectedPlacement ? turnPlacement(selectedPlacement, next) : null
    if (candidate && !canPlaceFarm(state, candidate, animalLimit)) {
      setError('회전할 공간이 부족해요. 빈 곳으로 옮긴 뒤 회전해 주세요.')
      return
    }
    setRotation(next)
    if (ghost) setGhost({ ...ghost, rotation: next })
    if (candidate) place(candidate)
  }
  function recover() {
    if (!selected) return
    if (cropJobs.some((j) => j.item_id === selected)) {
      setError('작물을 먼저 수확해 주세요.')
      return
    }
    change({ ...state, layout: state.layout.filter((p) => p.id !== selected) })
    setSelected(null)
    setMode('edit')
  }
  const products = [
    ...crops.map((c) => ({ id: c.id, name: c.name, price: c.sell_price })),
    ...animals.map((a) => ({
      id: a.produce_id,
      name: a.produce_name,
      price: a.produce_sell_price,
    })),
  ]
  const blocked = busy || !!pending || wallet === undefined || gold.loading || !!gold.error
  const categoryItems = snapshot.catalog.filter((c) =>
    panel === 'building'
      ? farmBuildingIds.includes(c.id)
      : panel === 'animal'
        ? farmAnimalIds.includes(c.id)
        : panel === 'decoration'
          ? c.id === 'farm-white-fence'
          : panel === 'plot'
            ? c.id === 'farm-plot'
            : panel === 'land'
              ? c.id === 'land-piece'
              : panel === 'floor'
                ? c.family === 'floor'
                : false,
  )
  const nav = [
    { id: 'decoration', label: '장식물', icon: Fence },
    { id: 'building', label: '건물', icon: House },
    { id: 'floor', label: '타일', icon: Layers3 },
    { id: 'plot', label: '밭', icon: Sprout },
    { id: 'animal', label: '동물', icon: Tractor },
    { id: 'land', label: '땅 추가', icon: Plus },
  ] as const
  return (
    <section className="iso-farm" ref={root} aria-label="내 농장">
      <svg
        ref={svg}
        className="iso-board"
        role="img"
        aria-label="회전하고 배치할 수 있는 입체 농장"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          gesture.current = null
          pointers.current.clear()
          pinch.current = null
          setGhost(null)
          setStroke([])
        }}
      >
        <defs>
          <pattern id="iso-water" width="140" height="100" patternUnits="userSpaceOnUse">
            <rect width="140" height="100" fill="#9bd6d5" />
            <path
              d="M15 30q15 7 30 0m50 38q15 7 30 0"
              fill="none"
              stroke="#c8ece1"
              strokeWidth="2"
              opacity=".55"
            />
          </pattern>
        </defs>
        <rect
          x={view.x - 1000}
          y={view.y - 1000}
          width={view.w + 2000}
          height={view.h + 2000}
          fill="url(#iso-water)"
        />
        <Ground cells={cells} paving={state.paving} editing={mode !== 'play'} />
        {state.layout
          .slice()
          .sort((a, b) => depth(a) - depth(b) || a.x - b.x)
          .map((p) => {
            const f = facilityFor(p.id)
            if (!f) return null
            return (
              <g
                key={p.id}
                data-farm-object={p.id}
                role="button"
                tabIndex={0}
                aria-label={`${f.name} 선택`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (mode === 'edit') {
                      setSelected(p.id)
                      setRotation(p.rotation ?? 0)
                    } else if (farmBuildingIds.includes(f.id)) setBuilding(f.id)
                    else if (f.id === 'farm-plot' || farmAnimalIds.includes(f.id)) setInspect(p.id)
                    else {
                      setMode('edit')
                      setSelected(p.id)
                    }
                  }
                }}
              >
                {selected === p.id && (
                  <polygon
                    points={tilePoints(p.x, p.y, footprint(p).w, footprint(p).h)}
                    fill="#fffbd466"
                    stroke="#fff9d7"
                    strokeWidth="3"
                  />
                )}
                <FarmObject
                  level={buildings.find((b) => b.id === f.id)?.level ?? 1}
                  p={p}
                  crop={cropJobs.find((j) => j.item_id === p.id)}
                  animal={animalJobs.find((j) => j.item_id === p.id)}
                  now={now}
                />
              </g>
            )
          })}
        {ghost && (
          <g pointerEvents="none" opacity=".7">
            <polygon
              points={tilePoints(ghost.x, ghost.y, footprint(ghost).w, footprint(ghost).h)}
              fill={canPlaceFarm(state, ghost, animalLimit) ? '#f2ffd180' : '#ef807e88'}
              stroke="#fff8d9"
              strokeWidth="2"
            />
            <FarmObject
              p={ghost}
              now={now}
              level={buildings.find((b) => b.id === facilityFor(ghost.id)?.id)?.level ?? 1}
            />
          </g>
        )}
        {(stampPlan ? stampPlan.slots.map((slot) => slot.cell) : stroke).map((c) => (
          <polygon
            key={`${c.x},${c.y}`}
            points={tilePoints(c.x, c.y)}
            fill={mode.startsWith('remove') ? '#e59a8588' : '#fff8b477'}
            stroke="#fff5c7"
            strokeWidth="1.5"
            pointerEvents="none"
          />
        ))}
      </svg>
      <header className="iso-header">
        <button aria-label="농장 나가기" onClick={() => void leave()}>
          <ArrowLeft size={19} />
        </button>
        <h1>내 농장</h1>
        <button
          className="iso-store"
          onClick={() => setPanel('inventory')}
          aria-label="농장 창고 열기"
        >
          <Box size={16} />
          <span>
            {used}/{capacity}
          </span>
        </button>
        <span className="iso-gold">
          <GoldIcon className="size-4" />
          {gold.loading ? '…' : wallet.gold.toLocaleString('ko-KR')}
        </span>
      </header>
      <div className="iso-status">
        <span>
          밭 {state.layout.filter((p) => facilityFor(p.id)?.id === 'farm-plot').length}/
          {farm?.plotLimit ?? 4}
        </span>
        <span>
          가축{' '}
          {state.layout.filter((p) => farmAnimalIds.includes(facilityFor(p.id)?.id ?? '')).length}/
          {animalLimit}
        </span>
        <button
          onClick={() => {
            setPanel(null)
            setSelected(null)
            if (mode === 'play') setMode('edit')
            else void finish()
          }}
        >
          {mode === 'play' ? (
            <>
              <Move size={13} />
              편집
            </>
          ) : (
            <>
              <Check size={13} />
              {draft.saving ? '저장 중' : '완료'}
            </>
          )}
        </button>
        <button aria-label="제거 모드" onClick={() => setRemovalOpen((v) => !v)}>
          <Eraser size={15} />
        </button>
      </div>
      {removalOpen && (
        <div className="iso-remove-menu" role="group" aria-label="회수할 대상">
          {[
            ['remove-item', '장식물·밭·동물'],
            ['remove-land', '땅'],
            ['remove-floor', '타일'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setMode(id as Mode)
                setPanel(null)
                setRemovalOpen(false)
                setSelected(null)
                setMessage('클릭하거나 드래그해서 회수하세요.')
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="iso-camera">
        <button
          aria-label="농장 확대"
          onClick={() => setCamera({ ...center, zoom: Math.min(3, center.zoom + 0.2) })}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="농장 축소"
          onClick={() => setCamera({ ...center, zoom: Math.max(0.6, center.zoom - 0.2) })}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="농장 전체 보기"
          onClick={() =>
            setCamera({
              x: (bounds.left + bounds.right) / 2,
              y: (bounds.top + bounds.bottom) / 2 + 25,
              zoom: 0.95,
            })
          }
        >
          전체
        </button>
      </div>
      {(error || draft.error || pending) && !building && !inspect && (
        <div className="iso-error" role="alert">
          <span>{error || draft.error || '이전 요청 결과를 확인해 주세요.'}</span>
          {pending ? (
            <button onClick={() => void run()} disabled={busy}>
              결과 다시 확인
            </button>
          ) : (
            <button onClick={() => void draft.reload()}>다시 불러오기</button>
          )}
        </div>
      )}
      {message && !error && !draft.error && !pending && (
        <p className="iso-message" role="status">
          {message}
        </p>
      )}
      {selected && mode !== 'play' && (
        <div className="iso-object-actions">
          <strong>{selectedType?.name}</strong>
          {canRotate(selected) && (
            <button onClick={rotate}>
              <RotateCw size={16} />
              회전
            </button>
          )}
          {selectedPlacement && (
            <button onClick={recover}>
              <Box size={16} />
              회수
            </button>
          )}
          <button
            aria-label="선택 닫기"
            onClick={() => {
              setSelected(null)
              setGhost(null)
              setMode('edit')
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {mode !== 'play' && (
        <div className="iso-edit-hint">
          <span>
            {mode === 'place'
              ? '빈 땅을 눌러 배치'
              : mode === 'land'
                ? `남은 땅 ${state.landStock}칸`
                : mode === 'floor'
                  ? `${floorTiles.find((t) => t.id === floor)?.name} · ${state.tileStock[floor] ?? 0}개`
                  : mode.startsWith('remove')
                    ? '제거 모드 · 보관함으로 회수'
                    : '물건을 끌어서 이동'}
          </span>
          <button
            disabled={!history.length}
            onClick={() => {
              const old = history.at(-1)
              if (old) {
                draft.setLocal(old)
                setHistory((h) => h.slice(0, -1))
              }
            }}
          >
            <Undo2 size={15} />
          </button>
        </div>
      )}
      <nav className="iso-bottom" aria-label="농장 카테고리">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={panel === id ? 'active' : ''}
            aria-label={id === 'land' ? `땅 추가 ${state.landStock}칸` : label}
            onClick={() => {
              setSelected(null)
              setGhost(null)
              setStorage(false)
              setQuantity(1)
              if (id === 'land' && state.landStock > 0) {
                setMode('land')
                setPanel(null)
              } else {
                setPanel(id)
                setMode('play')
              }
            }}
          >
            <span className="iso-nav-icon">
              <Icon size={21} />
              {id === 'land' && <small>{state.landStock}</small>}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {panel && (
        <aside
          className="iso-drawer"
          aria-label={panel === 'inventory' ? '농장 창고' : '농장 상점'}
        >
          <header>
            <h2>{panel === 'inventory' ? '농장 창고' : nav.find((n) => n.id === panel)?.label}</h2>
            {panel !== 'inventory' && (
              <button className="iso-text-button" onClick={() => setStorage((v) => !v)}>
                {storage ? '상점' : '보관함'}
              </button>
            )}
            <button aria-label="패널 닫기" onClick={() => setPanel(null)}>
              <X size={18} />
            </button>
          </header>
          {panel === 'inventory' ? (
            <>
              <p className="iso-drawer-note">
                보관 중 {used} / {capacity}개{' '}
                <button
                  onClick={() => {
                    setPanel(null)
                    setBuilding('farm-store')
                  }}
                >
                  창고 강화
                </button>
              </p>
              <div className="iso-inventory-list">
                {products
                  .filter((p) => (inventory[p.id] ?? 0) > 0)
                  .map((p) => (
                    <article key={p.id}>
                      <Thumb id={p.id} />
                      <div>
                        <strong>
                          {p.name} × {inventory[p.id]}
                        </strong>
                        <small>
                          개당 <GoldIcon className="size-3" />
                          {p.price}
                        </small>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={blocked}
                        onClick={() => action('sell', p.id, '', p.price, inventory[p.id])}
                      >
                        모두 판매
                      </Button>
                    </article>
                  ))}
                {used === 0 && <p className="iso-empty">아직 보관한 수확물이 없어요.</p>}
              </div>
            </>
          ) : (
            <>
              {!storage && panel !== 'building' && (
                <div className="iso-quantity">
                  <label htmlFor="farm-purchase-quantity">구매 수량</label>
                  <div className="iso-quantity-stepper">
                    <button
                      type="button"
                      aria-label="구매 수량 줄이기"
                      disabled={blocked || quantity <= 1}
                      onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      id="farm-purchase-quantity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      value={quantity}
                      disabled={blocked}
                      onChange={(e) =>
                        setQuantity(
                          Math.min(100, Math.max(1, Math.trunc(Number(e.target.value) || 1))),
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label="구매 수량 늘리기"
                      disabled={blocked || quantity >= 100}
                      onClick={() => setQuantity((n) => Math.min(100, n + 1))}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
              <div className="iso-product-grid">
                {categoryItems.map((product) => {
                  const b = buildings.find((b) => b.id === product.id),
                    ids = stock.filter((id) => facilityFor(id)?.id === product.id),
                    count =
                      product.family === 'land'
                        ? state.landStock
                        : product.family === 'floor'
                          ? (state.tileStock[product.id.slice(6)] ?? 0)
                          : ids.length
                  if (storage && !count) return null
                  return (
                    <article key={product.id}>
                      <Thumb id={product.id} />
                      <h3>{product.name}</h3>
                      <small>
                        {storage
                          ? `보관 ${count}개`
                          : b
                            ? b.level
                              ? `Lv.${b.level}`
                              : '미건설'
                            : `${product.width} × ${product.height}칸`}
                      </small>
                      <button
                        disabled={
                          blocked ||
                          (!storage &&
                            !b &&
                            !(panel === 'animal' && animalLimit === 0) &&
                            wallet.gold < product.price * quantity)
                        }
                        onClick={() => {
                          if (storage) {
                            setPanel(null)
                            if (product.family === 'land') setMode('land')
                            else if (product.family === 'floor') {
                              setFloor(product.id.slice(6) as FloorKind)
                              setMode('floor')
                            } else startPlace(ids[0])
                            return
                          }
                          if (b) {
                            setPanel(null)
                            setBuilding(b.id)
                            return
                          }
                          if (panel === 'animal' && animalLimit === 0) {
                            setPanel(null)
                            setBuilding('farm-barn')
                            return
                          }
                          buy(product.id, product.price, quantity)
                        }}
                      >
                        {storage ? (
                          '꺼내서 배치'
                        ) : b ? (
                          '건설·강화'
                        ) : panel === 'animal' && animalLimit === 0 ? (
                          '외양간 필요'
                        ) : (
                          <>
                            <GoldIcon className="size-3" />
                            {(product.price * quantity).toLocaleString('ko-KR')} · {quantity}개 구매
                          </>
                        )}
                      </button>
                      {!storage && b && ids.length > 0 && (
                        <button className="iso-text-button" onClick={() => startPlace(ids[0])}>
                          농장에 배치
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
              {storage &&
                !categoryItems.some((p) =>
                  p.family === 'land'
                    ? state.landStock > 0
                    : p.family === 'floor'
                      ? (state.tileStock[p.id.slice(6)] ?? 0) > 0
                      : stock.some((id) => facilityFor(id)?.id === p.id),
                ) && <p className="iso-empty">보관 중인 물건이 없어요.</p>}
            </>
          )}
        </aside>
      )}
      <Dialog
        open={!!building}
        onOpenChange={(value) => {
          if (!busy && !value) setBuilding(null)
        }}
      >
        <DialogContent className="iso-dialog">
          <DialogHeader>
            <DialogTitle>
              {buildingType?.name}
              {!!buildingType?.level && <span>Lv.{buildingType.level}</span>}
            </DialogTitle>
            <DialogDescription className="sr-only">
              건물의 한도와 강화 정보를 확인해요.
            </DialogDescription>
          </DialogHeader>
          {(error || draft.error || pending) && (
            <div className="iso-dialog-error" role="alert">
              {error || draft.error || '이전 요청 결과를 확인해 주세요.'}
              {pending && (
                <button disabled={busy} onClick={() => void run()}>
                  결과 다시 확인
                </button>
              )}
            </div>
          )}
          {buildingType && (
            <>
              <div className="iso-building-portrait">
                <Thumb id={buildingType.id} />
              </div>
              <p className="iso-building-limit">
                {buildingType.id === 'farm-office'
                  ? '밭'
                  : buildingType.id === 'farm-store'
                    ? '창고'
                    : '가축'}{' '}
                한도{' '}
                <strong>
                  {buildingType.limit}
                  {buildingType.id === 'farm-barn'
                    ? '마리'
                    : buildingType.id === 'farm-office'
                      ? '칸'
                      : '개'}
                </strong>
              </p>
              {buildingType.level < 5 ? (
                <>
                  <p className="iso-building-next">
                    {buildingType.level ? '강화' : '건설'} 후{' '}
                    <strong>
                      {buildingType.nextLimit}
                      {buildingType.id === 'farm-barn'
                        ? '마리'
                        : buildingType.id === 'farm-office'
                          ? '칸'
                          : '개'}
                    </strong>
                  </p>
                  <Button
                    disabled={blocked || wallet.gold < (buildingType.nextCost ?? 0)}
                    onClick={() => buy(buildingType.id, buildingType.nextCost!)}
                  >
                    <GoldIcon className="size-4" />
                    {buildingType.nextCost?.toLocaleString('ko-KR')} ·{' '}
                    {buildingType.level ? '강화하기' : '건설하기'}
                  </Button>
                </>
              ) : (
                <p className="iso-empty">최고 레벨이에요.</p>
              )}
              {buildingType.id === 'farm-store' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setBuilding(null)
                    setPanel('inventory')
                  }}
                >
                  보관품 보기
                </Button>
              )}
              {stock.find((id) => facilityFor(id)?.id === buildingType.id) && (
                <Button
                  variant="outline"
                  onClick={() =>
                    startPlace(stock.find((id) => facilityFor(id)?.id === buildingType.id)!)
                  }
                >
                  농장에 배치하기
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!inspect}
        onOpenChange={(value) => {
          if (!busy && !value) setInspect(null)
        }}
      >
        <DialogContent className="iso-dialog">
          <DialogHeader>
            <DialogTitle>
              {inspectedType?.id === 'farm-plot'
                ? (cropType?.name ?? '씨앗 심기')
                : inspectedType?.name}
            </DialogTitle>
            <DialogDescription className="sr-only">작물과 가축을 돌봐요.</DialogDescription>
          </DialogHeader>
          {(error || draft.error || pending) && (
            <div className="iso-dialog-error" role="alert">
              {error || draft.error || '이전 요청 결과를 확인해 주세요.'}
              {pending && (
                <button disabled={busy} onClick={() => void run()}>
                  결과 다시 확인
                </button>
              )}
            </div>
          )}
          {inspectedType?.id === 'farm-plot' ? (
            cropJob ? (
              <>
                <div className="iso-building-portrait">
                  <Thumb id={cropJob.crop_id} />
                </div>
                <p className="iso-countdown">
                  {Date.parse(cropJob.ready_at) <= now
                    ? '수확할 준비가 됐어요'
                    : remaining(cropJob.ready_at, now)}
                </p>
                <Button
                  disabled={
                    blocked ||
                    Date.parse(cropJob.ready_at) > now ||
                    used + (cropType?.yield_quantity ?? 0) > capacity
                  }
                  onClick={() => action('harvest', inspect!)}
                >
                  수확하기 · {cropType?.yield_quantity}개
                </Button>
                {used + (cropType?.yield_quantity ?? 0) > capacity && (
                  <p className="iso-empty">창고를 비우거나 강화해 주세요.</p>
                )}
              </>
            ) : (
              <div className="iso-crop-grid">
                {crops.map((c) => (
                  <button
                    key={c.id}
                    disabled={blocked || wallet.gold < c.seed_price}
                    onClick={() => action('plant', inspect!, c.id, c.seed_price)}
                  >
                    <Thumb id={c.id} />
                    <strong>{c.name}</strong>
                    <small>
                      {duration(c.grow_seconds)} · {c.yield_quantity}개
                    </small>
                    <span>
                      <GoldIcon className="size-3" />
                      {c.seed_price}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            animalType && (
              <>
                <div className="iso-building-portrait">
                  <Thumb id={animalType.id} />
                </div>
                {animalJob ? (
                  <>
                    <p className="iso-countdown">
                      {Date.parse(animalJob.ready_at) <= now
                        ? `${animalType.produce_name} 준비 완료`
                        : remaining(animalJob.ready_at, now)}
                    </p>
                    <Button
                      disabled={
                        blocked ||
                        Date.parse(animalJob.ready_at) > now ||
                        used + animalType.yield_quantity > capacity
                      }
                      onClick={() => action('collect', inspect!)}
                    >
                      {animalType.produce_name} 받기
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="iso-countdown">
                      먹이를 주면 {duration(animalType.produce_seconds)} 뒤{' '}
                      {animalType.produce_name}을 받아요.
                    </p>
                    {['wheat', 'corn'].map((kind) => (
                      <Button
                        key={kind}
                        variant="outline"
                        disabled={blocked || (inventory[kind] ?? 0) < animalType.feed_quantity}
                        onClick={() => action('feed', inspect!, kind)}
                      >
                        {kind === 'wheat' ? '밀' : '옥수수'} × {animalType.feed_quantity} 주기{' '}
                        <small>보유 {inventory[kind] ?? 0}</small>
                      </Button>
                    ))}
                    {(inventory.wheat ?? 0) < animalType.feed_quantity &&
                      (inventory.corn ?? 0) < animalType.feed_quantity && (
                        <p className="iso-empty">밀이나 옥수수를 먼저 수확해 주세요.</p>
                      )}
                  </>
                )}
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
export function Thumb({ id }: { id: string }) {
  if (id === 'farm-white-fence')
    return (
      <svg viewBox="-40 -35 80 80" aria-hidden="true">
        <WhiteFence p={{ id, x: 0, y: 0 }} />
      </svg>
    )
  if (id === 'farm-plot' || id === 'land-piece' || id.startsWith('floor-'))
    return (
      <svg viewBox="-38 -5 76 55" aria-hidden="true">
        {id === 'farm-plot' ? (
          <FarmObject p={{ id, x: 0, y: 0 }} now={0} />
        ) : (
          <Ground
            cells={[{ x: 0, y: 0 }]}
            paving={id.startsWith('floor-') ? [{ x: 0, y: 0, type: id.slice(6) }] : []}
            editing={false}
          />
        )}
      </svg>
    )
  if (['egg', 'milk', 'wool'].includes(id))
    return (
      <span className="iso-produce-icon" aria-hidden="true">
        {id === 'egg' ? '🥚' : id === 'milk' ? '🥛' : '🧶'}
      </span>
    )
  return (
    <svg viewBox="-82 -150 164 164" aria-hidden="true">
      <FarmSprite id={id} size={150} stage={2} />
    </svg>
  )
}
