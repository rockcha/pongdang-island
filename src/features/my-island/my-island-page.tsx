import {FarmOffice} from './farm-office'
import {farmCategories, farmCategory, farmCamera, type FarmCategory} from './farm-model'
import {
  storedDecorationIds,
  supportsLinePlacement,
  planDecorationPlacement,
  applyDecorationPlacement,
} from './island-batch-placement'
import { extendLandStroke, planLandStroke, planFloorStroke } from './island-land-placement'
import { planDecorationRemoval } from './island-batch-placement'
import { buyIslandBatch } from './island-purchase'
import { PlacementTerrainBadge } from './placement-terrain-badge'
import { landOutlinePath } from './terrain-outline'
import { randomId } from '@/lib/random-id'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  Flower2, House, Sprout, Layers3,
  Archive,
  Eraser,
  FlipHorizontal,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Maximize,
  Plus,
  ShoppingBag,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Move,
  Smartphone,
  RotateCw,
  RotateCcw,
  Pencil,
  MoreHorizontal,
  MapPin,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { useAccountResource } from '@/lib/account-query'
import {
  readIsland,
  saveIsland,
  tradeIsland,
  islandError,
  definitiveIslandError,
  type IslandTradeArgs,
} from './api'
import { useIslandDraft, type IslandPersistence } from './use-island-draft'
import {
  resetIslandDocument,
  islandProductId,
  islandMaterialOffer,
  retainIslandSignLabels,
  type IslandOffer,
} from './island-document'
import {
  IslandTradeDialog,
  IslandAcquiredDialog,
  type AcquiredIslandItem,
} from './island-commerce-dialogs'
import { playIslandPlacement } from './island-sound'
import {
  addLand,
  decorationConnections,
  moveLand,
  storeLand,
  LAND_PRICE,
  isLand,
  footprint,
  canRotate,
  canFlipSign,
  limitSignText,
  canPlace,
  facilities,
  facilityFor,
  readState,
  WORLD,
  sellDecoration,
  decorationSellPrice,
  defaultState,
  floorTiles,
} from './island-model'
import type { Cell, Facility, IslandState, Placement, FloorKind } from './island-model'
import { FloorPatterns, FloorSwatch } from './floor-art'
import { Building } from './island-art'
import { FacilityCaption } from './facility-caption'
import { IslandPlacesDialog } from './island-places-dialog'
import { buildingViewBox } from './island-art-sizing'
import './my-island.css'
import './island-account.css'
import './farm.css'
import {
  ownedFacilities,
  localIslandState,
  visibleIslandState,
  isDecoration,
  createDefaultIsland,
  readPageIsland,
} from './owned-facilities'

function LandThumbnail() {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <rect x="8" y="16" width="56" height="45" rx="9" fill="#d4bf9d" />
      <rect
        x="8"
        y="10"
        width="56"
        height="44"
        rx="9"
        fill="#e7d2b5"
        stroke="#cfb794"
        strokeWidth="1.5"
      />
      <path
        d="M19 29h4m19 13h3M42 20h4"
        fill="none"
        stroke="#cbb18e"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
const Terrain = memo(function Terrain({
  land,
  removedLand,
  farm=false,
}: {
  land: Cell[]
  removedLand: Cell[]
  farm?: boolean
}) {
  const cells: Cell[] = []
  for (let y = 0; y < 36; y++)
    for (let x = 0; x < 40; x++) if (isLand(x, y, land, removedLand)) cells.push({ x, y })
  const outline = landOutlinePath(cells)
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id="island-water" width="95" height="75" patternUnits="userSpaceOnUse">
          <rect width="95" height="75" fill="#80bec5" />
          <path
            d="M10 28q10 5 20 0M55 60q9 4 18 0"
            stroke="#d9f3e8"
            opacity=".45"
            fill="none"
            strokeWidth="2"
          />
        </pattern>
        <pattern id="island-ground" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill={farm ? '#cbd9a8' : '#efddbc'} />
          <path d={farm ? 'M8 29l2-3 2 3m19-9 2-3 2 3' : 'M9 29h3m21-9h2'} stroke={farm ? '#a2b77e' : '#ceb18a'} opacity=".32" fill="none" />
        </pattern>
        <pattern id="island-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#ffffe9" strokeOpacity=".4" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="-2000" y="-2000" width="5280" height="5152" fill="url(#island-water)" />
      <path d={outline} fill="none" stroke="#64a4ad" strokeWidth="23" strokeLinejoin="round" opacity=".4" transform="translate(0 6)" />
      <path d={outline} fill="none" stroke="#c7eadd" strokeWidth="15" strokeLinejoin="round" />
      <path d={outline} fill="url(#island-ground)" fillRule="evenodd" />
      <path d={outline} fill="none" stroke="#fff0cd" strokeWidth="6" strokeLinejoin="round" />
      {!farm && <text x="640" y="1100" textAnchor="middle" fill="#e5f2dc" fontSize="14" letterSpacing="7">
        PONGDANG ISLAND
      </text>}
    </g>
  )
})
type Camera = { x: number; y: number; zoom: number }
const defaultCamera = (): Camera => ({
  x: 640,
  y: 600,
  zoom: window.innerWidth > window.innerHeight && window.innerHeight < 600 ? 0.75 : 0.95,
})
const accountCamera = (): Camera => ({
  x: 640,
  y: 575,
  zoom: window.innerWidth > window.innerHeight ? (window.innerHeight < 600 ? 2.1 : 1.35) : 3,
})
type Gesture = {
  kind:
    'pan' | 'item' | 'batch' | 'land-paint' | 'land-remove' | 'decoration-remove' | 'floor-paint'
  cells?: Cell[]
  land?: Cell
  id?: string
  px: number
  py: number
  cx: number
  cy: number
  dx: number
  dy: number
  moved: boolean
}
const pageBuildings = ownedFacilities()
const cleanupDecoration = facilityFor('bench')!
export function MyIslandPage({farm=false}: {farm?:boolean}) {
  const { session } = useAuth()
  if (!session) return <IslandPreviewPage />
  return <AccountIsland key={session.user.id} userId={session.user.id} farm={farm} />
}
type IslandAccount = IslandPersistence & {
  gold: number
  walletLoading: boolean
  walletError: string
  trade: typeof tradeIsland
}
function AccountIsland({ userId, farm=false }: { userId: string; farm?:boolean }) {
  const query = useAccountResource('island', readIsland),
    gold = useGold()
  const refetchIsland = query.refetch
  const reload = useCallback(async () => {
    const result = await refetchIsland()
    if (result.error) throw result.error
    return result.data
  }, [refetchIsland])
  useEffect(() => {
    const key = `pongdang:island:v2:${userId}`
    try {
      const old = localStorage.getItem(key)
      if (old && !localStorage.getItem(key + ':prototype-backup'))
        localStorage.setItem(key + ':prototype-backup', old)
    } catch {
      /* A local backup must not block account loading. */
    }
  }, [userId])
  if (!query.data)
    return (
      <section className="island-account-loading">
        <span className="island-account-orb" />
        <h1>{query.error ? '섬을 불러오지 못했어요' : farm ? '농장으로 가는 중…' : '나의 섬으로 가는 중…'}</h1>
        {query.error && (
          <>
            <p>{islandError(query.error)}</p>
            <button onClick={() => void query.refetch()}>다시 불러오기</button>
          </>
        )}
      </section>
    )
  return (
    <IslandEditor
      farm={farm}
      storageKey={`pongdang:island:v2:${userId}`}
      managed={farm ? [] : pageBuildings.filter(f=>query.data.catalog.some(item=>item.family==='facility'&&item.id===f.id))}
      account={{
        snapshot: query.data,
        gold: gold.wallet.gold,
        walletLoading: gold.loading,
        walletError: gold.error,
        save: saveIsland,
        reload,
        trade: tradeIsland,
      }}
    />
  )
}
/** Isolated editor sandbox; production accounts always use the server-backed page. */
export function IslandPreviewPage() {
  const { session } = useAuth()
  return (
    <IslandEditor
      key={session?.user.id ?? 'guest'}
      storageKey={`pongdang:island:v2:${session?.user.id ?? 'guest'}`}
      managed={pageBuildings}
    />
  )
}
export function IslandEditor({
  storageKey,
  farm=false,
  managed,
  account,
}: {
  storageKey: string
  farm?:boolean
  managed?: Facility[]
  account?: IslandAccount
}) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const resetHandled = useRef(false)
  const live = managed !== undefined
  const accountEnabled = Boolean(account),
    accountGold = account?.gold
  const managedMap = useMemo(() => new Map((managed ?? []).map((f) => [f.id, f])), [managed])
  const resolve = (id: string) => managedMap.get(id) ?? facilityFor(id)
  const draftController = useIslandDraft(account, () =>
    live ? readPageIsland(storageKey) : readState(storageKey),
  )
  const { local, setLocal } = draftController
  const [history, setHistory] = useState<IslandState[]>([]),
    [editing, setEditing] = useState(farm || !account),
    [more, setMore] = useState(false),
    [placesOpen, setPlacesOpen] = useState(false),
    [officeOpen, setOfficeOpen] = useState(false),
    [offer, setOffer] = useState<IslandOffer | null>(null),
    [selling, setSelling] = useState<string | null>(null),
    [tradeOpen, setTradeOpen] = useState(false),
    [tradeBusy, setTradeBusy] = useState(false),
    [tradeError, setTradeError] = useState(''),
    [retryingTrade, setRetryingTrade] = useState(false),
    [acquired, setAcquired] = useState<AcquiredIslandItem | null>(null),
    [placementEffect, setPlacementEffect] = useState<(Placement & { key: number }) | null>(null),
    [signText, setSignText] = useState(''),
    [tool, setTool] = useState<
      'edit' | 'land' | 'land-remove' | 'decoration-remove' | 'tile-remove' | 'floor'
    >('edit'),
    [floor, setFloor] = useState<FloorKind | 'bare'>('dirt'),
    [rotation, setRotation] = useState(0),
    [panel, setPanel] = useState<'shop' | 'storage' | null>(null),
    [cleanupOpen, setCleanupOpen] = useState(false),
    [category, setCategory] = useState<'all' | 'building' | 'decoration' | 'floor' | 'land' | FarmCategory>(farm ? 'plot' : 'all'),
    [search, setSearch] = useState(''),
    [purchaseQuantityInput, setPurchaseQuantityInput] = useState('1'),
    [selected, setSelected] = useState<string | null>(null),
    [selectedLand, setSelectedLand] = useState<Cell | null>(null),
    [pending, setPending] = useState(false),
    [batchType, setBatchType] = useState<string | null>(null),
    [batchPreview, setBatchPreview] = useState<{ from: Cell; to: Cell } | null>(null),
    [batchSteps, setBatchSteps] = useState(0),
    [movingLand, setMovingLand] = useState<Cell | null>(null),
    [landPreview, setLandPreview] = useState<Cell | null>({ x: 20, y: 17 }),
    [landStroke, setLandStroke] = useState<Cell[] | null>(null),
    [landPulse, setLandPulse] = useState<(Cell & { key: number }) | null>(null),
    [dragging, setDragging] = useState(false),
    [ghost, setGhost] = useState<Placement | null>(null),
    [message, setMessage] = useState(
      account
        ? ''
        : '땅을 누르고 이동 버튼으로 옮겨보세요. 시설은 드래그로 옮기고, 빈 곳을 끌면 화면이 이동해요.',
    ),
    [saveStatus, setSaveStatus] = useState('이 기기에 저장'),
    [size, setSize] = useState(
      account ? { w: window.innerWidth, h: window.innerHeight } : { w: 1000, h: 750 },
    ),
    [camera, setCamera] = useState<Camera>(() => (farm ? farmCamera(local, window.innerWidth, window.innerHeight) : account ? accountCamera() : defaultCamera()))
  const initialFarmTerrain = useRef(local)
  const wasLandscape = useRef(window.innerWidth > window.innerHeight)
  useEffect(() => {
    if (!accountEnabled || farm) return
    const landscape = size.w > size.h
    if (landscape !== wasLandscape.current) {
      wasLandscape.current = landscape
      setCamera(accountCamera())
    }
  }, [size.w, size.h, accountEnabled, farm])
  const tradePending = useRef<IslandTradeArgs | null>(null),
    tradeInFlight = useRef(false),
    tradeActive = useRef(true),
    received = useRef(new Set<string>())
  useEffect(() => {
    tradeActive.current = true
    return () => {
      tradeActive.current = false
    }
  }, [])
  useEffect(() => {
    if (!accountEnabled || editing || !message) return
    const timer = setTimeout(() => setMessage(''), 2800)
    return () => clearTimeout(timer)
  }, [message, editing, accountEnabled])
  const state = useMemo(
    () => ({
      ...(live ? visibleIslandState(local, managed ?? []) : local),
      ...(accountGold !== undefined ? { coins: accountGold } : {}),
      ...(farm ? {farmPlotLimit:account?.snapshot.farm?.plotLimit??4} : {}),
    }),
    [local, managed, live, accountGold, farm, account?.snapshot.farm?.plotLimit],
  )
  const root = useRef<HTMLElement>(null),
    svg = useRef<SVGSVGElement>(null),
    gesture = useRef<Gesture | null>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef<{
      distance: number
      zoom: number
      x: number
      y: number
      cx: number
      cy: number
    } | null>(null)
  const fit = Math.min(size.w / WORLD.width, size.h / WORLD.height),
    scale = fit * camera.zoom
  const current = selected && state.owned.includes(selected) ? resolve(selected) : undefined,
    placed = state.layout.some((p) => p.id === selected)
  const batchStock = batchType ? storedDecorationIds(state, batchType) : []
  const purchaseQuantity = Math.max(
    1,
    Math.min(100, Math.floor(Number(purchaseQuantityInput) || 1)),
  )
  const shopQuantity = account ? 1 : purchaseQuantity
  const batchPlan =
    batchType && batchPreview
      ? planDecorationPlacement(state, batchType, batchPreview.from, batchPreview.to, rotation)
      : null
  const landRemoving = tool === 'land-remove'
  const decorationRemoving = tool === 'decoration-remove'
  const tileRemoving = tool === 'tile-remove'
  const floorEditing = tool === 'floor' || tileRemoving
  const floorPlan =
    landStroke && floorEditing
      ? planFloorStroke(state, landStroke, tileRemoving ? 'bare' : floor)
      : null
  const decorationRemoval =
    decorationRemoving && landStroke ? planDecorationRemoval(state, landStroke) : null
  const landPlan =
    landStroke && !decorationRemoving && !floorEditing
      ? planLandStroke(state, landStroke, landRemoving ? 'remove' : 'place')
      : null
  const hasSelection = tool === 'edit' && !panel && !!(current || selectedLand)
  useEffect(() => {
    if (tool === 'land' && !panel)
      setLandPreview({ x: Math.floor(camera.x / 32), y: Math.floor(camera.y / 32) })
  }, [tool, panel])
  useEffect(() => {
    if (tool !== 'land' || panel) setMovingLand(null)
    if (tool === 'edit' || panel) setLandStroke(null)
  }, [tool, panel])
  const showGrid =
    editing &&
    !panel &&
    (floorEditing ||
      tool === 'land' ||
      landRemoving ||
      decorationRemoving ||
      !!current ||
      !!selectedLand ||
      pending)
  const selectionMode = hasSelection
    ? pending && (!placed || batchType)
      ? 'placing'
      : 'bottom'
    : null
  const mapWidth = size.w
  const mapHeight = size.h
  const view = {
    x: camera.x - mapWidth / scale / 2,
    y: camera.y - mapHeight / scale / 2,
    w: mapWidth / scale,
    h: mapHeight / scale,
  }
  function resetStarter() {
    if (account) {
      if ((account.snapshot.stocks['land-piece'] ?? 0) < 775) {
        setMessage('기본 배치에는 땅 775칸이 필요해요. 상점에서 부족한 땅을 구매해주세요.')
        return
      }
      const reset = resetIslandDocument(account.snapshot)
      change({ ...state, ...reset })
      setSelected(null)
      setSelectedLand(null)
      setPanel(null)
      setMore(false)
      setTool('edit')
      setPending(false)
      setMessage('헤더 분류에 맞춰 바다·생산·광장 등 구역별로 정리했어요. 남은 물건은 보관함에 있어요.')
      return
    }
    setHistory((h) => [...h.slice(-29), local])
    setLocal(live ? createDefaultIsland() : defaultState())
    setTool('edit')
    setSelected(null)
    setSelectedLand(null)
    setPending(false)
    setPanel(null)
    setGhost(null)
    setSearch('')
    setCamera(defaultCamera())
    setMessage('새 기본 배치로 되돌렸어요. 광장의 도감·유물·지도와 쉼터의 음악·게임을 둘러보세요.')
  }
  useEffect(() => {
    if (farm || params.get('reset') !== 'starter') {
      resetHandled.current = false
      return
    }
    if (resetHandled.current) return
    resetHandled.current = true
    resetStarter()
    const next = new URLSearchParams(params)
    next.delete('reset')
    setParams(next, { replace: true })
  }, [params, setParams, live, local, farm])
  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const {width:w,height:h}=entry.contentRect
      setSize({w,h})
      if(farm) setCamera(farmCamera(initialFarmTerrain.current,w,h))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [farm])
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (!event.deltaY || pointers.current.size) return
      const matrix = el.getScreenCTM()
      if (!matrix) return
      const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1
      const delta = Math.max(-240, Math.min(240, event.deltaY * unit))
      setCamera((c) => {
        const zoom = Math.min(4, Math.max(0.7, c.zoom * Math.exp(-delta * 0.0015)))
        const ratio = c.zoom / zoom
        return {
          zoom,
          x: Math.max(0, Math.min(WORLD.width, anchor.x + (c.x - anchor.x) * ratio)),
          y: Math.max(0, Math.min(WORLD.height, anchor.y + (c.y - anchor.y) * ratio)),
        }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])
  useEffect(() => {
    if (accountEnabled) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(live ? localIslandState(local) : local))
      setSaveStatus('저장됨')
    } catch {
      setSaveStatus('저장 실패')
      setMessage('저장 공간을 사용할 수 없어요. 창을 닫기 전에 브라우저 설정을 확인해주세요.')
    }
  }, [local, storageKey, live, accountEnabled])
  useEffect(() => {
    const el = root.current
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCleanupOpen(false)
        setBatchType(null)
        setBatchPreview(null)
        setBatchSteps(0)
        gesture.current = null
        pointers.current.clear()
        pinch.current = null
        setDragging(false)
        setTool('edit')
        setPanel(null)
        setSelected(null)
        setSelectedLand(null)
        setPending(false)
        setGhost(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = before
      window.removeEventListener('keydown', onKey)
      if (document.fullscreenElement === el) void document.exitFullscreen().catch(() => {})
    }
  }, [])
  useEffect(() => {
    setSignText(
      state.layout.find((p) => p.id === selected)?.label ??
        (selected ? state.signLabels?.[selected] : undefined) ??
        '',
    )
  }, [selected, state.layout, state.signLabels])
  function change(next: IslandState) {
    next = retainIslandSignLabels(state, next)
    setSelectedLand(null)
    setHistory((h) => [...h.slice(-29), local])
    setLocal(live ? localIslandState(next) : next)
    if (account) {
      playIslandPlacement()
      const changed = next.layout.find(
        (p) =>
          !state.layout.some(
            (old) =>
              old.id === p.id && old.x === p.x && old.y === p.y && old.rotation === p.rotation,
          ),
      )
      if (changed) setPlacementEffect({ ...changed, key: Date.now() })
    }
  }
  function point(e: { clientX: number; clientY: number }) {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: Math.floor(p.x / 32), y: Math.floor(p.y / 32) }
  }
  function placeOffice(id:string){
    finishBatch()
    setPanel(null)
    setEditing(true)
    setSelected(id)
    setSelectedLand(null)
    setTool('edit')
    setRotation(0)
    setPending(!state.layout.some(p=>p.id===id))
    setMessage('빈 땅에 텃밭 관리소를 놓아주세요. · 2 × 2칸')
  }
  function place(input: Placement) {
    const p = {
      ...input,
      ...((state.layout.find((p) => p.id === input.id)?.label ?? state.signLabels?.[input.id]) !==
      undefined
        ? {
            label:
              state.layout.find((p) => p.id === input.id)?.label ?? state.signLabels?.[input.id],
          }
        : {}),
      rotation:
        input.rotation ??
        (selected === input.id
          ? rotation
          : (state.layout.find((p) => p.id === input.id)?.rotation ?? 0)),
    }
    if (!state.owned.includes(p.id)) return
    if(farm && resolve(p.id)?.kind==='farm-plot' && !state.layout.some(old=>old.id===p.id) && state.layout.filter(old=>resolve(old.id)?.kind==='farm-plot').length>=(state.farmPlotLimit??4)){
      setMessage('밭 한도에 도달했어요. 텃밭 관리소를 강화해 주세요.')
      return
    }
    if (canPlace(state.layout, p, state.land, state.removedLand, state.farmPlotLimit)) {
      change({ ...state, layout: [...state.layout.filter((i) => i.id !== p.id), p] })
      setPending(false)
      setMessage('배치했어요. 다른 시설도 자유롭게 옮겨보세요.')
    } else
      setMessage(
        resolve(p.id)?.kind === 'dock'
          ? '항구를 육지에 걸쳐 놓고 바다 쪽으로 향하게 해주세요. 항구의 방향은 고정돼요.'
          : resolve(p.id)?.placementTerrain === 'water'
            ? '다리와 징검돌은 다른 구조물과 겹치지 않는 바다 위에 배치해주세요.'
            : resolve(p.id)?.placementTerrain === 'any'
              ? '다른 시설과 겹치지 않는 육지나 바다에 놓아주세요.'
              : '육지 안쪽의 다른 시설과 겹치지 않는 곳에 놓아주세요.',
      )
  }
  function finishBatch() {
    setBatchType(null)
    setBatchPreview(null)
    setBatchSteps(0)
    setSelected(null)
    setPending(false)
    setGhost(null)
    gesture.current = null
  }
  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setLocal(previous)
    setHistory((h) => h.slice(0, -1))
    setSelectedLand(null)
    setBatchPreview(null)
    if (batchType) {
      const next = storedDecorationIds(previous, batchType)[0]
      if (next) setSelected(next)
      setPending(true)
      setBatchSteps((n) => Math.max(0, n - 1))
    } else {
      setSelected(null)
      setPending(false)
    }
    setMessage('이전 상태로 되돌렸어요.')
  }
  function commitBatch(from: Cell, to: Cell) {
    if (!batchType) return
    const result = applyDecorationPlacement(state, batchType, from, to, rotation)
    if (!result) {
      if(farm && batchType==='farm-plot' && state.layout.filter(p=>resolve(p.id)?.kind==='farm-plot').length>=(state.farmPlotLimit??4)){setMessage('밭 한도에 도달했어요. 텃밭 관리소를 강화해 주세요.');setBatchPreview(null);return}
      setMessage(
        batchStock.length ? '놓을 수 있는 빈 칸을 골라주세요.' : '보유한 장식물을 모두 배치했어요.',
      )
      setBatchPreview(null)
      return
    }
    change(result.state)
    setBatchSteps((n) => n + 1)
    if (result.plan.remaining === 0) finishBatch()
    else {
      setSelected(storedDecorationIds(result.state, batchType)[0])
      setPending(true)
      setBatchPreview(null)
    }
    setMessage(
      `${result.plan.placements.length}개를 배치했어요. · 남은 수량 ${result.plan.remaining}개`,
    )
  }
  function zoom(delta: number) {
    setCamera((c) => ({ ...c, zoom: Math.min(4, Math.max(0.7, c.zoom + delta)) }))
  }
  function toggleLandPlacement() {
    setCleanupOpen(false)
    setSelectedLand(null)
    setEditing(true)
    finishBatch()
    if (tool === 'land') {
      setTool('edit')
      setMessage('땅 배치를 마쳤어요.')
      return
    }
    setCategory('land')
    setSearch('')
    if (state.landStock === 0) {
      setTool('edit')
      setPanel('shop')
      setMessage('상점에서 땅을 구매한 뒤 배치해주세요.')
      return
    }
    setTool('land')
    setPanel(null)
    setMessage(`빈 바다를 눌러 보관한 땅을 배치하세요. · 남은 땅 ${state.landStock}칸`)
  }
  const cleanupRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!cleanupOpen) return
    const outside = (e: PointerEvent) => {
      if (!cleanupRef.current?.contains(e.target as Node)) setCleanupOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [cleanupOpen])
  function startRemoval(mode: 'land-remove' | 'decoration-remove' | 'tile-remove') {
    setEditing(true)
    setCleanupOpen(false)
    gesture.current = null
    pointers.current.clear()
    pinch.current = null
    setLandStroke(null)
    setLandPreview(null)
    setMovingLand(null)
    setSelected(null)
    setSelectedLand(null)
    setPending(false)
    setBatchType(null)
    setBatchPreview(null)
    setBatchSteps(0)
    setGhost(null)
    setDragging(false)
    setPanel(null)
    setTool(tool === mode ? 'edit' : mode)
    setMessage(
      mode === 'tile-remove'
        ? '걷어낼 바닥 타일을 클릭하거나 드래그하세요. 타일은 보관함으로 돌아가고 땅과 시설은 유지해요.'
        : mode === 'land-remove'
          ? '제거할 땅을 클릭하거나 드래그하세요. 시설이 있는 칸은 건너뛰고 땅과 타일은 보관함으로 돌아가요.'
          : '장식물을 클릭하거나 드래그하세요. 울타리와 장식물을 보관함에 넣고 건물과 땅은 유지해요.',
    )
  }
  function down(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: camera.zoom,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        cx: camera.x,
        cy: camera.y,
      }
      gesture.current = null
      setGhost(null)
      setDragging(false)
      setLandStroke(null)
      return
    }
    if (pointers.current.size > 2) return
    const id =
      (e.target as Element).closest('[data-island-object]')?.getAttribute('data-island-object') ??
      undefined
    const p = state.layout.find((p) => p.id === id)
    if (editing && p && tool === 'edit' && !batchType) {
      setPanel(null)
      setCleanupOpen(false)
      setSelectedLand(null)
      setSelected(p.id)
      setRotation(p.rotation ?? 0)
      setPending(false)
    }
    const at = point(e)
    if (tool === 'land') setLandPreview(at)
    const cells =
      editing &&
      (floorEditing || decorationRemoving || landRemoving || (tool === 'land' && !movingLand))
        ? extendLandStroke([], at)
        : undefined
    if (cells) setLandStroke(cells)
    if (batchType && pending) setBatchPreview({ from: at, to: at })
    gesture.current = {
      kind: cells
        ? floorEditing
          ? 'floor-paint'
          : decorationRemoving
            ? 'decoration-remove'
            : landRemoving
              ? 'land-remove'
              : 'land-paint'
        : editing && batchType && pending
          ? 'batch'
          : editing && tool === 'edit' && p
            ? 'item'
            : 'pan',
      cells,
      land: at,
      id,
      px: e.clientX,
      py: e.clientY,
      cx: camera.x,
      cy: camera.y,
      dx: p ? at.x - p.x : 0,
      dy: p ? at.y - p.y : 0,
      moved: false,
    }
  }
  function move(e: ReactPointerEvent<SVGSVGElement>) {
    if (tool === 'land' && !pinch.current) setLandPreview(point(e))
    if (batchType && pending && !pinch.current && !pointers.current.has(e.pointerId)) {
      const at = point(e)
      setBatchPreview({ from: at, to: at })
    }
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const z =
        (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
        Math.max(1, pinch.current.distance)
      const pan = pinch.current
      setCamera((c) => ({
        ...c,
        zoom: Math.min(4, Math.max(0.7, z)),
        x: Math.max(
          0,
          Math.min(WORLD.width, pan.cx - ((a.x + b.x) / 2 - pan.x) / (fit * pan.zoom)),
        ),
        y: Math.max(
          0,
          Math.min(WORLD.height, pan.cy - ((a.y + b.y) / 2 - pan.y) / (fit * pan.zoom)),
        ),
      }))
      return
    }
    const g = gesture.current
    if (!g) return
    if (Math.hypot(e.clientX - g.px, e.clientY - g.py) > 5) g.moved = true
    if (!g.moved) return
    if (
      g.kind === 'land-paint' ||
      g.kind === 'land-remove' ||
      g.kind === 'decoration-remove' ||
      g.kind === 'floor-paint'
    ) {
      const at = point(e)
      g.cells = extendLandStroke(g.cells ?? [], at, g.land)
      g.land = at
      setLandStroke(g.cells)
      return
    }
    if (g.kind === 'batch' && g.land) {
      setBatchPreview({ from: g.land, to: point(e) })
      return
    }
    if (g.kind === 'pan')
      setCamera((c) => ({
        ...c,
        x: Math.max(0, Math.min(WORLD.width, g.cx - (e.clientX - g.px) / scale)),
        y: Math.max(0, Math.min(WORLD.height, g.cy - (e.clientY - g.py) / scale)),
      }))
    else if (g.id) {
      setDragging(true)
      const p = point(e)
      setGhost({
        id: g.id,
        x: p.x - g.dx,
        y: p.y - g.dy,
        rotation: state.layout.find((p) => p.id === g.id)?.rotation ?? 0,
      })
    }
  }
  function up(e: ReactPointerEvent<SVGSVGElement>) {
    setDragging(false)
    pointers.current.delete(e.pointerId)
    if (pinch.current) {
      if (pointers.current.size === 0) pinch.current = null
      gesture.current = null
      return
    }
    const g = gesture.current
    gesture.current = null
    if (!g) return
    if (!editing) {
      if (!g.moved && g.id) {
        setSelected(g.id)
        setSelectedLand(null)
        setPending(false)
      } else if (!g.moved) setSelected(null)
      setGhost(null)
      return
    }
    if (g.kind === 'floor-paint') {
      const type = tileRemoving ? 'bare' : floor,
        plan = planFloorStroke(state, extendLandStroke(g.cells ?? [], point(e), g.land), type)
      setLandStroke(null)
      if (plan.count) {
        change(plan.state)
        setMessage(
          type === 'bare'
            ? `타일 ${plan.count}칸을 보관함으로 돌려보냈어요.`
            : `타일 ${plan.count}칸을 깔았어요. · 남은 타일 ${plan.state.tileStock[type] ?? 0}개`,
        )
      } else
        setMessage(
          type === 'bare'
            ? '걷어낼 타일이 있는 땅을 골라주세요.'
            : '땅 위에 배치하세요. 남은 타일 수량도 확인해주세요.',
        )
      if (type !== 'bare' && !plan.state.tileStock[type]) setTool('edit')
      return
    }
    if (g.kind === 'decoration-remove') {
      const plan = planDecorationRemoval(state, extendLandStroke(g.cells ?? [], point(e), g.land))
      setLandStroke(null)
      if (plan.count) {
        change(plan.state)
        setMessage(
          `장식물 ${plan.count}개를 보관함에 넣었어요. 되돌리기로 한 번에 복구할 수 있어요.`,
        )
      } else setMessage('울타리나 장식물을 클릭하거나 드래그하세요. 건물과 땅은 그대로 유지돼요.')
      return
    }
    if (g.kind === 'land-paint' || g.kind === 'land-remove') {
      const removing = g.kind === 'land-remove'
      const plan = planLandStroke(
        state,
        extendLandStroke(g.cells ?? [], point(e), g.land),
        removing ? 'remove' : 'place',
      )
      setLandStroke(null)
      if (plan.count) {
        change(plan.state)
        setLandPulse({ ...point(e), key: Date.now() })
        setMessage(
          removing
            ? `땅 ${plan.count}칸을 보관했어요. · 보관한 땅 ${plan.state.landStock}칸`
            : `땅 ${plan.count}칸을 배치했어요. · 남은 땅 ${plan.state.landStock}칸`,
        )
      } else
        setMessage(
          removing
            ? '시설이 있거나 다른 배치를 지탱하는 땅은 제거할 수 없어요. 빈 땅을 골라주세요.'
            : state.landStock
              ? '빈 바다 칸에 땅을 놓아주세요.'
              : '보관한 땅을 모두 배치했어요.',
        )
      if (!removing && plan.state.landStock === 0) {
        setTool('edit')
        setLandPreview(null)
      }
      return
    }
    if (g.kind === 'batch' && g.land) {
      commitBatch(g.land, point(e))
      return
    }
    if (tool === 'land' && !g.moved) {
      const next = movingLand ? moveLand(state, movingLand, point(e)) : addLand(state, point(e))
      if (next) {
        change(next)
        setLandPulse({ ...point(e), key: Date.now() })
        if (movingLand) {
          setMovingLand(null)
          setTool('edit')
          setSelectedLand(point(e))
        } else if (next.landStock === 0) {
          setTool('edit')
          setLandPreview(null)
        }
        setMessage(movingLand ? '땅 조각과 타일을 함께 옮겼어요.' : '보관한 땅을 배치했어요.')
      } else
        setMessage(
          !movingLand && state.landStock === 0
            ? '보관한 땅이 없어요. 상점에서 땅을 먼저 구매해주세요.'
            : '빈 바다 칸을 눌러주세요. 부두가 있는 칸에는 땅을 놓을 수 없어요.',
        )
    } else if (g.kind === 'item' && g.moved && g.id) {
      const p = point(e)
      place({
        id: g.id,
        x: p.x - g.dx,
        y: p.y - g.dy,
        rotation: state.layout.find((p) => p.id === g.id)?.rotation ?? 0,
      })
      setSelectedLand(null)
      setSelected(g.id)
      setRotation(state.layout.find((p) => p.id === g.id)?.rotation ?? 0)
    } else if (!g.moved && g.id && tool === 'edit') {
      setSelectedLand(null)
      setSelected(g.id)
      setRotation(state.layout.find((p) => p.id === g.id)?.rotation ?? 0)
      setPending(false)
      if(farm && resolve(g.id)?.kind==='farm-office')setOfficeOpen(true)
    } else if (!g.moved && !g.id && pending && selected) place({ ...point(e), id: selected })
    else if (!g.moved && !g.id) {
      setSelected(null)
      setPending(false)
      const cell = point(e)
      setSelectedLand(
        tool === 'edit' && isLand(cell.x, cell.y, state.land, state.removedLand) ? cell : null,
      )
    }
    setGhost(null)
  }
  function cancel(e: ReactPointerEvent<SVGSVGElement>) {
    setLandStroke(null)
    setDragging(false)
    pointers.current.delete(e.pointerId)
    gesture.current = null
    pinch.current = null
    setGhost(null)
    setBatchPreview(null)
  }
  function flipSelectedSign() {
    if (!selected || !canFlipSign(selected)) return
    const next = rotation === 180 ? 0 : 180
    setRotation(next)
    if (!batchType && placed)
      change({
        ...state,
        layout: state.layout.map((p) => (p.id === selected ? { ...p, rotation: next } : p)),
      })
  }
  function rotateSelected() {
    if (!selected || !canRotate(selected)) return
    const nextRotation = (rotation + 90) % 360
    if (batchType) {
      setRotation(nextRotation)
      return
    }
    setRotation(nextRotation)
    const p = state.layout.find((p) => p.id === selected)
    if (
      p &&
      canPlace(state.layout, { ...p, rotation: nextRotation }, state.land, state.removedLand, state.farmPlotLimit)
    ) {
      change({
        ...state,
        layout: state.layout.map((item) =>
          item.id === selected ? { ...item, rotation: nextRotation } : item,
        ),
      })
      setPending(false)
      setMessage('90° 회전했어요.')
    } else {
      setPending(true)
      setTool('edit')
      setMessage(`방향을 ${nextRotation}°로 바꿨어요. 놓을 수 있는 새 위치를 눌러주세요.`)
    }
  }
  async function fullscreen() {
    try {
      if (!document.fullscreenElement) await root.current?.requestFullscreen()
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (type: string) => Promise<void>
      }
      try {
        await orientation?.lock?.('landscape')
      } catch {
        setMessage('휴대폰 자동 회전을 켜고 가로로 돌려보세요.')
      }
    } catch {
      setMessage(
        '이 브라우저에서는 전체 화면 전환이 제한돼요. 휴대폰을 가로로 돌려 사용할 수 있어요.',
      )
    }
  }
  function purchase(type: string) {
    if (account) {
      openOffer({ kind: 'item', type })
      return
    }
    const next = buyIslandBatch(
      live ? localIslandState(state) : state,
      { kind: 'item', type },
      purchaseQuantity,
      (type) => `${type}~${randomId()}`,
    )
    if (!next) {
      setMessage(
        state.owned.filter(isDecoration).length >= 300
          ? '보관 가능한 물건은 최대 300개예요.'
          : '체험 코인이 부족해요. 코인 충전 버튼으로 무료 충전할 수 있어요.',
      )
      return
    }
    change(next)
    setMessage(
      `${resolve(type)!.name} ${purchaseQuantity}개 구매 완료! 보관함에서 꺼내 배치해보세요.`,
    )
  }
  function sell(id: string) {
    if (account) {
      if (tradePending.current) {
        setPurchaseQuantityInput(String(tradePending.current.quantity))
        setTradeOpen(true)
        return
      }
      if (!salePrice(id)) {
        setMessage('기본 선물은 보관함에 넣어 다시 배치할 수 있어요.')
        return
      }
      setSelling(id)
      setOffer(null)
      setPurchaseQuantityInput('1')
      setTradeError('')
      setTradeOpen(true)
      return
    }
    const next = sellDecoration(state, id)
    if (!next) return
    change(next)
    setSelected(null)
    setPending(false)
    setGhost(null)
    setMessage(
      `${resolve(id)?.name ?? '장식물'}을 판매하고 체험 코인 ${decorationSellPrice(id)}개를 받았어요. 되돌리기로 취소할 수 있어요.`,
    )
  }
  function salePrice(id: string) {
    const material = islandMaterialOffer(id)
    if (account && material) return Math.floor(priceFor(material) / 2)
    return account
      ? (account.snapshot.items.find((item) => item.id === id)?.sellPrice ?? 0)
      : decorationSellPrice(id)
  }
  function storedMaterial(id: string) {
    return id === 'land-piece' ? state.landStock : (state.tileStock[id.slice(6)] ?? 0)
  }
  function priceFor(offer: IslandOffer) {
    if (account)
      return account.snapshot.catalog.find((item) => item.id === islandProductId(offer))?.price ?? 0
    return offer.kind === 'land'
      ? LAND_PRICE
      : offer.kind === 'floor'
        ? floorTiles.find((t) => t.id === offer.type)!.price
        : resolve(offer.type)!.price
  }
  function artFor(offer: IslandOffer | null) {
    if (!offer) return null
    if (offer.kind === 'land') return <LandThumbnail />
    if (offer.kind === 'floor') return <FloorSwatch type={offer.type} />
    const facility = resolve(offer.type)
    return facility ? (
      <svg viewBox={buildingViewBox(facility, 0)}>
        <Building f={facility} />
      </svg>
    ) : null
  }
  function openOffer(next: IslandOffer) {
    if (tradePending.current) {
      setPurchaseQuantityInput(String(tradePending.current.quantity))
      setTradeOpen(true)
      return
    }
    setOffer(next)
    setSelling(null)
    setPurchaseQuantityInput('1')
    setTradeError('')
    setTradeOpen(true)
  }
  async function confirmTrade() {
    if (
      !account ||
      tradeInFlight.current ||
      tradeBusy ||
      account.walletLoading ||
      account.walletError
    )
      return
    tradeInFlight.current = true
    setTradeBusy(true)
    setTradeError('')
    try {
      if (!tradePending.current) await draftController.flush()
      if (!tradeActive.current) return
      if (!tradePending.current) {
        if (selling)
          tradePending.current = {
            action: 'sell',
            itemId: selling,
            quantity: islandMaterialOffer(selling) ? purchaseQuantity : 1,
            price: salePrice(selling),
            operationId: randomId(),
          }
        else if (offer)
          tradePending.current = {
            action: 'buy',
            itemId: islandProductId(offer),
            quantity: purchaseQuantity,
            price: priceFor(offer),
            operationId: randomId(),
          }
      }
      const args = tradePending.current
      if (!args) return
      await account.trade(args, (result) => {
        if (!tradeActive.current) return false
        setTradeOpen(false)
        setPanel(args.action === 'sell' ? 'storage' : 'shop')
        setSelected(null)
        setPending(false)
        setGhost(null)
        if (args.action === 'sell') {
          setHistory([])
          setMessage(`판매 완료 · +${result.receipt.delta.toLocaleString('ko-KR')} 골드`)
          return false
        }
        if (received.current.has(result.receipt.operationId)) return false
        received.current.add(result.receipt.operationId)
        const product = result.island.catalog.find((item) => item.id === args.itemId)!
        const kind =
          product.family === 'land' ? 'land' : product.family === 'floor' ? 'floor' : 'item'
        setAcquired({
          key: result.receipt.operationId,
          name: product.name,
          quantity: result.receipt.quantity,
          delta: result.receipt.delta,
          itemIds: result.receipt.itemIds,
          kind,
          type: kind === 'floor' ? product.id.slice(6) : product.id,
        })
        return true
      })
      if (tradeActive.current) {
        tradePending.current = null
        setRetryingTrade(false)
        setTradeError('')
      }
    } catch (cause) {
      if (!tradeActive.current) return
      if (definitiveIslandError(cause)) tradePending.current = null
      setRetryingTrade(!!tradePending.current)
      setTradeError(islandError(cause))
    } finally {
      tradeInFlight.current = false
      if (tradeActive.current) setTradeBusy(false)
    }
  }
  async function finishEditing() {
    try {
      await draftController.flush()
      if (tradeActive.current) {
        setEditing(false)
        finishBatch()
        setTool('edit')
        setSelectedLand(null)
        setMessage('배치를 저장했어요.')
      }
    } catch {
      /* Keep the editable draft and its retry controls. */
    }
  }
  async function leaveIsland(to: string) {
    try {
      await draftController.flush()
      if (tradeActive.current) navigate(to)
    } catch {
      /* Keep the draft visible if saving fails. */
    }
  }
  function placeAcquired() {
    if (!acquired) return
    setPanel(null)
    setEditing(true)
    setAcquired(null)
    setSelectedLand(null)
    setTool('edit')
    setRotation(0)
    if (acquired.kind === 'land') {
      setTool('land')
      setLandPreview({ x: Math.floor(camera.x / 32), y: Math.floor(camera.y / 32) })
      setMessage('빈 바다를 눌러 땅을 놓아보세요.')
      return
    }
    if (acquired.kind === 'floor') {
      setFloor(acquired.type as FloorKind)
      setTool('floor')
      setMessage('땅을 누르거나 끌어 타일을 깔아보세요.')
      return
    }
    const id = acquired.itemIds.find((id) => state.owned.includes(id))
    if (!id) {
      setPanel('storage')
      setCategory('decoration')
      setMessage('현재 보유 중인 구조물을 확인해 주세요.')
      return
    }
    setSelected(id)
    setPending(true)
    setBatchType(acquired.quantity > 1 ? acquired.type! : null)
    setBatchSteps(0)
    setMessage('빈 곳을 눌러 새 구조물을 놓아보세요.')
  }
  const catalog = (
    live
      ? panel === 'shop'
        ? facilities.filter((f) => f.category === 'decoration')
        : [...(managed ?? []), ...facilities.filter((f) => f.category === 'decoration')]
      : facilities
  ).map((f) =>
    account && f.category === 'decoration'
      ? { ...f, price: priceFor({ kind: 'item', type: f.id }) }
      : f,
  )
  const materialSale = !!selling && !!islandMaterialOffer(selling)
  const tradeOffer: IslandOffer | null = selling
    ? (islandMaterialOffer(selling) ?? { kind: 'item', type: selling })
    : offer
  const tradeName =
    selling && !materialSale
      ? (resolve(selling)?.name ?? '구조물')
      : tradeOffer?.kind === 'land'
        ? '땅 조각'
        : tradeOffer?.kind === 'floor'
          ? (floorTiles.find((t) => t.id === tradeOffer.type)?.name ?? '타일')
          : tradeOffer && tradeOffer.kind === 'item'
            ? (resolve(tradeOffer.type)?.name ?? '구조물')
            : ''
  const filtered = catalog.filter(f=>!farm || f.kind!=='farm-office').filter(
    (f) => (category === 'all' || (farm ? farmCategory(f) === category : f.category === category)) && f.name.includes(search.trim()),
  )
  const unplaced = state.owned.filter((id) => !state.layout.some((p) => p.id === id))
  const stored = unplaced
  const cleanupControl = (
<div className="island-cleanup" ref={cleanupRef}>
            <button
              className={cleanupOpen || (farm && (landRemoving || decorationRemoving || tileRemoving)) ? 'active' : ''}
              aria-label={farm ? "제거 모드" : "정리"}
              aria-pressed={farm ? landRemoving || decorationRemoving || tileRemoving : undefined}
              aria-expanded={cleanupOpen}
              aria-controls="island-cleanup-options"
              onClick={() => {
                setPanel(null)
                setCleanupOpen((v) => !v)
              }}
            >
              <Eraser size={20} />
              <span>{farm ? '제거' : '정리'}</span>
            </button>
            {cleanupOpen && (
              <section
                id="island-cleanup-options"
                aria-label="회수할 대상"
                className="island-cleanup-popover"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setCleanupOpen(false)
                    cleanupRef.current?.querySelector('button')?.focus()
                  }
                }}
              >
                <header>
                  <strong>무엇을 정리할까요?</strong>
                  <button
                    type="button"
                    aria-label="정리 메뉴 닫기"
                    onClick={() => setCleanupOpen(false)}
                  >
                    <X size={15} />
                  </button>
                </header>
                <div className="island-cleanup-options">
                  <button onClick={() => startRemoval('land-remove')}>
                    <span className="island-cleanup-art">
                      <LandThumbnail />
                    </span>
                    <span>땅 회수</span>
                  </button>
                  <button onClick={() => startRemoval('decoration-remove')}>
                    <span className="island-cleanup-art">
                      <svg
                        viewBox={farm ? '-5 -5 42 42' : '-5 -13 74 50'}
                        data-cleanup-decoration={farm ? 'farm-plot' : 'bench'}
                        aria-hidden="true"
                      >
                        <Building f={farm ? facilityFor('farm-plot')! : cleanupDecoration} />
                      </svg>
                    </span>
                    <span>{farm ? '장식물·밭 회수' : '장식물 회수'}</span>
                  </button>
                  <button onClick={() => startRemoval('tile-remove')}>
                    <span className="island-cleanup-art">
                      <FloorSwatch type="brick" />
                    </span>
                    <span>타일 회수</span>
                  </button>
                </div>
                <p>회수한 항목은 보관함에 들어가요.</p>
              </section>
            )}
          </div>
  )
  return (
    <section
      ref={root}
      className={`island-studio ${farm ? 'is-farm' : ''} ${account ? 'is-account' : ''} ${!editing ? 'is-browsing' : ''} ${selectionMode ? `has-${selectionMode}-selection` : ''} ${(tool === 'land' || landRemoving || decorationRemoving || tileRemoving) && !panel ? 'is-land-placing' : ''} ${dragging ? 'is-dragging' : ''}`}
      aria-label={farm ? "내 농장" : "나의 퐁당섬 꾸미기"}
    >
      <svg
        ref={svg}
        style={{ width: mapWidth, height: mapHeight }}
        className={`island-canvas ${editing && tool === 'edit' ? 'is-editing' : tool === 'floor' ? 'is-floor' : ''}`}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        aria-label="드래그로 이동하고 마우스 휠로 확대·축소하는 섬 지도"
        role="img"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
      >
        <Terrain land={state.land} removedLand={state.removedLand} farm={farm} />
        <FloorPatterns />
        <g pointerEvents="none" data-island-floor>
          {state.paving.map((p) => (
            <rect
              key={`${p.x}-${p.y}`}
              x={p.x * 32}
              y={p.y * 32}
              width="32"
              height="32"
              fill={`url(#island-floor-${p.type})`}
              data-floor-type={p.type}
            />
          ))}
        </g>
        {showGrid && (
          <rect
            data-island-grid
            x="0"
            y="0"
            width={WORLD.width}
            height={WORLD.height}
            fill="url(#island-grid)"
            pointerEvents="none"
          />
        )}
        {selectedLand && tool === 'edit' && (
          <rect
            x={selectedLand.x * 32}
            y={selectedLand.y * 32}
            width="32"
            height="32"
            rx="3"
            fill="#fff7d9"
            fillOpacity=".35"
            stroke="#fff9df"
            strokeWidth="2"
            pointerEvents="none"
          />
        )}
        {[...state.layout]
          .sort((a, b) => a.y + footprint(a).h - (b.y + footprint(b).h))
          .map((p) => {
            const f = resolve(p.id)!
            const bounds = footprint(p)
            return (
              <g
                key={p.id}
                data-island-object={p.id}
                transform={`translate(${p.x * 32} ${p.y * 32})`}
                role="button"
                tabIndex={0}
                aria-label={`${f.name} 선택`}
                className="island-object"
                onKeyDown={(e) => {
                  if (batchType) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setPanel(null)
                    setCleanupOpen(false)
                    setSelectedLand(null)
                    setTool('edit')
                    setSelected(p.id)
                    setRotation(p.rotation ?? 0)
                    setPending(false)
                    if(farm && f.kind==='farm-office')setOfficeOpen(true)
                  }
                  if (
                    editing &&
                    tool === 'edit' &&
                    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
                  ) {
                    e.preventDefault()
                    place({
                      ...p,
                      x: p.x + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0),
                      y: p.y + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0),
                    })
                  }
                }}
              >
                <rect width={bounds.w * 32} height={bounds.h * 32} fill="transparent" />
                {selected === p.id && !batchType && (
                  <rect
                    x="-5"
                    y="-6"
                    width={bounds.w * 32 + 10}
                    height={bounds.h * 32 + 12}
                    rx="9"
                    fill="#fff7d9"
                    fillOpacity=".3"
                    stroke="#fff8db"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                )}
                <Building level={account?.snapshot.farm?.officeLevel??1}
                  f={f}
                  rotation={p.rotation}
                  label={p.label}
                  connections={decorationConnections(state.layout, p)}
                />
                {f.category === 'building' && (scale >= .65 || selected === p.id) &&
                  <FacilityCaption facility={f} width={bounds.w*32} height={bounds.h*32} selected={selected===p.id}/>}
              </g>
            )
          })}
        {!panel &&
          landPlan &&
          landPlan.slots.map(({ cell, allowed }) => (
            <g
              key={`${cell.x},${cell.y}`}
              data-land-stroke-preview
              data-mode={landRemoving ? 'remove' : 'place'}
              data-valid={allowed}
              pointerEvents="none"
              transform={`translate(${cell.x * 32} ${cell.y * 32})`}
            >
              <rect
                width="32"
                height="32"
                rx="3"
                fill={allowed ? (landRemoving ? '#e7b779' : '#91b58b') : '#d99180'}
                fillOpacity=".65"
                stroke={allowed ? '#fff7df' : '#bf715f'}
                strokeWidth="2"
              />
              {landRemoving && allowed && (
                <path d="M11 11l10 10m0-10L11 21" stroke="#865d36" strokeWidth="2" />
              )}
            </g>
          ))}
        {!panel &&
          decorationRemoval?.placements.map((p) => {
            const bounds = footprint(p)
            return (
              <g
                key={p.id}
                data-decoration-removal-preview={p.id}
                pointerEvents="none"
                transform={`translate(${p.x * 32} ${p.y * 32})`}
              >
                <rect
                  width={bounds.w * 32}
                  height={bounds.h * 32}
                  rx="4"
                  fill="#e7b779"
                  fillOpacity=".45"
                  stroke="#865d36"
                  strokeWidth="2"
                />
                <path d="M10 10l12 12m0-12L10 22" stroke="#865d36" strokeWidth="2" />
              </g>
            )
          })}
        {!panel &&
          floorPlan &&
          floorPlan.slots.map(({ cell, allowed }) => (
            <g
              key={`${cell.x},${cell.y}`}
              data-floor-stroke-preview
              data-mode={tileRemoving || floor === 'bare' ? 'remove' : 'place'}
              data-valid={allowed}
              pointerEvents="none"
              transform={`translate(${cell.x * 32} ${cell.y * 32})`}
            >
              <rect
                width="32"
                height="32"
                rx="2"
                fill={
                  !allowed
                    ? '#d99180'
                    : tileRemoving || floor === 'bare'
                      ? '#e7b779'
                      : `url(#island-floor-${floor})`
                }
                fillOpacity=".75"
                stroke={allowed ? '#fff7df' : '#bf715f'}
                strokeWidth="2"
              />
            </g>
          ))}
        {!panel &&
          !landPlan &&
          tool === 'land' &&
          (state.landStock > 0 || movingLand) &&
          landPreview &&
          (() => {
            const source = movingLand
            const allowed = !!(source
              ? moveLand(state, source, landPreview)
              : addLand(state, landPreview))
            return (
              <g
                data-land-preview
                data-valid={allowed}
                pointerEvents="none"
                transform={`translate(${landPreview.x * 32} ${landPreview.y * 32})`}
              >
                <rect
                  width="32"
                  height="32"
                  rx="3"
                  fill={allowed ? '#91b58b' : '#d99180'}
                  fillOpacity=".35"
                  stroke={allowed ? '#6b9367' : '#bf715f'}
                  strokeWidth="2"
                />
                <g className="island-land-ghost">
                  <rect y="-8" width="32" height="32" rx="4" fill="#d4bf9d" />
                  <rect
                    y="-12"
                    width="32"
                    height="30"
                    rx="4"
                    fill="#e7d2b5"
                    stroke={allowed ? '#fff7df' : '#bf715f'}
                    strokeWidth="2"
                  />
                  <path d="M7 0h3m11 8h3" stroke="#cbb18e" strokeWidth="1.5" />
                </g>
              </g>
            )
          })()}
        {landPulse && (
          <rect
            key={landPulse.key}
            className="island-land-placed"
            x={landPulse.x * 32}
            y={landPulse.y * 32}
            width="32"
            height="32"
            rx="4"
            fill="none"
            stroke="#fff8df"
            strokeWidth="3"
            pointerEvents="none"
          />
        )}
        {placementEffect && (
          <rect
            key={placementEffect.key}
            className="island-placement-pulse"
            x={placementEffect.x * 32 - 3}
            y={placementEffect.y * 32 - 3}
            width={(resolve(placementEffect.id)?.w ?? 1) * 32 + 6}
            height={(resolve(placementEffect.id)?.h ?? 1) * 32 + 6}
            rx="8"
            fill="none"
            stroke="#fff7cc"
            strokeWidth="3"
            pointerEvents="none"
          />
        )}
        {batchType &&
          batchPlan &&
          batchPlan.slots.map((slot, i) => {
            const f = facilityFor(batchType)!,
              bounds = footprint(slot.placement)
            const previewLayout = [...state.layout, ...batchPlan.placements]
            return (
              <g
                key={i}
                data-decoration-preview
                data-valid={slot.allowed}
                pointerEvents="none"
                opacity=".65"
                transform={`translate(${slot.cell.x * 32} ${slot.cell.y * 32})`}
              >
                <rect
                  width={bounds.w * 32}
                  height={bounds.h * 32}
                  rx="3"
                  fill={slot.allowed ? '#a9c993' : '#df9a89'}
                  stroke={slot.allowed ? '#729166' : '#b76d5b'}
                  strokeWidth="1.5"
                />
                <Building
                  f={f}
                  rotation={slot.placement.rotation}
                  label={slot.placement.label}
                  connections={decorationConnections(previewLayout, slot.placement)}
                />
              </g>
            )
          })}
        {ghost &&
          (() => {
            const f = resolve(ghost.id)!
            const bounds = footprint(ghost)
            return (
              <g
                pointerEvents="none"
                transform={`translate(${ghost.x * 32} ${ghost.y * 32})`}
                opacity=".75"
              >
                <rect
                  width={bounds.w * 32}
                  height={bounds.h * 32}
                  rx="6"
                  fill={
                    canPlace(state.layout, ghost, state.land, state.removedLand, state.farmPlotLimit)
                      ? '#91ce87'
                      : '#ec8f7b'
                  }
                />
                <Building level={account?.snapshot.farm?.officeLevel??1} f={f} rotation={ghost.rotation} />
              </g>
            )
          })()}
      </svg>
      {(tool === 'land' || landRemoving) && !panel && (
        <section
          aria-label={landRemoving ? '땅 제거' : '땅 배치'}
          className="island-land-placement"
        >
          <div className="island-held-land" aria-hidden="true">
            <LandThumbnail />
          </div>
          <div className="island-land-placement-copy">
            <div className="island-land-placement-title">
              <strong>{landRemoving ? '땅 회수 중' : '땅 조각'}</strong>
              <span role="status" aria-live="polite">
                <span className="sr-only">{landRemoving ? '보관 중' : '남은 땅'} </span>
                <b>{state.landStock}</b>
                <span className="sr-only">칸</span>
              </span>
            </div>
            <small className="sr-only">
              {landRemoving
                ? '클릭하거나 드래그한 땅과 타일을 보관함으로 돌려보내요.'
                : movingLand
                  ? '땅 조각 이동 중 · 타일도 함께 이동해요'
                  : state.landStock > 0
                    ? '빈 바다를 눌러 한 칸씩 놓으세요.'
                    : '땅을 모두 배치했어요. 상점에서 땅을 더 구매할 수 있어요.'}
            </small>
          </div>
          <div className="island-land-placement-actions">
            {!landRemoving && !movingLand && state.landStock === 0 && (
              <button
                className="island-small-button"
                onClick={() => {
                  setPanel('shop')
                  setCategory('land')
                  setSearch('')
                }}
              >
                구매하기
              </button>
            )}
            <button
              className="island-small-button island-enter"
              onClick={() => {
                setTool('edit')
                setMovingLand(null)
                setLandPreview(null)
              }}
            >
              <Check size={15} />
              {movingLand ? '취소' : '완료'}
            </button>
          </div>
        </section>
      )}
      {(decorationRemoving || tileRemoving) && !panel && (
        <section
          aria-label={tileRemoving ? '타일 제거' : '장식물 제거'}
          className="island-land-placement"
        >
          <div className="island-held-land" aria-hidden="true">
            <Archive size={24} />
          </div>
          <div className="island-land-placement-copy">
            <strong>{tileRemoving ? '타일 회수 중' : '장식물 회수 중'}</strong>
            <span role="status" aria-live="polite">
              {(tileRemoving ? floorPlan?.count : decorationRemoval?.count)
                ? `보관 예정 ${tileRemoving ? floorPlan!.count : decorationRemoval!.count}개`
                : '클릭하거나 드래그하세요'}
            </span>
          </div>
          <div className="island-land-placement-actions">
            <button
              className="island-small-button island-enter"
              onClick={() => {
                setTool('edit')
                setLandStroke(null)
              }}
            >
              <Check size={15} />
              완료
            </button>
          </div>
        </section>
      )}
      {farm && account && <FarmOffice snapshot={account.snapshot} gold={account.gold} walletLoading={account.walletLoading} walletError={account.walletError} storageKey={storageKey} usedPlots={state.layout.filter(p=>resolve(p.id)?.kind==='farm-plot').length} open={officeOpen} onOpenChange={setOfficeOpen} trade={account.trade} beforePurchase={draftController.flush} reload={account.reload} onPlace={placeOffice}/>}
      <header className="island-topbar">
        <div className="island-title-card">
          <Link
            to="/aquarium"
            aria-label="섬 나가기"
            className="island-icon-button"
            onClick={(event) => {
              if (account) {
                event.preventDefault()
                void leaveIsland('/aquarium')
              }
            }}
          >
            <ArrowLeft size={19} />
          </Link>
          <div>
            {!farm && <span>MY PONGDANG ISLAND</span>}
            <h1>{farm ? '내 농장' : '나의 퐁당섬'}</h1>
          </div>
          <span className="island-save">
            <Check size={12} />
            {account
              ? draftController.error
                ? '저장 확인 필요'
                : draftController.saving
                  ? '저장 중…'
                  : draftController.dirty
                    ? '변경됨'
                    : '저장됨'
              : saveStatus}
          </span>
        </div>
        <button
          className="island-coins"
          title={account ? '보유 골드' : '실제 골드와 무관한 체험 코인'}
          aria-label={account ? `보유 골드 ${state.coins.toLocaleString('ko-KR')}` : undefined}
        >
          <GoldIcon className="size-5" />
          {account?.walletLoading ? '…' : state.coins.toLocaleString()}
          {!account && <small>체험 코인</small>}
        </button>
      </header>
      {account && (
        <>
          <button
            className="island-more-toggle island-icon-button"
            aria-label="섬 보기 설정"
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
          >
            <MoreHorizontal size={20} />
          </button>
          {more && (
            <div className="island-more-menu" aria-label="섬 보기 설정">
              {farm && <>
                <button onClick={()=>{finishBatch();setTool('edit');setSearch('');setCategory('land');setPanel('shop');setMore(false);setEditing(true)}}><Plus size={16}/>땅 확장</button>
                <button onClick={()=>{finishBatch();setTool('edit');setSearch('');setCategory('floor');setPanel('shop');setMore(false);setEditing(true)}}><House size={16}/>바닥 타일</button>
                <button disabled={!history.length} onClick={()=>{undo();setMore(false)}}><Undo2 size={16}/>되돌리기</button>
              </>}
              <button
                onClick={() => {
                  setCamera(farm ? farmCamera(state, size.w, size.h) : { x: 640, y: 575, zoom: 0.95 })
                  setMore(false)
                }}
              >
                <LocateFixed size={16} />섬 전체 보기
              </button>
              <button onClick={() => zoom(0.25)} disabled={camera.zoom >= 4}>
                <ZoomIn size={16} />
                확대
              </button>
              <button onClick={() => zoom(-0.25)} disabled={camera.zoom <= 0.7}>
                <ZoomOut size={16} />
                축소
              </button>
              <button
                onClick={() => {
                  void fullscreen()
                  setMore(false)
                }}
              >
                <Maximize size={16} />
                전체 화면
              </button>
                {!farm && <button
                  onClick={() => {
                    setMore(false)
                    resetStarter()
                  }}
                >
                  <RotateCcw size={16} />
                  추천 기본 배치
                </button>}
            </div>
          )}
          {editing && (!farm || draftController.dirty) && (
            <div className="island-edit-bar">
              <span>
                <Pencil size={14} />{farm ? '농장 꾸미기' : '섬 꾸미기'}
              </span>
              <button disabled={draftController.saving} onClick={() => void finishEditing()}>
                <Check size={15} />
                {draftController.saving ? '저장 중…' : '완료'}
              </button>
            </div>
          )}
          {(draftController.error || account.walletError) && (
            <div className="island-sync-error" role="alert">
              <span>
                {draftController.error || '골드를 확인하지 못했어요. 잠시 후 다시 시도해주세요.'}
              </span>
              {draftController.error && (
                <>
                  <button
                    disabled={draftController.saving}
                    onClick={() => void draftController.flush().catch(() => {})}
                  >
                    다시 저장
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('저장하지 못한 배치를 버리고 서버의 섬을 불러올까요?'))
                        void draftController
                          .reload()
                          .catch(() => setMessage('섬을 다시 불러오지 못했어요.'))
                    }}
                  >
                    다시 불러오기
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
      <div className={`island-camera-controls ${account ? 'island-account-camera' : ''}`}>
        <button
          className="island-icon-button"
          aria-label="확대"
          onClick={() => zoom(0.25)}
          disabled={camera.zoom >= 4}
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="island-icon-button"
          aria-label="축소"
          onClick={() => zoom(-0.25)}
          disabled={camera.zoom <= 0.7}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="island-icon-button"
          aria-label="섬 전체 보기"
          onClick={() => setCamera({ x: 640, y: 550, zoom: 0.9 })}
        >
          <LocateFixed size={18} />
        </button>
        <button
          className="island-icon-button"
          aria-label="전체 화면 및 가로 모드"
          onClick={() => void fullscreen()}
        >
          <Maximize size={18} />
        </button>
      </div>
      <button
        className="island-reset-button"
        hidden={!!account}
        onClick={resetStarter}
        title="배치·땅·꾸미기 재고·체험 코인을 기본값으로 되돌리기"
      >
        <RotateCcw size={14} />
        <span>기본 배치</span>
      </button>
      <div
        hidden={!message || !!batchType || ((tool === 'land' || tool === 'floor') && !panel)}
        className="island-message island-message--browse"
        role="status"
      >
        {message}
      </div>
      {tool === 'floor' && !panel && (
        <div className="island-floor-tool">
          <strong>
            {floor === 'bare' ? '맨땅으로 복원' : floorTiles.find((t) => t.id === floor)?.name}
          </strong>
          <span>
            {floor === 'bare'
              ? '걷어낸 타일은 보관함으로 돌아가요'
              : `남은 타일 ${state.tileStock[floor] ?? 0}개 · 클릭·드래그로 깔기`}
          </span>
          <button
            className="island-icon-button"
            aria-label="바닥 편집 종료"
            onClick={() => setTool('edit')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {tool === 'edit' && current && selected && !panel && (
        <section
          className={`island-selected-card ${pending ? 'is-placing' : ''} ${batchType ? 'is-batch-placement' : ''}`}
          role="dialog"
          aria-labelledby="island-selected-title"
          aria-modal="false"
        >
          <header className="island-selected-header">
            <div className="island-selected-art" aria-hidden="true">
              <svg viewBox={buildingViewBox(current, rotation)}>
                <Building level={account?.snapshot.farm?.officeLevel??1} f={current} rotation={rotation} label={signText} />
              </svg>
            </div>
            <div className="island-selected-heading">
              <span>{current.category === 'decoration' ? farm ? '농장 꾸미기' : '섬 꾸미기' : '나의 시설'}</span>
              <h2 id="island-selected-title">{current.name}</h2>
              <p>
                {!editing ? (
                  '나만의 섬에 놓인 소중한 공간이에요.'
                ) : batchType ? (
                  <>
                    <span role="status" aria-live="polite">
                      보유 {batchStock.length}개
                    </span>
                    <span className="sr-only">
                      {batchStock.length === 0
                        ? '모두 배치했어요.'
                        : supportsLinePlacement(batchType)
                          ? '톡톡 누르거나 끌어서 한 줄 배치 · 두 손가락으로 화면 이동'
                          : '톡톡 눌러 연속 배치 · 두 손가락으로 화면 이동'}
                    </span>
                  </>
                ) : pending && !placed ? (
                  current.placementTerrain === 'water' ? (
                    '바다에 놓고 회전해서 땅과 땅을 이어보세요'
                  ) : current.placementTerrain === 'any' ? (
                    '육지나 바다를 눌러 배치하세요'
                  ) : (
                    '빈 땅을 눌러 배치하세요'
                  )
                ) : current.kind==='farm-office' ? (
                  `Lv.${account?.snapshot.farm?.officeLevel??1} · 밭 한도 ${state.farmPlotLimit??4}칸`
                ) : (
                  `${current.w} × ${current.h}칸 · ${current.placementTerrain === 'water' ? '바다 전용' : current.placementTerrain === 'any' ? '육지·바다' : current.kind === 'dock' ? '해안 전용' : current.category === 'decoration' ? '장식물' : '건물'}`
                )}
              </p>
            </div>
            <button
              className="island-selected-close island-icon-button"
              aria-label="시설 선택 닫기"
              onClick={() => {
                finishBatch()
              }}
            >
              <X size={16} />
            </button>
          </header>
          {editing &&
            (current.kind === 'arrow-sign' || current.kind === 'name-sign') &&
            placed &&
            !pending && (
              <form
                className="island-sign-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  change({
                    ...state,
                    signLabels: { ...state.signLabels, [selected]: limitSignText(signText.trim()) },
                    layout: state.layout.map((p) =>
                      p.id === selected ? { ...p, label: limitSignText(signText.trim()) } : p,
                    ),
                  })
                  setMessage('표지판 문구를 저장했어요.')
                }}
              >
                <label htmlFor="island-sign-text">
                  {current.kind === 'name-sign' ? '섬 이름' : '표지판 문구'}
                </label>
                <div>
                  <input
                    id="island-sign-text"
                    value={signText}
                    onChange={(e) => setSignText(limitSignText(e.target.value))}
                    maxLength={6}
                    placeholder={current.kind === 'name-sign' ? '나의 퐁당섬' : '이쪽으로'}
                  />
                  <button className="island-small-button" type="submit">
                    저장
                  </button>
                </div>
                <small>{Array.from(signText).length} / 6자</small>
              </form>
            )}
          <div className="island-selected-actions">
            {farm && current.kind==='farm-office' && <button className="island-small-button" onClick={()=>setOfficeOpen(true)}>관리소 강화</button>}
            {editing && canFlipSign(selected) && (
              <button
                className="island-small-button island-rotate-button"
                aria-pressed={rotation === 180}
                onClick={flipSelectedSign}
              >
                <FlipHorizontal size={14} />
                좌우반전
              </button>
            )}
            {editing && canRotate(selected) && (
              <button className="island-small-button island-rotate-button" onClick={rotateSelected}>
                <RotateCw size={14} />
                회전 {rotation}°
              </button>
            )}
            {editing &&
              current.category === 'decoration' &&
              !pending &&
              salePrice(selected) > 0 && (
                <button className="island-small-button" onClick={() => sell(selected)}>
                  <GoldIcon className="size-4" />
                  판매 {salePrice(selected)}
                </button>
              )}
            {!editing ? (
              <>
                <button className="island-small-button" onClick={() => setEditing(true)}>
                  <Pencil size={14} />
                  꾸미기
                </button>
                {current.to && (
                  <button
                    className="island-small-button island-enter"
                    onClick={() => void leaveIsland(current.to!)}
                  >
                    <ArrowUpRight size={14} />
                    들어가기
                  </button>
                )}
              </>
            ) : batchType ? (
              <>
                <button className="island-small-button" disabled={!batchSteps} onClick={undo}>
                  <Undo2 size={14} />
                  되돌리기
                </button>
                {batchStock.length === 0 && (
                  <button
                    className="island-small-button"
                    onClick={() => {
                      finishBatch()
                      setPanel('shop')
                      setCategory('decoration')
                      setSearch(current.name)
                    }}
                  >
                    구매하기
                  </button>
                )}
                <button className="island-small-button island-enter" onClick={finishBatch}>
                  <Check size={14} />
                  완료
                </button>
              </>
            ) : placed ? (
              <>
                <button
                  className="island-small-button"
                  onClick={() => {
                    change({ ...state, layout: state.layout.filter((p) => p.id !== selected) })
                    setSelected(null)
                    setPending(false)
                    setMessage('보관함에 넣었어요. 언제든 다시 꺼낼 수 있어요.')
                  }}
                >
                  <Archive size={14} />
                  보관
                </button>
                {current.to && (
                  <button
                    className="island-small-button island-enter"
                    onClick={() => void leaveIsland(current.to!)}
                  >
                    <ArrowUpRight size={14} />
                    페이지로
                  </button>
                )}
              </>
            ) : (
              <button
                className="island-icon-button"
                aria-label="배치 취소"
                onClick={() => {
                  setPending(false)
                  setSelected(null)
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </section>
      )}
      {tool === 'edit' && selectedLand && !panel && (
        <section
          className="island-selected-card island-selected-land"
          role="dialog"
          aria-labelledby="island-land-title"
          aria-modal="false"
        >
          <header className="island-selected-header">
            <div className="island-selected-art" aria-hidden="true">
              <LandThumbnail />
            </div>
            <div className="island-selected-heading">
              <span>나의 땅</span>
              <h2 id="island-land-title">땅 조각</h2>
              <p>1 × 1칸 · 땅</p>
            </div>
            <button
              className="island-selected-close island-icon-button"
              aria-label="땅 선택 닫기"
              onClick={() => setSelectedLand(null)}
            >
              <X size={16} />
            </button>
          </header>
          <div className="island-selected-actions">
            <button
              className="island-small-button island-enter"
              onClick={() => {
                if (!storeLand({ ...state, landStock: 0 }, selectedLand)) {
                  setMessage(
                    '시설이 있거나 다른 배치를 지탱하는 땅은 옮길 수 없어요. 먼저 시설을 옮겨주세요.',
                  )
                  return
                }
                setMovingLand(selectedLand)
                setLandPreview(selectedLand)
                setTool('land')
                setSelected(null)
                setSelectedLand(null)
                setPending(false)
              }}
            >
              <Move size={14} />
              이동
            </button>
            <button
              className="island-small-button"
              onClick={() => {
                const next = storeLand(state, selectedLand)
                if (next) {
                  change(next)
                  setMessage('땅 조각 한 개를 보관했어요. 보관함에서 꺼내 다시 배치할 수 있어요.')
                } else
                  setMessage(
                    '건물이나 장식물이 있는 땅은 보관할 수 없어요. 먼저 시설을 옮겨주세요.',
                  )
              }}
            >
              <Archive size={14} />
              보관
            </button>
          </div>
        </section>
      )}
      {account && !farm && !editing && (
        <nav className="island-browse-dock" aria-label="나의 섬 메뉴">
          <button onClick={()=>setPlacesOpen(true)}><MapPin size={19}/><span>장소 찾기</span></button>
          <button
            onClick={() => {
              setEditing(true)
              setPanel(null)
              setSelected(null)
            }}
          >
            <Pencil size={19} />
            <span>꾸미기</span>
          </button>
          <button
            className={panel === 'storage' ? 'active' : ''}
            onClick={() => {
              setPanel(panel === 'storage' ? null : 'storage')
              setCategory('decoration')
              setSearch('')
            }}
          >
            <Archive size={19} />
            <span>보관함</span>
          </button>
          <button
            className={panel === 'shop' ? 'active' : ''}
            onClick={() => {
              setPanel(panel === 'shop' ? null : 'shop')
              setCategory('all')
              setSearch('')
              setPurchaseQuantityInput('1')
            }}
          >
            <ShoppingBag size={19} />
            <span>상점</span>
          </button>
        </nav>
      )}
      <IslandPlacesDialog open={placesOpen} onOpenChange={setPlacesOpen} facilities={pageBuildings}/>
      {editing && !farm && (
        <nav className="island-dock" aria-label="섬 꾸미기 도구">
          <button
            className={`island-land-stock ${tool === 'land' ? 'active' : ''}`}
            aria-label={`땅 추가 ${state.landStock}칸${tool === 'land' ? ' 배치 완료' : ''}`}
            aria-pressed={tool === 'land'}
            onClick={toggleLandPlacement}
          >
            <span className="island-land-stock-art island-dock-icon" aria-hidden="true">
              <LandThumbnail />
              <span className="island-dock-count">{state.landStock}</span>
            </span>
            <span>땅 추가</span>
          </button>
          {cleanupControl}
          <button
            className={panel === 'storage' ? 'active' : ''}
            aria-label={`보관함 ${unplaced.length + state.landStock}개`}
            onClick={() => {
              setCleanupOpen(false)
              setPanel(panel === 'storage' ? null : 'storage')
              setCategory('building')
            }}
          >
            <span className="island-dock-icon">
              <Archive size={20} />
              {unplaced.length + state.landStock > 0 && (
                <span className="island-dock-count">{unplaced.length + state.landStock}</span>
              )}
            </span>
            <span>보관함</span>
          </button>
          <button
            className={panel === 'shop' ? 'active' : ''}
            aria-label="상점"
            onClick={() => {
              setCleanupOpen(false)
              setPanel(panel === 'shop' ? null : 'shop')
              setCategory('all')
            }}
          >
            <ShoppingBag size={20} />
            <span>상점</span>
          </button>
          <i />
          <button
            aria-label="되돌리기"
            disabled={!history.length}
            onClick={() => {
              setCleanupOpen(false)
              undo()
            }}
          >
            <Undo2 size={20} />
            <span>되돌리기</span>
          </button>
        </nav>
      )}
      {farm && !pending && !selected && (
        <nav className="farm-category-bar" aria-label="농장 카테고리">
          {farmCategories.map((c,i)=>{
            const Icon=[Flower2,House,Layers3,Sprout,Plus][i]
            return <button key={c.id}
              className={(panel && category===c.id)||(c.id==='land' && tool==='land')?'active':''}
              aria-label={c.id==='land'?`땅 추가 ${state.landStock}칸${tool==='land'?' 배치 완료':''}`:undefined}
              aria-pressed={c.id==='land'?tool==='land':undefined}
              onClick={()=>{
              if(c.id==='land'){toggleLandPlacement();return}
              setCategory(c.id)
              setSearch('')
              setPanel('shop')
              setEditing(true)
              setTool('edit')
              setCleanupOpen(false)
            }}>{c.id==='land'?<span className="island-land-stock-art island-dock-icon" aria-hidden="true"><LandThumbnail/><span className="island-dock-count">{state.landStock}</span></span>:<Icon size={22}/>}<span>{c.label}</span></button>
          })}
          {cleanupControl}
        </nav>
      )}
      {panel && (
        <aside
          className={`island-drawer ${panel === 'shop' ? 'island-shop' : 'island-storage'}`}
          aria-label={panel === 'shop' ? '상점' : farm ? '농장 보관함' : '시설 보관함'}
        >
          <div className="island-drawer-controls">
            <div className="island-drawer-head">
              <div>
                <h2>{farm ? panel==='shop' ? farmCategories.find(c=>c.id===category)?.label ?? '농장 상점' : '보관함' : panel === 'shop' ? '상점' : '나의 보관함'}</h2>
                {farm && <button className="farm-inventory-toggle" onClick={()=>setPanel(panel==='shop'?'storage':'shop')}>{panel==='shop'?'보관함':'상점'}</button>}
              </div>
              <button
                className="island-icon-button"
                aria-label="패널 닫기"
                onClick={() => setPanel(null)}
              >
                <X size={19} />
              </button>
            </div>
            <p className="island-drawer-note">
              {panel === 'shop'
                ? account
                  ? farm ? category==='plot' ? '밭 한 칸 · 10골드. 회수한 밭은 무료로 다시 놓을 수 있어요.' : '내 농장에 놓을 물건을 골라주세요.' : '골드로 구매하고, 나만의 섬을 꾸며보세요.'
                  : '체험 코인으로 구매해요.'
                : '꺼내서 배치할 항목을 골라주세요.'}
            </p>
            <div
              className="island-tabs"
              role="group"
              aria-label={panel === 'storage' ? '보관함 분류' : '상품 분류'}
            >
              {(farm ? farmCategories.map(c=>c.id) : ['all', 'building', 'decoration', 'floor', 'land'] as const)
                .filter((c) =>
                  farm ? true : panel === 'storage'
                    ? ['building', 'decoration', 'floor', 'land'].includes(c)
                    : !(live && c === 'building'),
                )
                .map((c) => (
                  <button
                    key={c}
                    className={category === c ? 'active' : ''}
                    onClick={() => setCategory(c)}
                  >
                    {farm ? farmCategories.find(item=>item.id===c)?.label : c === 'all'
                      ? '전체'
                      : c === 'building'
                        ? '건물'
                        : c === 'land'
                          ? '땅'
                          : c === 'floor'
                            ? '타일'
                            : '장식'}
                  </button>
                ))}
            </div>
            <input
              className="island-search"
              type="search"
              aria-label={farm ? '농장 물품 검색' : '건물·장식 검색'}
              placeholder={panel === 'shop' ? '상품 검색' : farm ? '보관 물품 이름 검색' : '건물이나 장식 이름 검색'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {!account && panel === 'shop' && (
              <div className="island-purchase-quantity">
                <label htmlFor="island-purchase-quantity">수량</label>
                <div className="island-quantity-stepper">
                  <button
                    type="button"
                    aria-label="구매 수량 줄이기"
                    disabled={purchaseQuantity <= 1}
                    onClick={() => setPurchaseQuantityInput(String(purchaseQuantity - 1))}
                  >
                    −
                  </button>
                  <input
                    id="island-purchase-quantity"
                    aria-label="구매 수량"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={purchaseQuantityInput}
                    onChange={(e) => setPurchaseQuantityInput(e.target.value)}
                    onBlur={() => setPurchaseQuantityInput(String(purchaseQuantity))}
                  />
                  <button
                    type="button"
                    aria-label="구매 수량 늘리기"
                    disabled={purchaseQuantity >= 100}
                    onClick={() => setPurchaseQuantityInput(String(purchaseQuantity + 1))}
                  >
                    +
                  </button>
                </div>
                <div className="island-quantity-presets" role="group" aria-label="빠른 구매 수량">
                  {[5, 10, 50].map((n) => (
                    <button
                      type="button"
                      key={n}
                      aria-label={`${n}개씩 구매`}
                      aria-pressed={purchaseQuantity === n}
                      onClick={() => setPurchaseQuantityInput(String(n))}
                    >
                      {n}개
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div
            className="island-drawer-scroll"
            role="region"
            aria-label={panel === 'shop' ? '상품 목록' : '보관 항목 목록'}
            tabIndex={0}
          >
            <div className="island-products">
              {farm && category==='building' && (panel==='shop' || stored.some(id=>resolve(id)?.kind==='farm-office')) && (
                <article className="island-product">
                  <div className="island-product-art">
                    <svg viewBox="-5 -5 74 74" aria-hidden="true"><Building f={facilityFor('farm-office')!} level={Math.max(1,account?.snapshot.farm?.officeLevel??0)}/></svg>
                    {panel==='storage' && <span className="island-count">1</span>}
                  </div>
                  <h3>텃밭 관리소</h3>
                  <small>{account?.snapshot.farm?.officeLevel ? `Lv.${account.snapshot.farm.officeLevel} · 밭 ${account.snapshot.farm.plotLimit}칸` : '미건설 · 2 × 2칸'}</small>
                  <button onClick={()=>{
                    const office=stored.find(id=>resolve(id)?.kind==='farm-office')
                    if(panel==='storage' && office)placeOffice(office)
                    else {setPanel(null);setOfficeOpen(true)}
                  }}>
                    {panel==='storage'?'꺼내서 배치':(account?.snapshot.farm?.officeLevel??0)>=5?'관리하기':(account?.snapshot.farm?.officeLevel??0)>0?'강화하기':'건설하기'}
                  </button>
                </article>
              )}
              {(panel === 'shop' || category === 'land') &&
                (category === 'all' || category === 'land') &&
                (panel === 'shop' || state.landStock > 0) &&
                '땅 조각'.includes(search.trim()) && (
                  <article className="island-product">
                    <div className="island-product-art">
                      <LandThumbnail />
                      <PlacementTerrainBadge terrain="water" />
                      <span className="island-count">{state.landStock}</span>
                    </div>
                    <h3>땅 조각</h3>
                    <small>1 × 1칸</small>
                    <button
                      className="island-buy-button"
                      aria-label={
                        panel === 'shop'
                          ? `${shopQuantity > 1 ? shopQuantity + '개 ' : ''}구매 ${(priceFor({ kind: 'land' }) * (account ? 1 : shopQuantity)).toLocaleString('ko-KR')}`
                          : undefined
                      }
                      disabled={
                        panel === 'shop' &&
                        (state.coins < priceFor({ kind: 'land' }) * (account ? 1 : shopQuantity) ||
                          state.landStock + shopQuantity > 10000)
                      }
                      onClick={() => {
                        if (account && panel === 'shop') {
                          openOffer({ kind: 'land' })
                          return
                        }
                        if (panel === 'shop') {
                          const next = buyIslandBatch(
                            state,
                            { kind: 'land' },
                            shopQuantity,
                            randomId,
                          )
                          if (next) {
                            change(next)
                            setMessage(
                              `땅 조각 ${shopQuantity}개를 구매했어요. 보관함에서 꺼내 배치하세요.`,
                            )
                          }
                          return
                        }
                        setTool('land')
                        setEditing(true)
                        setPanel(null)
                        setSelected(null)
                        setSelectedLand(null)
                        setPending(false)
                        setMessage(
                          `바다를 눌러 보관한 땅을 배치하세요. · 남은 땅 ${state.landStock}칸`,
                        )
                      }}
                    >
                      {panel === 'shop' ? (
                        <>
                          <GoldIcon className="size-4" />
                          {(
                            priceFor({ kind: 'land' }) * (account ? 1 : shopQuantity)
                          ).toLocaleString('ko-KR')}
                          <span>{shopQuantity > 1 ? shopQuantity + '개 구매' : '구매'}</span>
                        </>
                      ) : (
                        '배치하기'
                      )}
                    </button>
                    {account && panel === 'storage' && (
                      <button
                        className="island-sell-button"
                        aria-label={`땅 조각 판매 ${salePrice('land-piece')}`}
                        onClick={() => sell('land-piece')}
                      >
                        <GoldIcon className="size-4" />
                        판매 {salePrice('land-piece')}
                      </button>
                    )}
                  </article>
                )}
              {(category === 'floor' || category === 'all') &&
                floorTiles
                  .filter(
                    (t) =>
                      t.name.includes(search.trim()) &&
                      (panel === 'shop' || (state.tileStock[t.id] ?? 0) > 0),
                  )
                  .map((tile) => (
                    <article className="island-product" key={`floor-${tile.id}`}>
                      <div className="island-product-art">
                        <FloorSwatch type={tile.id} />
                        <PlacementTerrainBadge terrain="land" />
                        {panel === 'storage' && (
                          <span className="island-count">{state.tileStock[tile.id] ?? 0}</span>
                        )}
                      </div>
                      <h3>{tile.name}</h3>
                      {tile.id === 'shell-mosaic' && <small>2 × 2칸 연결 무늬</small>}
                      <button
                        className="island-buy-button"
                        disabled={
                          panel === 'shop' &&
                          (state.coins <
                            priceFor({ kind: 'floor', type: tile.id }) *
                              (account ? 1 : shopQuantity) ||
                            (state.tileStock[tile.id] ?? 0) + shopQuantity > 10000)
                        }
                        onClick={() => {
                          if (panel === 'shop') {
                            if (account) {
                              openOffer({ kind: 'floor', type: tile.id })
                              return
                            }
                            const next = buyIslandBatch(
                              state,
                              { kind: 'floor', type: tile.id },
                              shopQuantity,
                              randomId,
                            )
                            if (next) {
                              change(next)
                              setMessage(
                                `${tile.name} ${shopQuantity}개를 구매했어요. 보관함의 바닥 타일에서 꺼내세요.`,
                              )
                            }
                          } else {
                            setEditing(true)
                            setFloor(tile.id)
                            setTool('floor')
                            setSelected(null)
                            setPending(false)
                            setPanel(null)
                            setMessage(
                              '땅을 클릭하거나 드래그해서 타일을 깔아주세요. 두 손가락으로 화면을 이동해요. 다른 바닥 위에 깔면 이전 타일은 회수돼요.',
                            )
                          }
                        }}
                      >
                        {panel === 'shop' ? (
                          <>
                            <GoldIcon className="size-4" />
                            {(
                              priceFor({ kind: 'floor', type: tile.id }) *
                              (account ? 1 : shopQuantity)
                            ).toLocaleString('ko-KR')}
                            <span>{shopQuantity > 1 ? shopQuantity + '개 구매' : '구매'}</span>
                          </>
                        ) : (
                          '바닥에 깔기'
                        )}
                      </button>
                      {account && panel === 'storage' && (
                        <button
                          className="island-sell-button"
                          aria-label={`${tile.name} 판매 ${salePrice('floor-' + tile.id)}`}
                          onClick={() => sell('floor-' + tile.id)}
                        >
                          <GoldIcon className="size-4" />
                          판매 {salePrice('floor-' + tile.id)}
                        </button>
                      )}
                    </article>
                  ))}
              {(panel === 'shop'
                ? filtered
                : filtered.filter((f) => stored.some((id) => resolve(id)?.id === f.id))
              ).map((f) => {
                const ids = stored.filter((id) => resolve(id)?.id === f.id)
                const previewRotation = state.layout.find((p) => p.id === ids[0])?.rotation ?? 0
                return (
                  <article className="island-product" key={f.id}>
                    <div className="island-product-art">
                      <svg viewBox={buildingViewBox(f, previewRotation)} aria-hidden="true">
                        <Building f={f} rotation={previewRotation} />
                      </svg>
                      <PlacementTerrainBadge
                        terrain={f.kind === 'dock' ? 'shore' : (f.placementTerrain ?? 'land')}
                      />
                      {panel === 'storage' && <span className="island-count">{ids.length}</span>}
                    </div>
                    <h3>{f.name}</h3>
                    <small>
                      {f.w} × {f.h}칸
                    </small>
                    <button
                      className="island-buy-button"
                      disabled={
                        panel === 'shop' &&
                        (state.coins < f.price * (account ? 1 : shopQuantity) ||
                          state.owned.filter(isDecoration).length + shopQuantity > 300)
                      }
                      onClick={() => {
                        if (panel === 'shop') purchase(f.id)
                        else {
                          setEditing(true)
                          setSelectedLand(null)
                          setSelected(ids[0])
                          const existing = state.layout.find((p) => p.id === ids[0])
                          setBatchType(!existing && f.category === 'decoration' ? f.id : null)
                          setBatchPreview(null)
                          setBatchSteps(0)
                          setRotation(existing?.rotation ?? 0)
                          setPending(!existing)
                          if (existing)
                            setCamera((c) => ({
                              ...c,
                              x: (existing.x + f.w / 2) * 32,
                              y: (existing.y + f.h / 2) * 32,
                            }))
                          setTool('edit')
                          setPanel(null)
                          setMessage(
                            f.kind === 'dock'
                              ? '육지와 바다가 닿는 곳에 항구를 놓으세요. 방향은 고정돼요.'
                              : f.placementTerrain === 'water'
                                ? '바다에 놓고 회전해서 땅과 땅을 이어보세요.'
                                : f.placementTerrain === 'any'
                                  ? '육지나 바다를 눌러 배치하세요. 드래그하면 지도를 이동해요.'
                                  : f.kind==='farm-plot' ? '빈 땅을 누르거나 드래그해서 밭을 놓으세요.' : '빈 땅을 눌러 배치하세요. 드래그하면 지도를 이동해요.',
                          )
                        }
                      }}
                    >
                      {panel === 'shop' ? (
                        <>
                          <GoldIcon className="size-4" />
                          {(f.price * (account ? 1 : shopQuantity)).toLocaleString('ko-KR')}
                          <span>{shopQuantity > 1 ? shopQuantity + '개 구매' : '구매'}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          꺼내서 배치
                        </>
                      )}
                    </button>
                    {panel === 'storage' &&
                      f.category === 'decoration' &&
                      salePrice(ids[0]) > 0 && (
                        <button
                          className="island-sell-button"
                          aria-label={`${f.name} 판매 ${salePrice(ids[0])}`}
                          onClick={() => sell(ids[0])}
                        >
                          <GoldIcon className="size-4" />
                          판매 {salePrice(ids[0])}
                        </button>
                      )}
                  </article>
                )
              })}
            </div>
            {panel === 'storage' &&
              !(farm && category==='building' && stored.some(id=>resolve(id)?.kind==='farm-office')) &&
              (category === 'land'
                ? state.landStock === 0 || !'땅 조각'.includes(search.trim())
                : category === 'floor'
                  ? !floorTiles.some(
                      (t) => (state.tileStock[t.id] ?? 0) > 0 && t.name.includes(search.trim()),
                    )
                  : !filtered.some((f) => stored.some((id) => resolve(id)?.id === f.id))) && (
                <div className="island-empty">
                  <Archive size={32} />
                  <strong>
                    {search.trim() ? '검색 결과가 없어요' : '아직 보관한 물건이 없어요'}
                  </strong>
                  <p>
                    {search.trim()
                      ? '다른 이름으로 검색하거나 검색어를 지워주세요.'
                      : '보관함의 건물을 꺼내거나 상점에서 장식을 골라보세요.'}
                  </p>
                  <button
                    className="island-small-button"
                    onClick={() => {
                      setPanel('shop')
                      setCategory('all')
                    }}
                  >
                    상점 둘러보기
                  </button>
                </div>
              )}
            {!account && panel === 'shop' && (
              <button
                className="island-refill"
                onClick={() => {
                  change({ ...state, coins: state.coins + 3000 })
                  setMessage('체험 코인 3,000개를 무료 충전했어요.')
                }}
              >
                <Plus size={14} />
                체험 코인 3,000 무료 충전
              </button>
            )}
          </div>
        </aside>
      )}
      {account && (
        <>
          <IslandTradeDialog
            open={tradeOpen}
            name={tradeName}
            art={artFor(tradeOffer)}
            quantity={selling && !materialSale ? 1 : purchaseQuantity}
            stockSale={materialSale}
            maxQuantity={materialSale && selling ? Math.min(100, storedMaterial(selling)) : 100}
            setQuantity={(quantity) => setPurchaseQuantityInput(String(quantity))}
            price={selling ? salePrice(selling) : offer ? priceFor(offer) : 0}
            gold={account.gold}
            busy={tradeBusy || account.walletLoading || !!account.walletError}
            retrying={retryingTrade}
            error={tradeError}
            selling={!!selling}
            onClose={() => setTradeOpen(false)}
            onConfirm={() => void confirmTrade()}
          />
          <IslandAcquiredDialog
            item={acquired}
            art={
              acquired
                ? artFor(
                    acquired.kind === 'land'
                      ? { kind: 'land' }
                      : acquired.kind === 'floor'
                        ? { kind: 'floor', type: acquired.type as FloorKind }
                        : { kind: 'item', type: acquired.type! },
                  )
                : null
            }
            onPlace={placeAcquired}
            onClose={() => setAcquired(null)}
          />
        </>
      )}
      <span className="island-mobile-tip">
        <Smartphone size={12} />
        가로로 돌리면 더 넓게 보여요
      </span>
    </section>
  )
}
