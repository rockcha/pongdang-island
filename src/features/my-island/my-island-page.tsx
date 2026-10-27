import {storedDecorationIds,supportsLinePlacement,planDecorationPlacement,applyDecorationPlacement} from './island-batch-placement'
import { landOutlinePath } from './terrain-outline'
import { randomId } from '@/lib/random-id'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Coins,
  Maximize,
  Plus,
  ShoppingBag,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Smartphone,
  RotateCw,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import {
  addLand,
  decorationConnections,
  moveLand,
  buyLand,
  storeLand,
  LAND_PRICE,
  isLand,
  footprint,
  canRotate,
  buyItem,
  canPlace,
  facilities,
  facilityFor,
  readState,
  WORLD,
  sellDecoration,
  decorationSellPrice,
  defaultState,
  floorTiles,
  buyFloor,
  paintFloor,
} from './island-model'
import type { Cell, Facility, IslandState, Placement, FloorKind } from './island-model'
import { FloorPatterns, FloorSwatch } from './floor-art'
import { Building } from './island-art'
import { buildingViewBox } from './island-art-sizing'
import './my-island.css'
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
}: {
  land: Cell[]
  removedLand: Cell[]
}) {
  const cells: Cell[] = []
  for (let y = 0; y < 36; y++)
    for (let x = 0; x < 40; x++) if (isLand(x, y, land, removedLand)) cells.push({ x, y })
  const outline = landOutlinePath(cells)
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id="island-water" width="95" height="75" patternUnits="userSpaceOnUse">
          <rect width="95" height="75" fill="#8ec9cc" />
          <path
            d="M10 28q10 5 20 0M55 60q9 4 18 0"
            stroke="#d5eee4"
            opacity=".45"
            fill="none"
            strokeWidth="2"
          />
        </pattern>
        <pattern id="island-ground" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#e7d2b5" />
          <path d="M9 29h3m21-9h2" stroke="#d0b793" opacity=".5" fill="none" />
        </pattern>
        <pattern id="island-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#ffffe9" strokeOpacity=".4" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="-2000" y="-2000" width="5280" height="5152" fill="url(#island-water)" />
      <path d={outline} fill="none" stroke="#c8e9df" strokeWidth="14" strokeLinejoin="round" />
      <path d={outline} fill="url(#island-ground)" fillRule="evenodd" />
      <path d={outline} fill="none" stroke="#eddbac" strokeWidth="6" strokeLinejoin="round" />
      <text x="640" y="1100" textAnchor="middle" fill="#e5f2dc" fontSize="14" letterSpacing="7">
        PONGDANG ISLAND
      </text>
    </g>
  )
})
type Camera = { x: number; y: number; zoom: number }
const defaultCamera = (): Camera => ({
  x: 640,
  y: 600,
  zoom: window.innerWidth > window.innerHeight && window.innerHeight < 600 ? 0.75 : 0.95,
})
type Gesture = {
  kind: 'pan' | 'item' | 'land' | 'batch'
  land?:Cell
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
export function MyIslandPage() {
  const { session } = useAuth()
  return (
    <IslandEditor
      key={session?.user.id ?? 'guest'}
      storageKey={`pongdang:island:v2:${session?.user.id ?? 'guest'}`}
      managed={pageBuildings}
    />
  )
}
function IslandEditor({ storageKey, managed }: { storageKey: string; managed?: Facility[] }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const resetHandled = useRef(false)
  const live = managed !== undefined
  const managedMap = useMemo(() => new Map((managed ?? []).map((f) => [f.id, f])), [managed])
  const resolve = (id: string) => managedMap.get(id) ?? facilityFor(id)
  const [local, setLocal] = useState(() =>
      live ? readPageIsland(storageKey) : readState(storageKey),
    ),
    [history, setHistory] = useState<IslandState[]>([]),
    [editMode,setEditMode]=useState<'decorate'|'terrain'>('decorate'),
    [signText,setSignText]=useState(''),
    [tool, setTool] = useState<'edit' | 'land' | 'floor'>('edit'),
    [floor, setFloor] = useState<FloorKind | 'bare'>('dirt'),
    [rotation, setRotation] = useState(0),
    [panel, setPanel] = useState<'shop' | 'storage' | null>(null),
    [category, setCategory] = useState<'all' | 'building' | 'decoration' | 'floor' | 'land'>('all'),
    [search, setSearch] = useState(''),
    [inventoryMode, setInventoryMode] = useState<'stored' | 'placed'>('stored'),
    [selected, setSelected] = useState<string | null>(null),
    [selectedLand, setSelectedLand] = useState<Cell | null>(null),
    [pending, setPending] = useState(false),
    [batchType,setBatchType]=useState<string|null>(null),
    [batchPreview,setBatchPreview]=useState<{from:Cell;to:Cell}|null>(null),
    [batchSteps,setBatchSteps]=useState(0),
    [dragLand,setDragLand]=useState<Cell|null>(null),
    [movingLand,setMovingLand]=useState<Cell|null>(null),
    [landPreview,setLandPreview]=useState<Cell|null>({x:20,y:17}),
    [landPulse,setLandPulse]=useState<(Cell&{key:number})|null>(null),
    [dragging, setDragging] = useState(false),
    [ghost, setGhost] = useState<Placement | null>(null),
    [message, setMessage] = useState(
      '시설을 눌러 이동·보관하거나 페이지로 들어가세요. 땅 이동은 땅 편집에서, 화면 이동은 빈 곳을 끌어서 해요.',
    ),
    [saveStatus, setSaveStatus] = useState('이 기기에 저장'),
    [size, setSize] = useState({ w: 1000, h: 750 }),
    [camera, setCamera] = useState<Camera>(defaultCamera)
  const state = useMemo(
    () => (live ? visibleIslandState(local, managed ?? []) : local),
    [local, managed, live],
  )
  const root = useRef<HTMLElement>(null),
    svg = useRef<SVGSVGElement>(null),
    gesture = useRef<Gesture | null>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef<{ distance: number; zoom: number; x:number; y:number; cx:number; cy:number } | null>(null)
  const fit = Math.min(size.w / WORLD.width, size.h / WORLD.height),
    scale = fit * camera.zoom
  const current = selected && state.owned.includes(selected) ? resolve(selected) : undefined,
    placed = state.layout.some((p) => p.id === selected)
  const batchStock=batchType?storedDecorationIds(state,batchType):[]
  const batchPlan=batchType&&batchPreview?planDecorationPlacement(state,batchType,batchPreview.from,batchPreview.to,rotation):null
  const hasSelection = tool === 'edit' && !panel && !!(current || selectedLand)
  useEffect(()=>{if(tool==='land'&&!panel)setLandPreview({x:Math.floor(camera.x/32),y:Math.floor(camera.y/32)})},[tool,panel])
  useEffect(()=>{if(tool!=='land'||panel)setMovingLand(null)},[tool,panel])
  const showGrid = !panel && (tool === 'floor' || tool === 'land' || !!current || !!selectedLand || !!dragLand || pending)
  const selectionMode = hasSelection ? (pending ? 'placing' : 'bottom') : null
  const mapWidth = size.w
  const mapHeight = size.h
  const view = {
    x: camera.x - mapWidth / scale / 2,
    y: camera.y - mapHeight / scale / 2,
    w: mapWidth / scale,
    h: mapHeight / scale,
  }
  function resetStarter() {
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
    if (params.get('reset') !== 'starter') {
      resetHandled.current = false
      return
    }
    if (resetHandled.current) return
    resetHandled.current = true
    resetStarter()
    const next = new URLSearchParams(params)
    next.delete('reset')
    setParams(next, { replace: true })
  }, [params, setParams, live, local])
  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
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
    try {
      localStorage.setItem(storageKey, JSON.stringify(live ? localIslandState(local) : local))
      setSaveStatus('저장됨')
    } catch {
      setSaveStatus('저장 실패')
      setMessage('저장 공간을 사용할 수 없어요. 창을 닫기 전에 브라우저 설정을 확인해주세요.')
    }
  }, [local, storageKey, live])
  useEffect(() => {
    const el = root.current
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBatchType(null);setBatchPreview(null);setBatchSteps(0);gesture.current=null;pointers.current.clear();pinch.current=null;setDragLand(null);setDragging(false)
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
  function switchMode(mode:'decorate'|'terrain'){
    gesture.current=null;pointers.current.clear();pinch.current=null
    setBatchType(null);setBatchPreview(null);setBatchSteps(0);setEditMode(mode);setTool('edit');setPanel(null);setSelected(null);setSelectedLand(null);setPending(false);setGhost(null);setDragLand(null);setDragging(false);setBatchPreview(null)
    setMessage(mode==='terrain'?'땅을 선택하거나 드래그해 편집하세요. 바다를 끌면 화면이 이동해요.':'구조물은 드래그로 옮기고, 빈 곳을 끌면 화면이 이동해요.')
  }
  useEffect(()=>{setSignText(state.layout.find(p=>p.id===selected)?.label??(selected?state.signLabels?.[selected]:undefined)??'')},[selected,state.layout,state.signLabels])
  function change(next: IslandState) {
    setSelectedLand(null)
    setHistory((h) => [...h.slice(-29), local])
    setLocal(live ? localIslandState(next) : next)
  }
  function point(e: { clientX: number; clientY: number }) {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: Math.floor(p.x / 32), y: Math.floor(p.y / 32) }
  }
  function place(input: Placement) {
    const p = {
      ...input,
      ...((state.layout.find(p=>p.id===input.id)?.label??state.signLabels?.[input.id])!==undefined?{label:state.layout.find(p=>p.id===input.id)?.label??state.signLabels?.[input.id]}:{}),
      rotation:
        input.rotation ??
        (selected === input.id
          ? rotation
          : (state.layout.find((p) => p.id === input.id)?.rotation ?? 0)),
    }
    if (!state.owned.includes(p.id)) return
    if (canPlace(state.layout, p, state.land, state.removedLand)) {
      change({ ...state, layout: [...state.layout.filter((i) => i.id !== p.id), p] })
      setPending(false)
      setMessage('배치했어요. 다른 시설도 자유롭게 옮겨보세요.')
    } else
      setMessage(
        resolve(p.id)?.kind === 'dock'
          ? '항구를 육지에 걸쳐 놓고 바다 쪽으로 향하게 해주세요. 회전해서 어느 해안에든 붙일 수 있어요.'
          : resolve(p.id)?.placementTerrain === 'water'
            ? '다리와 징검돌은 다른 구조물과 겹치지 않는 바다 위에 배치해주세요.'
          : resolve(p.id)?.placementTerrain === 'any'
            ? '다른 시설과 겹치지 않는 육지나 바다에 놓아주세요.'
            : '육지 안쪽의 다른 시설과 겹치지 않는 곳에 놓아주세요.',
      )
  }
  function finishBatch(){setBatchType(null);setBatchPreview(null);setBatchSteps(0);setSelected(null);setPending(false);setGhost(null);gesture.current=null}
  function undo(){
    const previous=history.at(-1)
    if(!previous)return
    setLocal(previous);setHistory(h=>h.slice(0,-1));setSelectedLand(null);setBatchPreview(null)
    if(batchType){const next=storedDecorationIds(previous,batchType)[0];if(next)setSelected(next);setPending(true);setBatchSteps(n=>Math.max(0,n-1))}
    else{setSelected(null);setPending(false)}
    setMessage('이전 상태로 되돌렸어요.')
  }
  function commitBatch(from:Cell,to:Cell){
    if(!batchType)return
    const result=applyDecorationPlacement(state,batchType,from,to,rotation)
    if(!result){setMessage(batchStock.length?'놓을 수 있는 빈 칸을 골라주세요.':'보유한 장식물을 모두 배치했어요.');setBatchPreview(null);return}
    change(result.state);setBatchSteps(n=>n+1)
    setSelected(storedDecorationIds(result.state,batchType)[0]??result.plan.placements.at(-1)!.id);setPending(true);setBatchPreview(null)
    setMessage(`${result.plan.placements.length}개를 배치했어요. · 남은 수량 ${result.plan.remaining}개`)
  }
  function zoom(delta: number) {
    setCamera((c) => ({ ...c, zoom: Math.min(4, Math.max(0.7, c.zoom + delta)) }))
  }
  function down(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: camera.zoom,x:(a.x+b.x)/2,y:(a.y+b.y)/2,cx:camera.x,cy:camera.y }
      gesture.current = null
      setGhost(null);setDragLand(null);setDragging(false)
      return
    }
    if (pointers.current.size > 2) return
    const id =
      (e.target as Element).closest('[data-island-object]')?.getAttribute('data-island-object') ??
      undefined
    const p = state.layout.find((p) => p.id === id)
    const at = point(e)
    if(tool==='land')setLandPreview(at)
    if(batchType&&pending)setBatchPreview({from:at,to:at})
    gesture.current = {
      kind: batchType&&pending?'batch':tool === 'edit' && editMode==='decorate' && p ? 'item' : tool==='edit'&&editMode==='terrain'&&!id&&!!storeLand({...state,landStock:0},at)?'land':'pan',
      land:at,
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
    if(tool==='land'&&!pinch.current)setLandPreview(point(e))
    if(batchType&&pending&&!pinch.current&&!pointers.current.has(e.pointerId)){const at=point(e);setBatchPreview({from:at,to:at})}
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const z =
        (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
        Math.max(1, pinch.current.distance)
      const pan=pinch.current
      setCamera((c) => ({ ...c, zoom: Math.min(4, Math.max(0.7, z)),x:Math.max(0,Math.min(WORLD.width,pan.cx-((a.x+b.x)/2-pan.x)/(fit*pan.zoom))),y:Math.max(0,Math.min(WORLD.height,pan.cy-((a.y+b.y)/2-pan.y)/(fit*pan.zoom))) }))
      return
    }
    const g = gesture.current
    if (!g) return
    if (Math.hypot(e.clientX - g.px, e.clientY - g.py) > 5) g.moved = true
    if (!g.moved) return
    if(g.kind==='batch'&&g.land){setBatchPreview({from:g.land,to:point(e)});return}
    if (g.kind === 'pan')
      setCamera((c) => ({
        ...c,
        x: Math.max(0, Math.min(WORLD.width, g.cx - (e.clientX - g.px) / scale)),
        y: Math.max(0, Math.min(WORLD.height, g.cy - (e.clientY - g.py) / scale)),
      }))
    else if(g.kind==='land'&&g.land){
      setDragging(true);setDragLand(g.land);setLandPreview(point(e));setSelected(null);setSelectedLand(null)
    }
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
    setDragging(false);setDragLand(null)
    pointers.current.delete(e.pointerId)
    if (pinch.current) {
      if (pointers.current.size === 0) pinch.current = null
      gesture.current = null
      return
    }
    const g = gesture.current
    gesture.current = null
    if (!g) return
    if(g.kind==='batch'&&g.land){commitBatch(g.land,point(e));return}
    if (tool === 'floor' && !g.moved) {
      const next = paintFloor(state, point(e), floor)
      if (next) {
        change(next)
        setMessage(
          floor === 'bare'
            ? '맨땅으로 복원하고 타일을 보관함으로 돌려보냈어요.'
            : '바닥 타일을 깔았어요. 땅과 시설의 배치 조건은 그대로예요.',
        )
      } else
        setMessage(
          '땅 위의 빈 바닥을 고르거나 남은 타일 수량을 확인해주세요. 바다에는 깔 수 없어요.',
        )
    } else if (tool === 'land' && !g.moved) {
      const next = movingLand?moveLand(state,movingLand,point(e)):addLand(state, point(e))
      if (next) {
        change(next)
        setLandPulse({...point(e),key:Date.now()})
        if(movingLand){setMovingLand(null);setTool('edit');setSelectedLand(point(e))}
        setMessage(
          movingLand?'땅 조각과 타일을 함께 옮겼어요.':'보관한 땅을 배치했어요.',
        )
      } else
        setMessage(
          !movingLand&&state.landStock === 0
            ? '보관한 땅이 없어요. 꾸미기 상점에서 땅을 먼저 구매해주세요.'
            : '빈 바다 칸을 눌러주세요. 부두가 있는 칸에는 땅을 놓을 수 없어요.',
        )
    } else if(g.kind==='land'&&g.moved&&g.land){
      const next=moveLand(state,g.land,point(e))
      if(next){change(next);setSelectedLand(point(e));setLandPulse({...point(e),key:Date.now()});setMessage('땅 조각과 타일을 함께 옮겼어요.')}
      else setMessage('빈 바다에 놓아주세요. 놓을 수 없는 곳에서는 원래 위치를 유지해요.')
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
    } else if (!g.moved && g.id && tool === 'edit'&&editMode==='decorate') {
      setSelectedLand(null)
      setSelected(g.id)
      setRotation(state.layout.find((p) => p.id === g.id)?.rotation ?? 0)
      setPending(false)
    } else if (!g.moved && !g.id && pending && selected) place({ ...point(e), id: selected })
    else if (!g.moved && !g.id) {
      setSelected(null)
      setPending(false)
      const cell = point(e)
      setSelectedLand(
        tool === 'edit' && editMode==='terrain'&&isLand(cell.x, cell.y, state.land, state.removedLand) ? cell : null,
      )
    }
    setGhost(null)
  }
  function cancel(e: ReactPointerEvent<SVGSVGElement>) {
    setDragging(false);setDragLand(null)
    pointers.current.delete(e.pointerId)
    gesture.current = null
    pinch.current = null
    setGhost(null);setBatchPreview(null)
  }
  function rotateSelected() {
    if (!selected || !canRotate(selected)) return
    const nextRotation = (rotation + 90) % 360
    if(batchType){setRotation(nextRotation);return}
    setRotation(nextRotation)
    const p = state.layout.find((p) => p.id === selected)
    if (
      p &&
      canPlace(state.layout, { ...p, rotation: nextRotation }, state.land, state.removedLand)
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
    const next = buyItem(live ? localIslandState(state) : state, type, `${type}~${randomId()}`)
    if (!next) {
      setMessage(
        state.owned.filter(isDecoration).length >= 300
          ? '보관 가능한 물건은 최대 300개예요.'
          : '체험 코인이 부족해요. 코인 충전 버튼으로 무료 충전할 수 있어요.',
      )
      return
    }
    change(next)
    setMessage(`${resolve(type)!.name} 구매 완료! 보관함에서 꺼내 배치해보세요.`)
  }
  function sell(id: string) {
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
  const catalog = live
    ? panel === 'shop'
      ? facilities.filter((f) => f.category === 'decoration')
      : [...(managed ?? []), ...facilities.filter((f) => f.category === 'decoration')]
    : facilities
  const filtered = catalog.filter(
    (f) => (category === 'all' || f.category === category) && f.name.includes(search.trim()),
  )
  const unplaced = state.owned.filter((id) => !state.layout.some((p) => p.id === id))
  const stored = inventoryMode === 'placed' ? state.layout.map((p) => p.id) : unplaced
  return (
    <section
      ref={root}
      className={`island-studio ${selectionMode ? `has-${selectionMode}-selection` : ''} ${dragging ? 'is-dragging' : ''}`}
      aria-label="나의 퐁당섬 꾸미기"
    >
      <svg
        ref={svg}
        style={{ width: mapWidth, height: mapHeight }}
        className={`island-canvas ${tool === 'edit' ? 'is-editing' : tool === 'floor' ? 'is-floor' : ''}`}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        aria-label="드래그로 이동하고 마우스 휠로 확대·축소하는 섬 지도"
        role="img"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
      >
        <Terrain land={state.land} removedLand={state.removedLand} />
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
        {showGrid && <rect
          data-island-grid
          x="0"
          y="0"
          width={WORLD.width}
          height={WORLD.height}
          fill="url(#island-grid)"
          pointerEvents="none"
        />}
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
                  if(editMode!=='decorate'||batchType)return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedLand(null)
                    setTool('edit')
                    setSelected(p.id)
                    setRotation(p.rotation ?? 0)
                    setPending(false)
                  }
                  if (
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
                <Building f={f} rotation={p.rotation} label={p.label} connections={decorationConnections(state.layout,p)}/>
              </g>
            )
          })}
        {!panel&&(dragLand||tool==='land'&&(state.landStock>0||movingLand))&&landPreview&&(()=>{
          const source=dragLand??movingLand
          const allowed=!!(source?moveLand(state,source,landPreview):addLand(state,landPreview))
          return <g data-land-preview data-valid={allowed} pointerEvents="none" transform={`translate(${landPreview.x*32} ${landPreview.y*32})`}>
            <rect width="32" height="32" rx="3" fill={allowed?'#91b58b':'#d99180'} fillOpacity=".35" stroke={allowed?'#6b9367':'#bf715f'} strokeWidth="2"/>
            <g className="island-land-ghost"><rect y="-8" width="32" height="32" rx="4" fill="#d4bf9d"/><rect y="-12" width="32" height="30" rx="4" fill="#e7d2b5" stroke={allowed?'#fff7df':'#bf715f'} strokeWidth="2"/><path d="M7 0h3m11 8h3" stroke="#cbb18e" strokeWidth="1.5"/></g>
          </g>
        })()}
        {landPulse&&<rect key={landPulse.key} className="island-land-placed" x={landPulse.x*32} y={landPulse.y*32} width="32" height="32" rx="4" fill="none" stroke="#fff8df" strokeWidth="3" pointerEvents="none"/>}
        {batchType&&batchPlan&&batchPlan.slots.map((slot,i)=>{
          const f=facilityFor(batchType)!,bounds=footprint(slot.placement)
          const previewLayout=[...state.layout,...batchPlan.placements]
          return <g key={i} data-decoration-preview data-valid={slot.allowed} pointerEvents="none" opacity=".65" transform={`translate(${slot.cell.x*32} ${slot.cell.y*32})`}><rect width={bounds.w*32} height={bounds.h*32} rx="3" fill={slot.allowed?'#a9c993':'#df9a89'} stroke={slot.allowed?'#729166':'#b76d5b'} strokeWidth="1.5"/><Building f={f} rotation={slot.placement.rotation} label={slot.placement.label} connections={decorationConnections(previewLayout,slot.placement)}/></g>
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
                    canPlace(state.layout, ghost, state.land, state.removedLand)
                      ? '#91ce87'
                      : '#ec8f7b'
                  }
                />
                <Building f={f} rotation={ghost.rotation} />
              </g>
            )
          })()}
      </svg>
      {tool==='land'&&!panel&&<section aria-label="땅 배치" className="island-land-placement">
        <div className="island-held-land" aria-hidden="true"><LandThumbnail/></div>
        <div className="island-land-placement-copy"><strong>{movingLand?'땅 조각 이동 중':state.landStock>0?'땅 배치 중':'땅을 모두 배치했어요'}</strong><span role="status" aria-live="polite">{movingLand?'타일도 함께 이동해요':<>남은 땅 <b>{state.landStock}</b>칸</>}</span><small>{movingLand?'옮길 바다 칸을 눌러주세요.':state.landStock>0?'빈 바다를 눌러 한 칸씩 놓으세요.':'상점에서 땅을 더 구매할 수 있어요.'}</small></div>
        <div className="island-land-placement-actions">{!movingLand&&state.landStock===0&&<button className="island-small-button" onClick={()=>{setPanel('shop');setCategory('land');setSearch('')}}>구매하기</button>}<button className="island-small-button" onClick={()=>{setTool('edit');setMovingLand(null);setLandPreview(null)}}><Check size={15}/>{movingLand?'취소':'완료'}</button></div>
      </section>}
      <div role="group" aria-label="섬 편집 모드" className="island-edit-modes"><button aria-pressed={editMode==='decorate'} onClick={()=>switchMode('decorate')}>꾸미기</button><button aria-pressed={editMode==='terrain'} onClick={()=>switchMode('terrain')}>땅 편집</button></div>
      <header className="island-topbar">
        <div className="island-title-card">
          <Link to="/aquarium" aria-label="섬 나가기" className="island-icon-button">
            <ArrowLeft size={19} />
          </Link>
          <div>
            <span>MY PONGDANG ISLAND</span>
            <h1>나의 퐁당섬</h1>
          </div>
          <span className="island-save">
            <Check size={12} />
            {saveStatus}
          </span>
        </div>
        <button className="island-coins" title="실제 골드와 무관한 체험 코인">
          <Coins size={17} />
          {state.coins.toLocaleString()}
          <small>체험 코인</small>
        </button>
      </header>
      <div className="island-camera-controls">
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
        onClick={resetStarter}
        title="배치·땅·꾸미기 재고·체험 코인을 기본값으로 되돌리기"
      >
        <RotateCcw size={14} />
        <span>기본 배치</span>
      </button>
      <div hidden={!!batchType||(tool==='land'||tool==='floor')&&!panel} className="island-message island-message--browse" role="status">
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
              : `남은 타일 ${state.tileStock[floor] ?? 0}개 · 땅을 눌러 한 칸씩 깔기`}
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
          className={`island-selected-card ${pending ? 'is-placing' : ''} ${batchType?'is-batch-placement':''}`}
          role="dialog"
          aria-labelledby="island-selected-title"
          aria-modal="false"
        >
          <header className="island-selected-header">
            <div className="island-selected-art" aria-hidden="true">
              <svg viewBox={buildingViewBox(current, rotation)}>
                <Building f={current} rotation={rotation} label={signText}/>
              </svg>
            </div>
            <div className="island-selected-heading">
              <span>{current.category === 'decoration' ? '섬 꾸미기' : '나의 시설'}</span>
              <h2 id="island-selected-title">{current.name}</h2>
              <p>
                {batchType?<><span role="status" aria-live="polite">보유 {batchStock.length}개{batchPlan?` · 배치 예정 ${batchPlan.placements.length}개`:''}</span><br/>{batchStock.length===0?'모두 배치했어요.':supportsLinePlacement(batchType)?'톡톡 누르거나 끌어서 한 줄 배치 · 두 손가락으로 화면 이동':'톡톡 눌러 연속 배치 · 두 손가락으로 화면 이동'}</>:pending
                  ? current.placementTerrain === 'water'
                    ? '바다에 놓고 회전해서 땅과 땅을 이어보세요'
                  : current.placementTerrain === 'any'
                    ? '육지나 바다를 눌러 배치하세요'
                    : '빈 땅을 눌러 배치하세요'
                  : `${current.w} × ${current.h}칸 · ${current.placementTerrain === 'water'?'바다 전용':current.placementTerrain === 'any' ? '육지·바다' : current.kind === 'dock' ? '해안 전용' : current.category === 'decoration' ? '장식물' : '건물'}`}
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
          {(current.kind==='arrow-sign'||current.kind==='name-sign')&&placed&&!pending&&<form className="island-sign-form" onSubmit={e=>{e.preventDefault();change({...state,signLabels:{...state.signLabels,[selected]:signText.trim().slice(0,16)},layout:state.layout.map(p=>p.id===selected?{...p,label:signText.trim().slice(0,16)}:p)});setMessage('표지판 문구를 저장했어요.')}}><label htmlFor="island-sign-text">{current.kind==='name-sign'?'섬 이름':'표지판 문구'}</label><div><input id="island-sign-text" value={signText} onChange={e=>setSignText(e.target.value)} maxLength={16} placeholder={current.kind==='name-sign'?'나의 퐁당섬':'이쪽으로'} /><button className="island-small-button" type="submit">저장</button></div><small>{signText.length} / 16자</small></form>}
          <div className="island-selected-actions">
            {canRotate(selected) && (
              <button className="island-small-button" onClick={rotateSelected}>
                <RotateCw size={14} />
                회전 {rotation}°
              </button>
            )}
            {current.category === 'decoration' && !pending && (
              <button className="island-small-button" onClick={() => sell(selected)}>
                <Coins size={14} />
                판매 {decorationSellPrice(selected)}
              </button>
            )}
            {batchType?<>
              <button className="island-small-button" disabled={!batchSteps} onClick={undo}><Undo2 size={14}/>되돌리기</button>
              {batchStock.length===0&&<button className="island-small-button" onClick={()=>{finishBatch();setPanel('shop');setCategory('decoration');setSearch(current.name)}}>구매하기</button>}
              <button className="island-small-button island-enter" onClick={finishBatch}><Check size={14}/>완료</button>
            </>:placed && !pending ? (
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
                    onClick={() => navigate(current.to!)}
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
            <button className="island-small-button" onClick={()=>{
              if(!storeLand({...state,landStock:0},selectedLand)){setMessage('시설이 있거나 다른 배치를 지탱하는 땅은 옮길 수 없어요. 먼저 시설을 옮겨주세요.');return}
              setMovingLand(selectedLand);setLandPreview(selectedLand);setTool('land');setSelected(null);setSelectedLand(null);setPending(false)
            }}>이동</button>
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
      <nav className="island-dock" aria-label="섬 꾸미기 도구">
        <button
          className={tool === 'land' ? 'active' : ''}
          aria-pressed={tool === 'land'}
          onClick={() => {
            setSelectedLand(null)
            if (tool === 'land') {
              setTool('edit')
              setMessage('시설을 눌러 이동·보관하거나 페이지로 들어가세요.')
              return
            }
            if(state.landStock===0){setPanel('shop');setCategory('land');setSearch('');setMessage('꾸미기 상점에서 땅을 구매한 뒤 배치해주세요.');return}
            setEditMode('terrain');setTool('land')
            setPanel(null)
            setSelected(null)
            setPending(false)
            setMessage(
              `빈 바다를 눌러 보관한 땅을 배치하세요. · 남은 땅 ${state.landStock}칸`,
            )
          }}
        >
          <Plus size={20} />
          <span>{tool === 'land' ? '땅 추가 완료' : '땅 추가'}</span>
        </button>
        <button
          className={panel === 'storage' ? 'active' : ''}
          onClick={() => {
            setPanel(panel === 'storage' ? null : 'storage')
            setCategory('all')
          }}
        >
          <Archive size={20} />
          <span>
            보관함{unplaced.length + state.landStock ? ` ${unplaced.length + state.landStock}` : ''}
          </span>
        </button>
        <button
          className={panel === 'shop' ? 'active' : ''}
          onClick={() => {
            setPanel(panel === 'shop' ? null : 'shop')
            setCategory('all')
          }}
        >
          <ShoppingBag size={20} />
          <span>꾸미기 상점</span>
        </button>
        <i />
        <button
          aria-label="되돌리기"
          disabled={!history.length}
          onClick={undo}
        >
          <Undo2 size={20} />
          <span>되돌리기</span>
        </button>
      </nav>
      {panel && (
        <aside
          className="island-drawer"
          aria-label={panel === 'shop' ? '꾸미기 상점' : '시설 보관함'}
        >
          <div className="island-drawer-head">
            <div>
              <span>MAKE IT YOURS</span>
              <h2>{panel === 'shop' ? '작은 섬 꾸미기 상점' : '나의 보관함'}</h2>
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
              ? '체험용 상점이에요. 실제 골드나 결제는 사용하지 않아요.'
              : '보관한 건물과 장식물을 꺼내 빈 땅에 놓아주세요.'}
          </p>
          {live && panel === 'storage' && (
            <>
              <p className="island-drawer-note">
                시설을 선택하고 ‘페이지로’를 누르면 해당 페이지로 이동해요.
              </p>
            </>
          )}
          {panel === 'storage' && (
            <div className="island-tabs" aria-label="시설 배치 상태">
              <button
                className={inventoryMode === 'stored' ? 'active' : ''}
                onClick={() => setInventoryMode('stored')}
              >
                보관 중 {unplaced.length + state.landStock}
              </button>
              <button
                className={inventoryMode === 'placed' ? 'active' : ''}
                onClick={() => setInventoryMode('placed')}
              >
                배치됨 {state.layout.length}
              </button>
            </div>
          )}
          <div className="island-tabs">
            {(['all', 'building', 'decoration', 'floor', 'land'] as const)
              .filter((c) => panel === 'storage' || c !== 'land')
              .map((c) => (
                <button
                  key={c}
                  className={category === c ? 'active' : ''}
                  onClick={() => setCategory(c)}
                >
                  {c === 'all'
                    ? '전체'
                    : c === 'building'
                      ? '건물'
                      : c === 'land'
                        ? '땅'
                        : c === 'floor'
                          ? '바닥 타일'
                          : '장식'}
                </button>
              ))}
          </div>
          <input
            className="island-search"
            type="search"
            aria-label="건물·장식 검색"
            placeholder="건물이나 장식 이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="island-products">
            {(panel === 'shop' || (panel === 'storage' && inventoryMode === 'stored')) &&
              (category === 'all' || category === 'land') &&
              (panel === 'shop'||state.landStock > 0) &&
              '땅 조각'.includes(search.trim()) && (
                <article className="island-product">
                  <div className="island-product-art">
                    <LandThumbnail />
                    <span className="island-count">{state.landStock}개</span>
                  </div>
                  <h3>땅 조각</h3>
                  <small>1 × 1칸 · 바다에 배치</small>
                  <button
                    className="island-buy-button"
                    disabled={panel==='shop'&&(state.coins<LAND_PRICE||state.landStock>=10000)}
                    onClick={() => {
                      if(panel==='shop'){const next=buyLand(state);if(next){change(next);setMessage('땅 조각 한 개를 구매했어요. 보관함에서 꺼내 배치하세요.')}return}
                      setEditMode('terrain');setTool('land')
                      setPanel(null)
                      setSelected(null)
                      setSelectedLand(null)
                      setPending(false)
                      setMessage(
                        `바다를 눌러 보관한 땅을 배치하세요. · 남은 땅 ${state.landStock}칸`,
                      )
                    }}
                  >
                    {panel==='shop'?`구매 ${LAND_PRICE}`:'배치하기'}
                  </button>
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
                      {panel === 'storage' && (
                        <span className="island-count">{state.tileStock[tile.id] ?? 0}개</span>
                      )}
                    </div>
                    <h3>{tile.name}</h3>
                    <small>바닥 전용 · 지형 변화 없음</small>
                    <button
                      className="island-buy-button"
                      disabled={panel === 'shop' && state.coins < tile.price}
                      onClick={() => {
                        if (panel === 'shop') {
                          const next = buyFloor(state, tile.id)
                          if (next) {
                            change(next)
                            setMessage(
                              `${tile.name} 한 칸을 구매했어요. 보관함의 바닥 타일에서 꺼내세요.`,
                            )
                          }
                        } else {
                          setFloor(tile.id)
                          setEditMode('terrain');setTool('floor')
                          setSelected(null)
                          setPending(false)
                          setPanel(null)
                          setMessage(
                            '땅을 눌러 한 칸씩 타일을 깔아주세요. 다른 바닥 위에 깔면 이전 타일은 회수돼요.',
                          )
                        }
                      }}
                    >
                      {panel === 'shop' ? (
                        <>
                          <Coins size={13} />
                          {tile.price}
                          <span>구매</span>
                        </>
                      ) : (
                        '바닥에 깔기'
                      )}
                    </button>
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
                    {panel === 'storage' && <span className="island-count">{ids.length}개</span>}
                  </div>
                  <h3>{f.name}</h3>
                  <small>
                    {f.w} × {f.h}칸{f.kind === 'dock' ? ' · 해안 전용' : ''}
                    {f.placementTerrain === 'water'?' · 바다 전용':f.placementTerrain === 'any' ? ' · 육지·바다' : ''}
                    {f.category === 'decoration'
                      ? canRotate(f.id)
                        ? ' · 회전 가능'
                        : ' · 회전 불가'
                      : ''}
                  </small>
                  <button
                    className="island-buy-button"
                    disabled={
                      panel === 'shop' &&
                      (state.coins < f.price || state.owned.filter(isDecoration).length >= 300)
                    }
                    onClick={() => {
                      if (panel === 'shop') purchase(f.id)
                      else {
                        setSelectedLand(null)
                        setSelected(ids[0])
                        const existing = state.layout.find((p) => p.id === ids[0])
                        setBatchType(!existing&&f.category==='decoration'?f.id:null);setBatchPreview(null);setBatchSteps(0)
                        setRotation(existing?.rotation ?? 0)
                        setPending(!existing)
                        if (existing)
                          setCamera((c) => ({
                            ...c,
                            x: (existing.x + f.w / 2) * 32,
                            y: (existing.y + f.h / 2) * 32,
                          }))
                        setEditMode('decorate');setTool('edit')
                        setPanel(null)
                        setMessage(
                          f.kind === 'dock'
                            ? '육지와 바다가 닿는 곳에 항구를 놓으세요. 회전해서 방향을 바꿀 수 있어요.'
                            : f.placementTerrain === 'water'
                              ? '바다에 놓고 회전해서 땅과 땅을 이어보세요.'
                            : f.placementTerrain === 'any'
                              ? '육지나 바다를 눌러 배치하세요. 드래그하면 지도를 이동해요.'
                              : '빈 땅을 눌러 배치하세요. 드래그하면 지도를 이동해요.',
                        )
                      }
                    }}
                  >
                    {panel === 'shop' ? (
                      <>
                        <Coins size={13} />
                        {f.price}
                        <span>구매</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        {inventoryMode === 'placed' ? '위치 찾기' : '꺼내서 배치'}
                      </>
                    )}
                  </button>
                  {panel === 'storage' && f.category === 'decoration' && (
                    <button
                      className="island-sell-button"
                      aria-label={`${f.name} 판매 ${decorationSellPrice(ids[0])}`}
                      onClick={() => sell(ids[0])}
                    >
                      <Coins size={12} />
                      판매 {decorationSellPrice(ids[0])}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
          {category === 'floor' && (
            <button
              className="island-refill"
              onClick={() => {
                setFloor('bare')
                setEditMode('terrain');setTool('floor')
                setPanel(null)
                setSelected(null)
                setPending(false)
              }}
            >
              맨땅으로 복원 · 깔린 타일 회수
            </button>
          )}
          {panel === 'storage' &&
            category !== 'floor' &&
            !(
              inventoryMode === 'stored' &&
              (category === 'all' || category === 'land') &&
              state.landStock > 0 &&
              '땅 조각'.includes(search.trim())
            ) &&
            !(
              category === 'all' &&
              floorTiles.some(
                (t) => (state.tileStock[t.id] ?? 0) > 0 && t.name.includes(search.trim()),
              )
            ) &&
            !filtered.some((f) => stored.some((id) => resolve(id)?.id === f.id)) && (
              <div className="island-empty">
                <Archive size={32} />
                <strong>
                  {search.trim()
                    ? '검색 결과가 없어요'
                    : inventoryMode === 'placed'
                      ? '배치한 물건이 없어요'
                      : '아직 보관한 물건이 없어요'}
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
          {panel === 'shop' && (
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
        </aside>
      )}
      <span className="island-mobile-tip">
        <Smartphone size={12} />
        가로로 돌리면 더 넓게 보여요
      </span>
    </section>
  )
}
