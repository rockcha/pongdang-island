import Phaser from 'phaser'
import { collectibleUrl } from '@/features/collection/api'
import type { OwnedCollectible } from '@/features/collection/api'
import { InhabitantMotion } from './inhabitant-motion'
import {canArrangeSpecies,movementSettings,shouldFlipSpecies} from './movement-settings'
import {premiumSwimFrame} from './premium-swim-frame'
import {decorationGeometry} from './decoration-geometry'
import {swimFrameLayout} from './swim-frame-layout'

export type TankRenderer = { setItems: (items: OwnedCollectible[]) => void; resize: (width: number, height: number) => void; setReduced: (value: boolean) => void; setVisible: (value: boolean) => void; getStats: () => { count: number; textures: number; clock: number; renderer: string }; destroy: () => void }

export function createTankRenderer(parent: HTMLElement, initial: OwnedCollectible[], reduced: boolean, onError: (message: string) => void, onPlace?: (id:string,x:number,y:number)=>void,_onNavigate?:(direction:'previous'|'next')=>void,onSelectDecoration?:(id:string,x?:number,y?:number)=>void,onBackgroundTap?:()=>void): TankRenderer {
  let items = initial, ready = false, disposed = false, clock = 0, visible = true
  const entries = new Map<string, { motion: InhabitantMotion; sprite: Phaser.GameObjects.Sprite; path: string; sheet: boolean; previousX?:number }>()
  const queued = new Set<string>(), failed = new Set<string>()
  const dragging=new Set<string>()
  let swipe:{id:number;x:number;y:number;time:number}|null=null
  let decorationPress:{id:string;pointerId:number;x:number;y:number;dragged:boolean}|null=null
  const textureKey = (path: string) => `collectible:${path}`
  const draggable=(item:OwnedCollectible)=>item.species.kind!=='map'&&!item.interaction_locked
  const asset = (item: OwnedCollectible) => {
    const sheet = item.species.kind !== 'map' && !!item.species.sprite_sheet_path
    return { path: sheet ? item.species.sprite_sheet_path! : item.species.thumbnail_path, sheet }
  }
  class TankScene extends Phaser.Scene {
    constructor() { super('aquarium') }
    create() {
      if (disposed) return
      ready = true
      this.input.setDefaultCursor('pointer')
      this.input.dragDistanceThreshold=6
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, targets: Phaser.GameObjects.GameObject[]) => {
        swipe=null
        decorationPress=null
        const target=targets[0] as Phaser.GameObjects.Sprite|undefined
        const id=target?.getData('collectibleId') as string|undefined
        if(id&&entries.has(id)&&canArrangeSpecies(entries.get(id)!.motion.item.species)){
          decorationPress={id,pointerId:pointer.id,x:pointer.x,y:pointer.y,dragged:false}
          return
        }
        if(targets.length)return
        swipe={id:pointer.id,x:pointer.x,y:pointer.y,time:performance.now()}
      })
      this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
        const press=decorationPress;decorationPress=null
        if(press&&press.pointerId===pointer.id&&!press.dragged&&Math.hypot(pointer.x-press.x,pointer.y-press.y)<6){const entry=entries.get(press.id)
          if(entry){const g=decorationGeometry(entry.motion.item,this.scale.width,this.scale.height);onSelectDecoration?.(press.id,g.w?(entry.sprite.x-g.size/2-g.margin)/g.w:.5,g.h?(entry.sprite.y-g.size/2-g.margin)/g.h:.5)}
          return}
        if(!swipe||swipe.id!==pointer.id)return
        const start=swipe;swipe=null
        const dx=pointer.x-start.x,dy=pointer.y-start.y
        if(Math.hypot(dx,dy)<15){onBackgroundTap?.();this.tap(pointer)}
      })
      this.input.on('gameout',()=>{swipe=null;decorationPress=null})
      this.input.on('dragstart',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite)=>{
        swipe=null
        const id=sprite.getData('collectibleId') as string
        if(decorationPress?.id===id)decorationPress.dragged=true
        dragging.add(id);sprite.setDepth(900)
        this.input.setDefaultCursor('grabbing')
      })
      this.input.on('drag',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite,x:number,y:number)=>{
        const radians=sprite.angle*Math.PI/180
        const half=sprite.displayWidth*(Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians)))/2
        sprite.setPosition(Math.max(half,Math.min(this.scale.width-half,x)),Math.max(half,Math.min(this.scale.height-half,y)))
      })
      this.input.on('dragend',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite)=>{
        const id=sprite.getData('collectibleId') as string,entry=entries.get(id)
        dragging.delete(id);sprite.setDepth(0);this.input.setDefaultCursor('pointer')
        if(!entry)return
        const size=Number(sprite.getData('logicalSize')??sprite.displayWidth)
        const position=entry.motion.place(sprite.x-size/2,sprite.y-size/2,clock,this.scale.width,this.scale.height,reduced)
        if(canArrangeSpecies(entry.motion.item.species)){
          onPlace?.(id,position.x,position.y)
          onSelectDecoration?.(id,position.x,position.y)
        }
      })
      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        queued.delete(file.key); failed.add(file.key)
        onError('일부 개체 이미지를 불러오지 못했어요. Storage 업로드 경로를 확인해주세요.')
      })
      this.load.on('complete', () => { queued.clear(); if (!disposed) this.sync() })
      this.sync()
    }
    tap(pointer:Phaser.Input.Pointer){
      if (!reduced) for (const entry of entries.values()) entry.motion.flee(pointer.x, pointer.y, clock, Math.min(180, Math.max(100, this.scale.width * .3)))
      const ring = this.add.circle(pointer.x, pointer.y, 10).setStrokeStyle(2, 0xffffff, .9).setDepth(1000)
      const dot = this.add.circle(pointer.x, pointer.y, 3, 0xffffff).setDepth(1001)
      this.tweens.add({ targets: ring, scale: reduced ? 1 : 3, alpha: 0, duration: reduced ? 180 : 600, onComplete: () => ring.destroy() })
      this.tweens.add({ targets: dot, alpha: 0, duration: 250, onComplete: () => dot.destroy() })
    }
    sync() {
      if (!ready || disposed) return
      const ids = new Set(items.map(item => item.id))
      for (const [id, entry] of entries) if (!ids.has(id)) { dragging.delete(id);entry.sprite.destroy(); entries.delete(id) }
      for (const item of items) {
        const { path, sheet } = asset(item), key = textureKey(path)
        const old = entries.get(item.id)
        if (old && old.path !== path) { old.sprite.destroy(); entries.delete(item.id) }
        if (!this.textures.exists(key)) {
          if (!queued.has(key) && !failed.has(key)) { queued.add(key); this.load.image(key, collectibleUrl(path)) }
          continue
        }
        const texture = this.textures.get(key)
        if (sheet && !texture.has('swim-0')) {
          const source = texture.getSourceImage() as HTMLImageElement
          const width = source.width / 2, height = source.height / 2
          for (let frame = 0; frame < 4; frame++) texture.add(`swim-${frame}`, 0, (frame % 2) * width, Math.floor(frame / 2) * height, width, height)
        }
        const current = entries.get(item.id)
        if (current) {
          if(current.sprite.input?.draggable!==draggable(item))this.input.setDraggable(current.sprite,draggable(item))
          if(movementSettings(current.motion.item.species).type!==movementSettings(item.species).type){
            this.input.setHitArea(current.sprite,{pixelPerfect:movementSettings(item.species).type!=='fixed',alphaTolerance:32,cursor:'grab'})
            if(current.sprite.input?.draggable!==draggable(item))this.input.setDraggable(current.sprite,draggable(item))
          }
          current.motion.setItem(item,clock,this.scale.width,this.scale.height,reduced); continue
        }
        const sprite = this.add.sprite(0, 0, key, sheet ? 'swim-0' : undefined)
        sprite.setData('collectibleId',item.id)
        // Fixed inhabitants must remain easy to grab, including transparent
        // gaps in a small sponge or other stationary species.
        sprite.setInteractive({pixelPerfect:movementSettings(item.species).type!=='fixed',alphaTolerance:32,cursor:'grab'})
        this.input.setDraggable(sprite,draggable(item))
        entries.set(item.id, { motion: new InhabitantMotion(item, clock), sprite, path, sheet })
      }
      if (!this.load.isLoading() && queued.size) this.load.start()
      this.draw(0)
    }
    draw(delta: number) {
      for (const entry of entries.values()) {
        if(dragging.has(entry.motion.item.id))continue
        const pose = entry.motion.update(clock, delta, this.scale.width, this.scale.height, reduced)
        const dx = pose.x - (entry.previousX??pose.x)
        entry.previousX=pose.x
        // Use the movement actually displayed, except screen-edge wrapping.
        const direction = Math.abs(dx) > .001 && Math.abs(dx) < this.scale.width / 2 ? Math.sign(dx) : pose.direction
        let layout=swimFrameLayout('',0)
        if (entry.sheet) {
          const index=premiumSwimFrame(entry.path,clock,entry.motion.item.animation_seed,pose.frame,reduced)
          layout=swimFrameLayout(entry.path,index)
          const frame = `swim-${index}`; if (entry.sprite.frame.name !== frame) entry.sprite.setFrame(frame)
        }
        const flipped=shouldFlipSpecies(entry.motion.item.species,direction)!==!!entry.motion.item.flipped
        entry.sprite.setData('logicalSize',pose.size)
        entry.sprite.setOrigin(flipped?1-layout.originX:layout.originX,layout.originY)
          .setPosition(pose.x + pose.size / 2, pose.y + pose.size / 2)
          .setDisplaySize(pose.size*layout.scale, pose.size*layout.scale).setAngle(pose.angle+(canArrangeSpecies(entry.motion.item.species)?0:Number(entry.motion.item.rotation??0)))
        entry.sprite.setFlipX(flipped)
      }
    }
    update(_time: number, delta: number) {
      if (!visible) return
      if (!reduced) clock += Math.min(delta, 100) / 1000
      this.draw(delta / 1000)
    }
  }
  const scene = new TankScene()
  const game = new Phaser.Game({ type: Phaser.AUTO, parent, transparent: true, width: Math.max(1, parent.clientWidth), height: Math.max(1, parent.clientHeight),
    scene: [scene], audio: { noAudio: true }, banner: false, render: { antialias: true }, fps: { target: 60 } })
  return {
    setItems(next) { items = next; if (ready) scene.sync() },
    resize(width, height) { if (!disposed) { game.scale.resize(Math.max(1, width), Math.max(1, height)); if (ready) scene.draw(0) } },
    setReduced(value) { reduced = value; if (ready) scene.draw(0) },
    setVisible(value) { visible = value; if (value) game.loop.wake(); else game.loop.sleep() },
    getStats() { return { count: entries.size, textures: new Set([...entries.values()].map(entry=>entry.path)).size, clock, renderer: game.renderer?.type === Phaser.WEBGL ? 'WebGL' : 'Canvas' } },
    destroy() { disposed = true; ready = false; entries.clear(); game.destroy(true); if (game.isBooted) game.loop.wake() },
  }
}
