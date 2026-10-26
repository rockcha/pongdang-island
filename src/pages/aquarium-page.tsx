import {useAccountState} from '@/lib/account-query'
import { appArt } from '@/components/app-art'
import { randomId } from '@/lib/random-id'
import { AquariumView } from '@/features/aquarium/aquarium-view'
import {AquariumOverview} from '@/features/aquarium/aquarium-overview'
import { AquariumTankPicker } from '@/features/aquarium/aquarium-tank-picker'
import {AquariumCapacityExpansion} from '@/features/aquarium/capacity-expansion'
import { AquariumBackgroundDialog } from '@/features/aquarium/aquarium-background-dialog'
import type { DecorationPlacement, OwnedCollectible, Species } from '@/features/collection/api'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { goldError } from '@/features/gold/api'
import {
  backgroundUrl,
  arrangeDecoration,
  manageTank,
  readAquarium,
  expandAquariumCapacity,
  reorderAquariumTanks,
  tankOrderError,
  moveCollectibles,
  placeCollectible,
  setCollectibleDisplayLayer,
} from '@/features/aquarium/api'
import { CollectibleStorageDialog } from '@/features/aquarium/collectible-storage-dialog'
import type { AquariumState } from '@/features/aquarium/api'
import { CollectionDialog } from '@/features/collection/collection-dialog'
import { useOperator } from '@/features/notices/use-operator'
import { Link,useNavigate,useParams } from 'react-router'
import { useReturningTank } from '@/features/friends/visit-return'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'

const { map: MapIcon } = appArt

export function AquariumPage() {
  const {tankId:routeTankId}=useParams<{tankId:string}>()
  const navigate=useNavigate()
  const { operator } = useOperator()
  const { wallet, transact, refresh:refreshGold, busy: goldBusy, loading: goldLoading, error: goldLoadError } = useGold()
  const [state,setState,query]=useAccountState<AquariumState>('aquarium',readAquarium)
  const [testFish, setTestFish] = useState<OwnedCollectible[]>([])
  const { id: returningTankId, save: saveReturningTank } = useReturningTank()
  const [selectedId, setSelectedId] = useState(returningTankId)
  const expanded=!!routeTankId
  const overviewScroll=useRef(0)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameError, setRenameError] = useState('')
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  const active = useRef(true)
  const locked = useRef(false)
  const navigationRequest = useRef(0)
  const placementQueue = useRef(new Map<string, Promise<void>>())
  async function reload() {
    try {
      const {data}=await query.refetch({throwOnError:true,cancelRefetch:false})
      if (active.current) {
        if(data)setState(data)
        setError('')
      }
    } catch {
      if (active.current)
        setError('어항 정보를 불러오지 못했어요. 다시 시도해주세요.')
    }
  }
  useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
  useEffect(()=>{setError(query.error?'어항 정보를 불러오지 못했어요. 다시 시도해주세요.':'')},[query.error])
  async function act(id: string, owned: boolean) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      if (owned && tank) {
        const data = await manageTank(tank.id, 'equip', id)
        if (active.current) setState(data)
      } else {
        await transact({
          type: 'buy',
          id: `background:${id}`,
          name: state?.catalog.find((item) => item.id === id)?.name,
        })
        await reload()
      }
    } catch (cause) {
      toast.error(goldError(cause))
      throw cause
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  const tank = state?.tanks.find((item) => item.id === (routeTankId??selectedId)) ?? state?.tanks[0]
  const tankId = tank?.id
  useEffect(() => { if (tankId) saveReturningTank(tankId) }, [tankId, saveReturningTank])
  useEffect(()=>{
    navigationRequest.current++
    if(routeTankId&&state&&!state.tanks.some(item=>item.id===routeTankId))navigate('/aquarium',{replace:true})
  },[routeTankId,state,navigate])
  const selected = state?.catalog.find((item) => item.id === tank?.background_id)
  const tankIndex = state?.tanks.findIndex((item) => item.id === tank?.id) ?? 0
  function changeTank(direction: 'previous' | 'next') {
    if (busy || goldBusy || !state || state.tanks.length < 2) return
    const next = state.tanks[(tankIndex + (direction === 'next' ? 1 : -1) + state.tanks.length) % state.tanks.length]
    if (next) {
      const request = ++navigationRequest.current
      const background = state.catalog.find((item) => item.id === next.background_id)
      const commit = () => {
        if (active.current && request === navigationRequest.current) navigate('/aquarium/'+encodeURIComponent(next.id),{replace:true})
      }
      if (!background) {
        commit()
        return
      }
      const image = new Image()
      image.onload = commit
      image.onerror = commit
      image.src = backgroundUrl(background.image_path)
    }
  }
  useEffect(() => {
    if (!state || state.tanks.length < 2) return
    const count = state.tanks.length
    for (const nearby of [state.tanks[(tankIndex - 1 + count) % count], state.tanks[(tankIndex + 1) % count]]) {
      const background = state.catalog.find((item) => item.id === nearby?.background_id)
      if (background) {
        const image = new Image()
        image.src = backgroundUrl(background.image_path)
      }
    }
  }, [state, tankIndex])
  function addTemporary(species: Species) {
    if (!operator || !tank || (species.kind==='map'||species.kind==='relic')) return
    setTestFish((current) => [
      ...current,
      {
        id: 'test-' + randomId(),
        species_id: species.id,
        tank_id: tank.id,
        animation_seed: Math.floor(Math.random() * 1000000),
        position_x: null,
        position_y: null,
        rotation: 0,
        scale: 1,
        acquired_at: new Date().toISOString(),
        species,
      },
    ])
    toast.success(species.name + ' 임시 개체를 넣었어요.')
  }
  const inhabitants = [...(state?.inhabitants ?? []), ...(operator ? testFish : [])].filter(
    (item) => item.tank_id === tank?.id,
  )
  function place(id: string, x: number, y: number) {
    if (!tank) return
    const tankId = tank.id
    const update = (items: OwnedCollectible[]) =>
      items.map((item) => (item.id === id ? { ...item, position_x: x, position_y: y } : item))
    if (id.startsWith('test-')) {
      setTestFish(update)
      return
    }
    setState((current) =>
      current ? { ...current, inhabitants: update(current.inhabitants) } : current,
    )
    const operation = (placementQueue.current.get(id) ?? Promise.resolve()).then(async () => {
      try {
        await placeCollectible(id, tankId, x, y)
      } catch {
        toast.error('위치를 저장하지 못했어요. 연결을 확인하고 다시 옮겨주세요.')
      }
    })
    placementQueue.current.set(id, operation)
    void operation.finally(() => {
      if (placementQueue.current.get(id) === operation) placementQueue.current.delete(id)
    })
  }
  async function arrange(id: string, value: DecorationPlacement) {
    if (!tank || locked.current) throw new Error('잠시 후 다시 시도해주세요.')
    const tankId = tank.id
    const previous = state?.inhabitants.find((item) => item.id === id)??testFish.find(item=>item.id===id)
    const scaleOnly=previous?.species.kind==='fish'&&previous.species.movement_type!=='fixed'
    const changes=scaleOnly?{scale:value.scale}:value
    if (id.startsWith('test-')) {
      setTestFish((current) =>
        current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
      )
      return
    }
    setState((current) =>
      current
        ? {
            ...current,
            inhabitants: current.inhabitants.map((item) =>
              item.id === id ? { ...item, ...changes } : item,
            ),
          }
        : current,
    )
    locked.current = true
    setBusy(true)
    try {
      await placementQueue.current.get(id)
      const saved = await arrangeDecoration(id, tankId, value,scaleOnly)
      if (active.current)
        setState((current) =>
          current
            ? {
                ...current,
                inhabitants: current.inhabitants.map((item) =>
                  item.id === id ? { ...item, ...saved } : item,
                ),
              }
            : current,
        )
    } catch (cause) {
      if (previous && active.current)
        setState((current) =>
          current
            ? {
                ...current,
                inhabitants: current.inhabitants.map((item) => (item.id === id ? previous : item)),
              }
            : current,
        )
      throw cause
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  async function changeLayer(id: string, layer: number | null) {
    if (!tank || locked.current) throw new Error('BUSY')
    if (id.startsWith('test-')) {
      setTestFish(current => current.map(item => item.id === id ? {...item, display_layer: layer} : item))
      return
    }
    locked.current = true
    setBusy(true)
    try {
      await placementQueue.current.get(id)
      const saved = await setCollectibleDisplayLayer(id, tank.id, layer)
      if (active.current) setState(current => current ? {...current, inhabitants: current.inhabitants.map(item => item.id === id ? {...item, display_layer: saved.display_layer} : item)} : current)
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  async function sell(ids: string[]) {
    if (locked.current || goldBusy) throw new Error('다른 작업을 마친 뒤 다시 판매해주세요.')
    locked.current = true
    setBusy(true)
    try {
      await transact({ type: 'sell', id: `collectibles:${[...ids].sort().join(',')}` })
      setState((current) =>
        current
          ? {
              ...current,
              inhabitants: current.inhabitants.filter((item) => !ids.includes(item.id)),
            }
          : current,
      )
      await reload()
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  async function move(ids: string[], targetTankId: string | null) {
    if (locked.current || goldBusy) throw new Error('BUSY')
    locked.current = true
    setBusy(true)
    try {
      await Promise.all(ids.map((id) => placementQueue.current.get(id)))
      const data = await moveCollectibles(ids, targetTankId)
      if (active.current) setState(data)
      toast.success(targetTankId ? '선택한 개체를 어항에 넣었어요.' : '보관함으로 옮겼어요.')
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  useEffect(() => {
    setName(tank?.name ?? '')
  }, [tank?.id, tank?.name])
  async function buyTank() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setPurchaseError('')
    try {
      await transact({ type: 'buy', id: 'aquarium:tank' })
      setPurchaseOpen(false)
      await reload()
    } catch (cause) {
      setPurchaseError(goldError(cause))
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  function openRename(id:string){
    const target=state?.tanks.find(item=>item.id===id)
    if(!target||busy||goldBusy)return
    navigationRequest.current++
    setSelectedId(id);setName(target.name);setRenameError('');setRenameOpen(true)
  }
  async function rename() {
    if (
      !tank ||
      locked.current ||
      goldBusy ||
      !name.trim() ||
      name.length > 8 ||
      name.trim() === tank.name
    )
      return
    locked.current = true
    setBusy(true)
    setRenameError('')
    try {
      const data = await manageTank(tank.id, 'rename', name.trim())
      if (active.current) {
        setState(data)
        setRenameOpen(false)
      }
      toast.success('어항 이름을 저장했어요.')
    } catch (cause) {
      if (active.current) setRenameError(goldError(cause))
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  return (
    <section
      aria-label="아쿠아리움"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <AquariumView
        overviewContent={!expanded?(state?<AquariumOverview onRename={openRename} state={state} items={[...state.inhabitants,...(operator?testFish:[])]} busy={busy||goldBusy} scrollTop={overviewScroll.current} onScroll={value=>{overviewScroll.current=value}} onSelect={id=>{navigationRequest.current++;navigate('/aquarium/'+encodeURIComponent(id))}} onAdd={()=>{setPurchaseError('');setPurchaseOpen(true)}}/>:<div role="status" className="min-h-0 flex-1 space-y-4 overflow-hidden p-4"><p className="text-xs text-muted-foreground">어항을 준비하고 있어요.</p>{[0,1].map(i=><div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50 motion-reduce:animate-none"/>)}</div>):undefined}
        tankId={tank?.id}
        loading={!state && !error}
        items={inhabitants}
        name={tank?.name ?? '어항을 불러오는 중…'}
        background={selected}
        busy={busy || goldBusy || goldLoading || !!goldLoadError}
        onPlace={place}
        onArrange={arrange}
        onLayerChange={changeLayer}
        onSell={sell}
        onMove={move}
        tanks={state?.tanks}
        inhabitants={state?.inhabitants}
        tankCapacity={tank?.capacity??state?.tankCapacity}
        capacityControls={state&&tank?<AquariumCapacityExpansion menu tank={tank} count={state.inhabitants.filter(item=>item.tank_id===tank.id).length} gold={wallet.gold} busy={busy||goldBusy||goldLoading||!!goldLoadError} onExpand={async(capacity,operation)=>{
          if(locked.current)throw new Error('BUSY')
          locked.current=true;setBusy(true)
          try{
            const data=await expandAquariumCapacity(tank.id,capacity,operation)
            if(active.current)setState(data)
            await Promise.allSettled([refreshGold()])
          }finally{locked.current=false;if(active.current)setBusy(false)}
        }}/>:undefined}
        onStore={(ids) => move(ids, null)}
        purchase={
          state
            ? {
                price: state.tankPrice,
                disabled:
                  busy ||
                  goldBusy ||
                  goldLoading ||
                  !!goldLoadError ||
                  wallet.gold < state.tankPrice,
                onBuy: () => {
                  setPurchaseError('')
                  setPurchaseOpen(true)
                },
              }
            : undefined
        }
        onGiftSent={(ids) => {
          setState((current) =>
            current
              ? {
                  ...current,
                  inhabitants: current.inhabitants.filter((item) => !ids.includes(item.id)),
                }
              : current,
          )
          void reload()
        }}
        navigation={
          state ? { index: tankIndex, count: state.tanks.length, onChange: changeTank } : undefined
        }
        storageControls={
          <>
            {state && tank && (
              <CollectibleStorageDialog
                state={state}
                currentTankId={tank.id}
                busy={busy || goldBusy}
                onAssign={move}
                onSell={sell}
                onGiftSent={() => void reload()}
              />
            )}
          </>
        }
        managementControls={
          <>
            <div className="flex flex-col items-center gap-1">
              <CollectionDialog onAddTemporary={operator && tank ? addTemporary : undefined} />
              <span className="text-[10px] text-muted-foreground">바다 도감</span>
            </div>
            {state && tank ? (
              <div className="flex flex-col items-center gap-1">
                <AquariumBackgroundDialog
                  state={state}
                  selectedId={tank.background_id}
                  previewItems={state.inhabitants.filter(i=>i.tank_id===tank.id)}
                  gold={wallet.gold}
                  busy={busy || goldBusy}
                  loading={goldLoading}
                  error={!!goldLoadError}
                  onAct={act}
                />
                <span className="text-[10px] text-muted-foreground">배경 바꾸기</span>
              </div>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    to="/harbor"
                    aria-label="지도로"
                    className="inline-flex min-h-16 w-full shrink-0 flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  />
                }
              >
                <MapIcon className="size-7" />
                <span className="text-[10px] text-muted-foreground">지도로</span>
              </TooltipTrigger>
              <TooltipContent>지도로</TooltipContent>
            </Tooltip>
          </>
        }
        selectorControls={
          state && tank ? (
            <AquariumTankPicker
              tanks={state.tanks}
              selectedId={tank.id}
              backgrounds={state.catalog}
              busy={busy || goldBusy}
              onReorder={async(ids,expectedIds)=>{
                if(locked.current)throw new Error('다른 작업을 마친 뒤 다시 시도해 주세요.')
                locked.current=true;setBusy(true)
                const currentTankId=tank.id
                try{
                  const next=await reorderAquariumTanks(ids,expectedIds)
                  if(active.current){setState(next);setSelectedId(currentTankId)}
                }catch(cause){
                  if(/TANK_ORDER_CHANGED|INVALID_TANK_ORDER/.test(String((cause as {message?:string})?.message??'')))await reload()
                  throw new Error(tankOrderError(cause))
                }finally{locked.current=false;if(active.current)setBusy(false)}
              }}
              onSelect={(id) => {
                navigationRequest.current++
                navigate('/aquarium/'+encodeURIComponent(id),{replace:expanded})
              }}
              onAdd={() => {
                setPurchaseError('')
                setPurchaseOpen(true)
              }}
              onRename={openRename}
            />
          ) : undefined
        }
        nameControls={
          <>
            {tank && (
              <Dialog
                open={renameOpen}
                onOpenChange={(value) => {
                  if (!busy && !goldBusy) {
                    setRenameOpen(value)
                    if (value) {
                      setName(tank.name)
                      setRenameError('')
                    }
                  }
                }}
              >
                <DialogContent className="gap-5 rounded-xl p-5 sm:max-w-sm" showCloseButton={!busy}>
                  <DialogHeader className="pr-7">
                    <DialogTitle className="flex items-center gap-2">
                      <img
                        src="/branding/pongi-starfish.png"
                        alt=""
                        aria-hidden="true"
                        className="size-6 object-contain"
                      />
                      어항 이름 바꾸기
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      최대 8자까지 입력할 수 있어요.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="space-y-5"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void rename()
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="tank-name" className="sr-only">
                        어항 이름
                      </Label>
                      <div className="relative">
                        <Input
                          autoFocus
                          id="tank-name"
                          aria-describedby={
                            renameError ? 'tank-name-error tank-name-length' : 'tank-name-length'
                          }
                          aria-invalid={!!renameError}
                          className="h-12 rounded-lg border-input bg-secondary/30 pr-16 text-base focus-visible:ring-ring/40"
                          placeholder="어항 이름"
                          value={name}
                          maxLength={8}
                          required
                          disabled={busy || goldBusy}
                          onFocus={(event) => event.target.select()}
                          onChange={(event) => {
                            setName(event.target.value)
                            setRenameError('')
                          }}
                        />
                        <span
                          id="tank-name-length"
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                        >
                          {name.length}/8
                        </span>
                      </div>
                      {renameError && (
                        <p id="tank-name-error" role="alert" className="text-xs text-destructive">
                          {renameError}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 rounded-lg"
                        disabled={busy || goldBusy}
                        onClick={() => setRenameOpen(false)}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        className="min-h-11 rounded-lg"
                        aria-busy={busy}
                        disabled={
                          busy ||
                          goldBusy ||
                          !name.trim() ||
                          name.length > 8 ||
                          name.trim() === tank.name
                        }
                      >
                        {busy ? '저장 중…' : '저장'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />
      <ConfirmDialog
        illustration="aquarium"
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        title={
          <span className="inline-flex items-center gap-2">
            <img
              src="/branding/pongi-starfish.png"
              alt=""
              aria-hidden="true"
              className="size-6 object-contain"
            />
            어항 추가
          </span>
        }
        description={
          <>
            아쿠아리움을 추가하시겠습니까?
            <span className="mt-3 flex items-center justify-center gap-1 text-sm text-primary">
              <GoldIcon className="size-5" />
              {(state?.tankPrice ?? 350).toLocaleString('ko-KR')}
            </span>
          </>
        }
        busy={busy || goldBusy}
        error={purchaseError}
        confirmDisabled={
          !state || goldLoading || !!goldLoadError || wallet.gold < (state?.tankPrice ?? 350)
        }
        onConfirm={() => void buyTank()}
      />
      {error && (
        <div
          role="alert"
          className="absolute inset-x-4 top-16 z-30 space-y-2 rounded-xl bg-background/95 p-3 text-sm text-destructive"
        >
          <p>{error}</p>
          <Button variant="outline" onClick={() => void reload()}>
            다시 불러오기
          </Button>
        </div>
      )}
    </section>
  )
}
