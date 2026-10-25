import {hasCrimsonEmission} from './crimson-emission'
import {CrimsonEmissionRenderer} from './crimson-emission-renderer'
import {sharedDecorationFrame} from './shared-decoration-animation'
import { inhabitantDepth } from './inhabitant-depth'
import { glassAttachedSpecies } from './glass-attached-species'
import {dreamabyssFixedFrame} from './dreamabyss-animation'
import Phaser from 'phaser'
import { collectibleUrl } from '@/features/collection/api'
import type { OwnedCollectible } from '@/features/collection/api'
import { InhabitantMotion } from './inhabitant-motion'
import {swimSpawnLayout} from './swim-spawn'
import {canArrangeSpecies,isPositionFixed,movementSettings,shouldFlipSpecies} from './movement-settings'
import {premiumSwimFrame} from './premium-swim-frame'
import {decorationGeometry} from './decoration-geometry'
import {swimFrameLayout} from './swim-frame-layout'
import {tankResolution} from './tank-resolution'
import {mythicSheetColumns,mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from './mythic-swim'
import {primalPlantAsset,primalPlantFrame} from './primal-plants'
import {whitenightFixedFrame} from './whitenight-animation'
import {cloudferryFixedFrame} from './cloudferry-animation'
import {scrapisleFixedFrame} from './scrapisle-animation'
import {hasHalloweenSpirits} from './halloween-spirits'
import {HalloweenSpiritRenderer} from './halloween-spirit-renderer'
import {clampTankCameraView,aquariumLayoutWidth,panoramaTankHeight,draggedTankView,tankWorldItem,tankItemSpace} from './tank-world'
import type {TankWorldOptions} from './tank-world'

export type TankRenderer = { setZoom:(zoom:number,view?:number,y?:number)=>void; cancelGesture:()=>void; setItems: (items: OwnedCollectible[]) => void; setView: (view: number) => void; selectItem: (id: string) => void; resize: (width: number, height: number) => void; setReduced: (value: boolean) => void; setVisible: (value: boolean) => void; getStats: () => { count: number; textures: number; clock: number; renderer: string }; destroy: () => void }

export function createTankRenderer(parent: HTMLElement, initial: OwnedCollectible[], reduced: boolean, onError: (message: string) => void, onPlace?: (id:string,x:number,y:number)=>void,_onNavigate?:(direction:'previous'|'next')=>void,onSelectDecoration?:(id:string,x?:number,y?:number)=>void,onBackgroundTap?:()=>void,onSelectionPosition?:(id:string,x:number,y:number)=>void,world?:TankWorldOptions,onReadyChange?:(ready:boolean)=>void): TankRenderer {
  let items = initial, ready = false, disposed = false, clock = 0, visible = true
  let viewport=tankResolution(parent.clientWidth,parent.clientHeight,window.devicePixelRatio)
  const columns=world?.columns??1
  let verticalView=0
  let zoom=world?.overview?(world.initialZoom??1/columns):1
  const clampView=(value:number)=>clampTankCameraView(value,columns,zoom)
  const layoutWidth=()=>world?.overview?aquariumLayoutWidth:viewport.width
  const worldHeight=()=>world?.overview?panoramaTankHeight(aquariumLayoutWidth):viewport.height
  let view=clampView(world?.initialView??(world?.overview?0:columns===3?1:0)),targetView=view
  let lastWorldFrame=-1
  let lastWorldCount=-1,lastWorldView=-1
  const visibleWorldHeight=()=>viewport.height*layoutWidth()/(viewport.width*zoom)
  const clampVertical=(value:number)=>world?.fixedViewport?Math.max(0,Math.min(worldHeight()/layoutWidth()-visibleWorldHeight()/layoutWidth(),value)):0
  const cameraY=()=>world?.fixedViewport?verticalView*layoutWidth():0
  const worldWidth=()=>layoutWidth()*columns
  const cameraOffset=()=>layoutWidth()*view
  const itemSpace=(item:OwnedCollectible)=>tankItemSpace(item,layoutWidth(),columns,world?.preserveArrangement)
  const motionItem=(item:OwnedCollectible)=>itemSpace(item).local?item:tankWorldItem(item,layoutWidth(),columns)
  const entries = new Map<string, { motion: InhabitantMotion; sprite: Phaser.GameObjects.Sprite; path: string; sheet: boolean; previousX?:number; editingFrame?:number; spirits?:HalloweenSpiritRenderer; emission?:CrimsonEmissionRenderer }>()
  const queued = new Set<string>(), failed = new Set<string>()
  let spiritsQueued=false
  let selectedId:string|null=null
  const dragging=new Set<string>()
  let dragPointer: {pointer:Phaser.Input.Pointer;sprite:Phaser.GameObjects.Sprite;offsetX:number;offsetY:number}|null=null
  let swipe:{id:number;x:number;y:number;time:number;view:number;vertical:number}|null=null
  let decorationPress:{id:string;pointerId:number;x:number;y:number;dragged:boolean}|null=null
  const textureKey = (path: string) => `collectible:${path}`
  const draggable=(item:OwnedCollectible)=>(item.species.kind!=='map'&&item.species.kind!=='relic')&&!item.interaction_locked&&!item.placement_locked&&(item.placement_locked===undefined||!!item.editing)
  const asset = (item: OwnedCollectible) => {
    if(glassAttachedSpecies.has(item.species.id))return {path:item.species.thumbnail_path,sheet:false}
    const plant=primalPlantAsset(item.species.id,item.species.kind)
    if(plant)return {...plant,sheet:true}
    const sheet = (item.species.kind!=='map'&&item.species.kind!=='relic') && !!item.species.sprite_sheet_path
    return { path: sheet ? item.species.sprite_sheet_path! : item.species.thumbnail_path, sheet }
  }
  const itemPath=(item:OwnedCollectible)=>{const base=asset(item);return mythicSwimAsset(base.path,item.species.rarity)?.path??base.path}
  const requiredTextures=()=>{const keys=new Set(items.map(item=>textureKey(itemPath(item))));if(items.some(item=>hasHalloweenSpirits(item.species.id)))keys.add('effect:halloween-spirit');return keys}
  const signature=()=>items.map(item=>`${item.id}:${itemPath(item)}`).sort().join('|')
  let preparedSignature:string|null=null,reportedReady=false,syncRevision=0
  const reportReady=(value:boolean)=>{if(reportedReady!==value){reportedReady=value;onReadyChange?.(value)}}
  class TankScene extends Phaser.Scene {
    constructor() { super('aquarium') }
    configureCamera(){
      this.game.canvas.style.width=`${viewport.width}px`
      this.game.canvas.style.height=`${viewport.height}px`
      this.scale.updateBounds()
      verticalView=clampVertical(verticalView)
      this.cameras.main.setViewport(0,0,viewport.pixelWidth,viewport.pixelHeight)
        .setZoom(viewport.pixelWidth/layoutWidth()*zoom)
        .centerOn(cameraOffset()+layoutWidth()/(2*zoom),world?.fixedViewport?cameraY()+visibleWorldHeight()/2:worldHeight()/2)
      this.cameras.main.preRender()
      this.input.dragDistanceThreshold=6*viewport.ratio
    }
    pointerPosition(pointer:Phaser.Input.Pointer){return this.cameras.main.getWorldPoint(pointer.x,pointer.y)}
    setMythicGlow(sprite:Phaser.GameObjects.Sprite,rarity:string){
      if(this.game.renderer.type!==Phaser.WEBGL)return
      let glow=sprite.getData('mythicGlow') as Phaser.Filters.Glow|undefined
      if(rarity==='mythic'&&!glow){
        sprite.enableFilters()
        // A restrained outer halo preserves the original colors and details.
        // Automatic padding keeps the light from clipping at the sprite edge.
        glow=sprite.filters!.external.addGlow(0xffd078,.8,0,1,false,6,6)
        glow.setPaddingOverride(null)
        sprite.setData('mythicGlow',glow)
      }
      glow?.setActive(rarity==='mythic')
    }
    create() {
      if (disposed) return
      ready = true
      this.configureCamera()
      world?.onViewChange?.(view)
      world?.onZoomChange?.(zoom)
      this.input.setDefaultCursor('pointer')
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, targets: Phaser.GameObjects.GameObject[]) => {
        const point=this.pointerPosition(pointer)
        swipe=null
        decorationPress=null
        const target=targets[0] as Phaser.GameObjects.Sprite|undefined
        const id=target?.getData('collectibleId') as string|undefined
        if(id&&entries.has(id)&&!entries.get(id)!.motion.item.interaction_locked&&!entries.get(id)!.motion.item.placement_locked){
          decorationPress={id,pointerId:pointer.id,x:point.x,y:point.y,dragged:false}
          return
        }
        if(targets.length&&!(id&&entries.get(id)?.motion.item.placement_locked&&!entries.get(id)!.motion.item.interaction_locked))return
        swipe={id:pointer.id,x:point.x-cameraOffset(),y:point.y-cameraY(),time:performance.now(),view,vertical:verticalView}
      })
      this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{
        if(columns===1||world?.canPan?.()===false||!swipe||swipe.id!==pointer.id||!pointer.isDown)return
        const point=this.pointerPosition(pointer),dx=(point.x-cameraOffset())-swipe.x,dy=point.y-cameraY()-swipe.y
        if(world?.fixedViewport?Math.hypot(dx,dy)<8:Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy))return
        view=targetView=clampView(swipe.view-dx/layoutWidth()*.7)
        verticalView=clampVertical(swipe.vertical-dy/layoutWidth()*.7);world?.onVerticalViewChange?.(verticalView)
        this.configureCamera();world?.onViewChange?.(view)
      })
      this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
        const point=this.pointerPosition(pointer)
        const press=decorationPress;decorationPress=null
        if(press&&press.pointerId===pointer.id&&!press.dragged&&Math.hypot(point.x-press.x,point.y-press.y)<6){const entry=entries.get(press.id)
          if(entry){selectedId=press.id;const space=itemSpace(entry.motion.item),g=decorationGeometry(entry.motion.item,space.width,worldHeight());onSelectDecoration?.(press.id,g.w?(entry.sprite.x-space.offset-g.size/2-g.margin)/g.w:.5,g.h?(entry.sprite.y-g.size/2-g.margin)/g.h:.5)}
          return}
        if(!swipe||swipe.id!==pointer.id)return
        const start=swipe;swipe=null
        const dx=point.x-cameraOffset()-start.x,dy=point.y-cameraY()-start.y
        if(columns>1&&Math.abs(dx)>=8)return
        if(Math.hypot(dx,dy)<15){onBackgroundTap?.();this.tap(pointer)}
      })
      this.input.on('gameout',()=>{swipe=null;decorationPress=null;dragPointer=null})
      this.input.on('dragstart',(pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite)=>{
        const id=sprite.getData('collectibleId') as string
        const item=entries.get(id)?.motion.item
        if(!item||!draggable(item))return
        swipe=null
        if(decorationPress?.id===id)decorationPress.dragged=true
        if(item.placement_locked!==false){selectedId=null;onBackgroundTap?.()}
        dragging.add(id);sprite.setDepth(900)
        const point=this.pointerPosition(pointer)
        dragPointer={pointer,sprite,offsetX:sprite.x-point.x,offsetY:sprite.y-point.y}
        this.input.setDefaultCursor('grabbing')
      })
      this.input.on('drag',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite,x:number,y:number)=>{
        const draggingItem=entries.get(sprite.getData('collectibleId') as string)?.motion.item
        if(!draggingItem||!draggable(draggingItem))return
        const radians=sprite.angle*Math.PI/180
        const half=sprite.displayWidth*(Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians)))/2
        const entry=entries.get(sprite.getData('collectibleId') as string)
        const space=entry?itemSpace(entry.motion.item):{width:worldWidth(),offset:0}
        sprite.setPosition(Math.max(space.offset+half,Math.min(space.offset+space.width-half,x)),Math.max(half,Math.min(worldHeight()-half,y)))
      })
      this.input.on('dragend',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite)=>{
        dragPointer=null
        const id=sprite.getData('collectibleId') as string,entry=entries.get(id)
        dragging.delete(id);sprite.setDepth(entry?inhabitantDepth(entry.motion.item):0);this.input.setDefaultCursor('pointer')
        if(!entry||!draggable(entry.motion.item))return
        const size=Number(sprite.getData('logicalSize')??sprite.displayWidth)
        const space=itemSpace(entry.motion.item)
        const position=entry.motion.place(sprite.x-space.offset-size/2,sprite.y-size/2,clock,space.width,worldHeight(),reduced)
        entry.previousX=entry.motion.pose.x
        if(canArrangeSpecies(entry.motion.item.species)){
          onPlace?.(id,position.x,position.y)
        }
      })
      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        queued.delete(file.key); failed.add(file.key)
        if(requiredTextures().has(file.key)){reportReady(false);onError('일부 개체 이미지를 불러오지 못했어요. 다시 준비해 주세요.')}
      })
      this.load.on('complete', () => { queued.clear(); if (!disposed) this.sync() })
      this.sync()
    }
    tap(pointer:Phaser.Input.Pointer){
      const point=this.pointerPosition(pointer)
      if (!reduced) for (const entry of entries.values()) entry.motion.flee(point.x-itemSpace(entry.motion.item).offset, point.y, clock, Math.min(180, Math.max(100, layoutWidth() * .3)))
      const ring = this.add.circle(point.x, point.y, 10).setStrokeStyle(2, 0xffffff, .9).setDepth(1000)
      const dot = this.add.circle(point.x, point.y, 3, 0xffffff).setDepth(1001)
      this.tweens.add({ targets: ring, scale: reduced ? 1 : 3, alpha: 0, duration: reduced ? 180 : 600, onComplete: () => ring.destroy() })
      this.tweens.add({ targets: dot, alpha: 0, duration: 250, onComplete: () => dot.destroy() })
    }
    sync() {
      if (!ready || disposed) return
      const currentSignature=signature(),revision=++syncRevision
      if(preparedSignature!==currentSignature||[...requiredTextures()].some(key=>!this.textures.exists(key))||items.some(item=>entries.get(item.id)?.path!==itemPath(item)))reportReady(false)
      if(!spiritsQueued&&items.some(item=>hasHalloweenSpirits(item.species.id))){
        spiritsQueued=true;HalloweenSpiritRenderer.queue(this)
      }
      const ids = new Set(items.map(item => item.id))
      const spawns=swimSpawnLayout(items.map(motionItem),worldWidth(),worldHeight())
      for (const [id, entry] of entries) if (!ids.has(id)) { dragging.delete(id);entry.emission?.destroy();entry.spirits?.destroy();entry.sprite.destroy();entries.delete(id) }
      for (const item of items) {
        const base=asset(item), enhanced=mythicSwimAsset(base.path,item.species.rarity)
        const path=enhanced?.path??base.path,sheet=base.sheet,key=textureKey(path)
        const old = entries.get(item.id)
        if (old && old.path !== path) { old.emission?.destroy();old.spirits?.destroy();old.sprite.destroy();entries.delete(item.id) }
        if (!this.textures.exists(key)) {
          if (!queued.has(key) && !failed.has(key)) { queued.add(key); this.load.image(key, world?.assetUrl?.(path)??enhanced?.url??('url' in base?base.url:undefined)??collectibleUrl(path)) }
          continue
        }
        if(sheet)this.registerSheet(key,mythicSheetColumns(path))
        const current = entries.get(item.id)
        if (current) {
          if(current.sprite.input)current.sprite.input.cursor=draggable(item)?'grab':'pointer'
          if(item.placement_locked&&selectedId===item.id)selectedId=null
          if(!dragging.has(item.id))current.sprite.setDepth(inhabitantDepth(item))
          this.setMythicGlow(current.sprite,item.species.rarity)
          if(current.sprite.input?.draggable!==draggable(item))this.input.setDraggable(current.sprite,draggable(item))
          if(movementSettings(current.motion.item.species).type!==movementSettings(item.species).type){
            this.input.setHitArea(current.sprite,{pixelPerfect:movementSettings(item.species).type!=='fixed',alphaTolerance:32,cursor:draggable(item)?'grab':'pointer'})
            if(current.sprite.input?.draggable!==draggable(item))this.input.setDraggable(current.sprite,draggable(item))
          }
          current.motion.setItem(motionItem(item),clock,itemSpace(item).width,worldHeight(),reduced); continue
        }
        const sprite = this.add.sprite(0, 0, key, sheet ? 'swim-0' : undefined)
        this.setMythicGlow(sprite,item.species.rarity)
        sprite.setData('collectibleId',item.id)
        sprite.setDepth(inhabitantDepth(item))
        // Fixed inhabitants must remain easy to grab, including transparent
        // gaps in a small sponge or other stationary species.
        sprite.setInteractive({pixelPerfect:movementSettings(item.species).type!=='fixed',alphaTolerance:32,cursor:draggable(item)?'grab':'pointer'})
        this.input.setDraggable(sprite,draggable(item))
        entries.set(item.id, { motion: new InhabitantMotion(motionItem(item), clock,spawns.get(item.id)), sprite, path, sheet, emission:hasCrimsonEmission(item.species.id)?new CrimsonEmissionRenderer(this):undefined, spirits:hasHalloweenSpirits(item.species.id)?new HalloweenSpiritRenderer(this):undefined })
      }
      // A renderer survives tank switches. Release sheets from previous tanks,
      // including late loads that finished after their tank was left.
      const needed = new Set(items.map(item => {
        const base=asset(item)
        return textureKey(mythicSwimAsset(base.path,item.species.rarity)?.path??base.path)
      }))
      for(const key of this.textures.getTextureKeys()){
        if(key.startsWith('collectible:')&&!needed.has(key)&&!queued.has(key))this.textures.remove(key)
      }
      if (!this.load.isLoading() && (queued.size||this.load.list.size)) this.load.start()
      this.draw(0)
      if([...requiredTextures()].every(key=>this.textures.exists(key))&&items.every(item=>entries.get(item.id)?.path===itemPath(item))){
        if(preparedSignature!==currentSignature||!reportedReady)this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{
          if(!disposed&&revision===syncRevision&&signature()===currentSignature){preparedSignature=currentSignature;reportReady(true)}
        })
      }
    }
    registerSheet(key:string,columns=2){const texture=this.textures.get(key);if(texture.has('swim-0'))return;const source=texture.getSourceImage() as HTMLImageElement;const w=source.width/columns,h=source.height/2;for(let f=0;f<columns*2;f++)texture.add(`swim-${f}`,0,(f%columns)*w,Math.floor(f/columns)*h,w,h)}
    selectItem(id:string){
      const entry=entries.get(id)
      if(!entry||entry.motion.item.interaction_locked||entry.motion.item.placement_locked)return
      selectedId=id
      const space=itemSpace(entry.motion.item),g=decorationGeometry(entry.motion.item,space.width,worldHeight())
      const x=g.w?(entry.sprite.x-space.offset-g.size/2-g.margin)/g.w:.5,y=g.h?(entry.sprite.y-g.size/2-g.margin)/g.h:.5
      if(columns>1&&(entry.sprite.x<cameraOffset()||entry.sprite.x>cameraOffset()+layoutWidth()/zoom)){
        view=targetView=clampView(entry.sprite.x/layoutWidth()-1/(2*zoom));this.configureCamera();world?.onViewChange?.(view)
      }
      onSelectDecoration?.(id,Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y)))
    }
    draw(delta: number) {
      for (const entry of entries.values()) {
        const frozen=reduced||!!entry.motion.item.editing
        if(dragging.has(entry.motion.item.id)){
          entry.emission?.draw(entry.sprite,clock,entry.motion.item.animation_seed,frozen)
          entry.spirits?.draw(entry.motion.item.species.id,clock,entry.motion.item.animation_seed,frozen,entry.sprite,Number(entry.sprite.getData('logicalSize')??entry.sprite.displayWidth))
          continue
        }
        const space=itemSpace(entry.motion.item)
        const pose = entry.motion.update(clock, delta, space.width, worldHeight(), reduced)
        const dx = pose.x - (entry.previousX??pose.x)
        entry.previousX=pose.x
        // Use the movement actually displayed, except screen-edge wrapping.
        const direction = Math.abs(dx) > .001 && Math.abs(dx) < space.width / 2 ? Math.sign(dx) : pose.direction
        let layout=swimFrameLayout('',0),index=0
        if (entry.sheet) {
          index=sharedDecorationFrame(entry.motion.item.species.id,clock,frozen,entry.motion.item.editing)??dreamabyssFixedFrame(entry.motion.item.species.id,clock,frozen,entry.motion.item.editing)??scrapisleFixedFrame(entry.motion.item.species.id,clock,frozen,entry.motion.item.editing)??cloudferryFixedFrame(entry.motion.item.species.id,clock,frozen,entry.motion.item.editing)??whitenightFixedFrame(entry.motion.item.species.id,clock,frozen,entry.motion.item.editing)??primalPlantFrame(entry.motion.item.species.id,clock,frozen,entry.motion.item.editing)??mythicSwimFrame(entry.path,clock,entry.motion.item.animation_seed,frozen)??premiumSwimFrame(entry.path,clock,entry.motion.item.animation_seed,pose.frame,frozen)
          if(entry.motion.item.editing){entry.editingFrame??=Number(String(entry.sprite.frame.name).replace('swim-',''))||0;index=entry.editingFrame}else entry.editingFrame=undefined
          layout=mythicSwimLayout(entry.path,index)??swimFrameLayout(entry.path,index)
          entry.sprite.setTexture(textureKey(entry.path),`swim-${index}`)
        }
        const flipped=shouldFlipSpecies(entry.motion.item.species,direction)!==!!entry.motion.item.flipped
        entry.sprite.setData('logicalSize',pose.size)
        entry.sprite.setOrigin(flipped?1-layout.originX:layout.originX,layout.originY)
          .setPosition(space.offset + pose.x + pose.size / 2, pose.y + pose.size / 2)
          .setDisplaySize(pose.size*layout.scale, pose.size*layout.scale).setAngle(pose.angle+(isPositionFixed(entry.motion.item)||entry.motion.item.editing?0:Number(entry.motion.item.rotation??0)))
        entry.sprite.setFlipX(flipped)
        entry.emission?.draw(entry.sprite,clock,entry.motion.item.animation_seed,frozen)
        entry.spirits?.draw(entry.motion.item.species.id,clock,entry.motion.item.animation_seed,frozen,entry.sprite,pose.size)
      }
      if(selectedId){const entry=entries.get(selectedId);if(entry){const bounds=entry.sprite.getBounds();onSelectionPosition?.(selectedId,(bounds.centerX-cameraOffset())*zoom*viewport.width/layoutWidth(),(bounds.top-cameraY())*zoom*viewport.width/layoutWidth())}}
    }
    update(_time: number, delta: number) {
      if (!visible) {this.game.loop.sleep();return}
      if (!reduced&&!world?.motionPaused?.()) clock += Math.min(delta, 100) / 1000
      if(view!==targetView){
        view=reduced?targetView:view+(targetView-view)*(1-Math.exp(-Math.min(delta,100)/180))
        if(Math.abs(view-targetView)<.0005)view=targetView
        this.configureCamera();world?.onViewChange?.(view)
      }
      if(columns>1&&dragPointer?.pointer.isDown&&world?.canPan?.()!==false){
        const {pointer,sprite,offsetX,offsetY}=dragPointer
        const point=this.pointerPosition(pointer)
        const next=clampView(draggedTankView(view,(point.x-cameraOffset())*zoom,layoutWidth(),delta/1000,columns))
        if(next!==view){
          view=targetView=next;this.configureCamera();world?.onViewChange?.(view)
          const moved=this.pointerPosition(pointer),entry=entries.get(sprite.getData('collectibleId') as string)
          const space=entry?itemSpace(entry.motion.item):{width:worldWidth(),offset:0}
          const radians=sprite.angle*Math.PI/180,half=sprite.displayWidth*(Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians)))/2
          sprite.setPosition(Math.max(space.offset+half,Math.min(space.offset+space.width-half,moved.x+offsetX)),Math.max(half,Math.min(worldHeight()-half,moved.y+offsetY)))
        }
      }
      this.draw(delta / 1000)
      if(world?.onFrame&&(clock-lastWorldFrame>=.1||entries.size!==lastWorldCount||Math.abs(view-lastWorldView)>.001)){
        lastWorldFrame=clock;lastWorldCount=entries.size;lastWorldView=view
        world.onFrame({clock,view,width:worldWidth(),viewportWidth:layoutWidth(),height:worldHeight(),inhabitants:[...entries].map(([id,entry])=>({id,...entry.motion.pose,x:entry.motion.pose.x+itemSpace(entry.motion.item).offset}))})
      }
    }
  }
  const scene = new TankScene()
  const game = new Phaser.Game({ type: Phaser.AUTO, parent, transparent: true, width: viewport.pixelWidth, height: viewport.pixelHeight,scale:{mode:Phaser.Scale.NONE,zoom:1/viewport.ratio},
    scene: [scene], audio: { noAudio: true }, banner: false, render: { antialias: true }, fps: { target: 30, limit: 30 } })
  return {
    selectItem(id) { if(ready)scene.selectItem(id) },
    setItems(next) { items = next; if (ready) scene.sync() },
    cancelGesture(){swipe=null;decorationPress=null;dragPointer=null;for(const id of dragging){const entry=entries.get(id);if(entry)entry.sprite.setDepth(inhabitantDepth(entry.motion.item))}dragging.clear();if(ready)for(const pointer of scene.input.manager.pointers){scene.input.setDragState(pointer,0);pointer.reset()}},
    setZoom(next,nextView,nextY){if(disposed)return;zoom=Math.max(world?.minZoom??1/columns,Math.min(world?.maxZoom??1,next));view=targetView=clampView(nextView??view);verticalView=clampVertical(nextY??verticalView);world?.onVerticalViewChange?.(verticalView);if(ready){scene.configureCamera();scene.draw(0)}world?.onZoomChange?.(zoom);world?.onViewChange?.(view)},
    setView(next) { targetView=clampView(next);if(reduced){view=targetView;if(ready)scene.configureCamera();world?.onViewChange?.(view)} },
    resize(width, height) { if (!disposed) {const next=tankResolution(width,height,window.devicePixelRatio);if(next.width===viewport.width&&next.height===viewport.height&&next.pixelWidth===viewport.pixelWidth&&next.pixelHeight===viewport.pixelHeight)return;viewport=next;game.scale.setZoom(1/viewport.ratio);game.scale.resize(viewport.pixelWidth,viewport.pixelHeight);game.canvas.style.width=`${viewport.width}px`;game.canvas.style.height=`${viewport.height}px`;game.scale.updateBounds();if (ready){scene.configureCamera();if(columns>1)scene.sync();scene.draw(0)} } },
    setReduced(value) { reduced = value; if (ready) scene.draw(0) },
    setVisible(value) { if(visible===value)return;visible = value; if (value) game.loop.wake(); else game.loop.sleep() },
    getStats() { return { count: entries.size, textures: ready?scene.textures.getTextureKeys().filter(key=>key.startsWith('collectible:')).length:0, clock, renderer: game.renderer?.type === Phaser.WEBGL ? 'WebGL' : 'Canvas' } },
    destroy() { disposed = true; ready = false; entries.clear(); game.destroy(true); if (game.isBooted) game.loop.wake() },
  }
}
