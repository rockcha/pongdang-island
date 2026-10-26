import {Menu as ActionMenu} from '@base-ui/react/menu'
import {createPortal} from 'react-dom'
import {useAquariumWideMode} from '@/features/aquarium/use-aquarium-wide-mode'
import {AquariumLike} from './aquarium-like'
import {FriendAquariumActions} from './friend-aquarium-actions'
import { useEffect, useLayoutEffect, useMemo, useState,useRef } from 'react'
import type {ReactNode} from 'react'
import { Link, useParams,useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight,Maximize2,Minimize2,Minus,Plus,Ellipsis,ZoomIn } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { TankInhabitants } from '@/features/aquarium/tank-inhabitants'
import { TankBubbles } from '@/features/aquarium/tank-bubbles'
import { AquariumBackdrop } from '@/features/aquarium/aquarium-backdrop'
import {AquariumLoading} from '@/features/aquarium/aquarium-loading'
import { themePanoramaUrl } from '@/features/aquarium/theme-panorama'
import { clampTankCameraView } from '@/features/aquarium/tank-world'
import {useFittedTankViewport} from '@/features/aquarium/use-fitted-tank-viewport'
import type { OwnedCollectible } from '@/features/collection/api'
import { loadFriendAquarium, visitError } from './aquarium-api'
import type { FriendAquarium } from './aquarium-api'
import { AquariumCare } from './aquarium-care'
import { FriendAquariumPicker } from './friend-aquarium-picker'
import {AquariumOverview} from '@/features/aquarium/aquarium-overview'

export function FriendAquariumPage() {
  const { ownerId } = useParams()
  return <Visit key={ownerId} owner={ownerId ?? ''} />
}
function Visit({ owner }: { owner: string }) {
  const [params,setParams]=useSearchParams()
  const selectedTank=params.get('tank')
  const expanded=!!selectedTank
  function selectTank(id:string,replace=false){const next=new URLSearchParams(params);next.set('tank',id);setParams(next,{replace})}
  const overviewScroll=useRef(0)
  const [data, setData] = useState<FriendAquarium | null>(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    loadFriendAquarium(owner)
      .then((value) => {
        if (active) {
          setData(value)
          setError('')
        }
      })
      .catch((cause) => {
        if (active) setError(visitError(cause))
      })
    return () => {
      active = false
    }
  }, [owner, attempt])
  const index=Math.max(0,data?.tanks.findIndex(t=>t.id===selectedTank)??0)
  const tank = data?.tanks[index]
  const items = useMemo(
    () =>
      data?.inhabitants
        .filter((item) => item.tank_id === tank?.id)
        .map((item) => ({ ...item, interaction_locked: true })) ?? [],
    [data, tank?.id],
  )
  const background = data?.backgrounds.find((b) => b.id === tank?.background_id)
  const allItems=useMemo(()=>data?.inhabitants.map(item=>({...item,interaction_locked:true}))??[],[data])
  if (error)
    return (
      <div role="alert" className="space-y-3 py-8">
        <p>{error}</p>
        <Button onClick={() => setAttempt((v) => v + 1)}>다시 불러오기</Button>
        <Link to="/friends" className="ml-3 text-sm underline">
          등대로
        </Link>
      </div>
    )
  if (!data)
    return (
      <div className="relative min-h-64 flex-1"><AquariumLoading/></div>
    )
  function move(direction: number) {
    if (!data || data.tanks.length < 2) return
    const count = data.tanks.length
    selectTank(data.tanks[(index+direction+count)%count].id,true)
  }
  return (
    <section className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" aria-label="친구 아쿠아리움">
      {!tank ? (
        <div className="p-4">
          <Link to="/friends" className="text-sm underline">
            친구 목록으로
          </Link>
          <p className="py-16 text-center text-sm text-muted-foreground">
            친구가 아직 어항을 준비하지 않았어요.
          </p>
        </div>
      ) : (
        <>
          <div className="flex h-14 shrink-0 items-center gap-1 border-b bg-background px-2">
            <PlayerAvatar userId={data.owner.id}
              nickname={data.owner.nickname}
              path={data.owner.avatar_path}
              className="mr-1 size-10 shrink-0 ring-2 ring-secondary"
            />
            <Link
              to="/friends"
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'min-h-11 min-w-0 max-w-24 truncate px-2 text-xs',
              })}
            >
              {data.owner.nickname}
            </Link>
            <AquariumLike owner={owner}/>
            {expanded&&<><Button
              variant="ghost"
              size="icon"
              className="min-h-11"
              aria-label="이전 어항"
              disabled={data.tanks.length < 2}
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="min-w-0 flex-1 truncate text-center text-xs">
              {tank.name}
              <span className="ml-1 text-muted-foreground">
                {index + 1}/{data.tanks.length}
              </span>
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11"
              aria-label="다음 어항"
              disabled={data.tanks.length < 2}
              onClick={() => move(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            </>}
          </div>
          <FriendAquariumActions owner={owner} nickname={data.owner.nickname}/>
          {expanded?<FriendTankScene key={tank.id} name={tank.name} items={items} background={background}>
            <AquariumCare key={'care:' + tank.id} tank={tank.id} />
          </FriendTankScene>:<AquariumOverview label="친구 어항 목록" state={{tanks:data.tanks,catalog:data.backgrounds}} items={allItems} busy={false} scrollTop={overviewScroll.current} onScroll={value=>{overviewScroll.current=value}} onSelect={id=>selectTank(id)}/>}
          <div className="flex shrink-0 divide-x divide-border border-t bg-background pb-[env(safe-area-inset-bottom)]">
            <Link
              to="/aquarium"
              className="flex min-h-12 flex-1 items-center justify-center gap-2 text-xs text-primary"
            >
              <ChevronLeft className="size-4" />내 어항
            </Link>
            <FriendAquariumPicker />
          </div>
        </>
      )}
    </section>
  )
}

function FriendTankScene({name,items,background,children}:{name:string;items:OwnedCollectible[];background?:{name:string;image_path:string};children:ReactNode}){
  const wide=useAquariumWideMode()
  const [view,setView]=useState(1)
  const [zoom,setZoom]=useState(1),[verticalView,setVerticalView]=useState(0)
  const fitted=useFittedTankViewport(0,!wide.active,true)
  const portraitZoom=fitted.height/(fitted.width*1.6)
  const [viewRequest,setViewRequest]=useState<{position:number;zoom?:number;y?:number}>({position:1})
  useLayoutEffect(()=>{
    const zoom=wide.active?1/3:portraitZoom,position=wide.active?0:1.5-1/(2*portraitZoom)
    setZoom(zoom);setView(position);setVerticalView(0)
    setViewRequest({position,zoom,y:0})
  },[wide.active,portraitZoom])
  const src=themePanoramaUrl(background?.image_path)
  const scene=<div ref={fitted.ref} aria-label={name} data-testid="friend-aquarium-viewport" className={`flex min-h-0 w-full flex-1 justify-center overflow-hidden ${wide.active?'items-center':'items-start'}`}><div className="aquarium-fitted-glass friend-aquarium-scene relative shrink-0 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200" style={wide.active?{width:'min(100vw, calc(100dvh * 1.875))',height:'min(calc(100vw / 1.875), 100dvh)'}:{width:fitted.width,height:fitted.height}} tabIndex={0} aria-label="친구 어항 둘러보기" onKeyDown={event=>{
    if(event.target!==event.currentTarget||!src)return
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setViewRequest({position:clampTankCameraView(view+(event.key==='ArrowLeft'?-.15:.15),3,zoom)})}
  }}><TankInhabitants key={String(wide.active)+(!wide.active?portraitZoom.toFixed(4):'')} items={items} showControls={false} preview={wide.active} fitView={!wide.active&&!!src}
    world={src?{columns:3,overview:true,fixedViewport:true,minZoom:wide.active?1/3:portraitZoom,maxZoom:wide.active?2:portraitZoom*2,initialZoom:wide.active?1/3:portraitZoom,initialView:wide.active?0:1.5-1/(2*portraitZoom),preserveArrangement:false,onZoomChange:setZoom,onViewChange:setView,onVerticalViewChange:setVerticalView}:undefined}
    viewRequest={src?viewRequest:undefined}
    scenery={<><AquariumBackdrop background={background} panorama={src?{src,view,zoom,fixedViewport:true,heightRatio:wide.active?1.6/3:fitted.height/fitted.width,y:verticalView}:undefined}/><TankBubbles/></>}
  />{!wide.active&&children}
  {!wide.active&&<ActionMenu.Root><ActionMenu.Trigger render={<Button variant="ghost" size="icon" aria-label="친구 어항 더보기" className="absolute right-2 top-2 z-40 min-h-11 rounded-full border border-white/50 bg-background/80 text-primary shadow-sm backdrop-blur-sm"/>}><Ellipsis className="size-4"/></ActionMenu.Trigger><ActionMenu.Portal><ActionMenu.Positioner align="end" sideOffset={6} collisionPadding={12} className="z-50"><ActionMenu.Popup className="min-w-40 rounded-xl border border-border/60 bg-popover p-1.5 text-xs shadow-lg outline-none">
   <ActionMenu.Item onClick={wide.enter} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><Maximize2 className="size-4"/>가로로 보기</ActionMenu.Item>
   {src&&<ActionMenu.Item onClick={()=>{const next=zoom>portraitZoom+.001?portraitZoom:portraitZoom*1.5;setViewRequest({position:1.5-1/(2*next),zoom:next,y:0})}} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><ZoomIn className="size-4"/>{zoom>portraitZoom+.001?'화면 맞춤':'화면 확대'}</ActionMenu.Item>}
  </ActionMenu.Popup></ActionMenu.Positioner></ActionMenu.Portal></ActionMenu.Root>}
  {wide.active&&<Button variant="ghost" aria-label="가로 화면 종료" onClick={wide.exit} className="absolute right-2 top-2 z-40 min-h-10 rounded-full bg-background/85 text-xs shadow-sm"><Minimize2 className="size-4"/>가로 화면 종료</Button>}
  {wide.active&&<div className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-background/90 p-1"><Button variant="ghost" size="icon" aria-label="친구 어항 축소" onClick={()=>setViewRequest({position:view,zoom:Math.max(1/3,zoom-.15),y:verticalView})}><Minus className="size-4"/></Button><Button variant="ghost" className="text-xs" onClick={()=>setViewRequest({position:0,zoom:1/3,y:0})}>전체 맞춤</Button><Button variant="ghost" size="icon" aria-label="친구 어항 확대" onClick={()=>setViewRequest({position:view,zoom:Math.min(2,zoom+.15),y:verticalView})}><Plus className="size-4"/></Button></div>}
  </div></div>
  return wide.active?createPortal(<div role="region" aria-label="친구 아쿠아리움 가로 화면" className="fixed inset-0 z-40 flex h-dvh w-screen bg-cyan-950">{scene}</div>,document.body):scene
}
