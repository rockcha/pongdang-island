import Phaser from 'phaser'
import { collectibleUrl } from '@/features/collection/api'
import type { OwnedCollectible } from '@/features/collection/api'
import { InhabitantMotion } from './inhabitant-motion'
import { tankSwipeDirection } from './tank-swipe'

export type TankRenderer = { setItems: (items: OwnedCollectible[]) => void; resize: (width: number, height: number) => void; setReduced: (value: boolean) => void; setVisible: (value: boolean) => void; getStats: () => { count: number; textures: number; clock: number; renderer: string }; destroy: () => void }

export function createTankRenderer(parent: HTMLElement, initial: OwnedCollectible[], reduced: boolean, onError: (message: string) => void, onPlace?: (id:string,x:number,y:number)=>void,onNavigate?:(direction:'previous'|'next')=>void): TankRenderer {
  let items = initial, ready = false, disposed = false, clock = 0, visible = true
  const entries = new Map<string, { motion: InhabitantMotion; sprite: Phaser.GameObjects.Sprite; path: string; sheet: boolean }>()
  const queued = new Set<string>(), failed = new Set<string>()
  const dragging=new Set<string>()
  let swipe:{id:number;x:number;y:number;time:number}|null=null
  const textureKey = (path: string) => `collectible:${path}`
  const asset = (item: OwnedCollectible) => {
    const sheet = item.species.kind === 'fish' && !!item.species.sprite_sheet_path
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
        if(targets.length)return
        if(pointer.wasTouch){swipe={id:pointer.id,x:pointer.x,y:pointer.y,time:performance.now()};return}
        this.tap(pointer)
      })
      this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
        if(!swipe||swipe.id!==pointer.id)return
        const start=swipe;swipe=null
        const dx=pointer.x-start.x,dy=pointer.y-start.y
        const direction=tankSwipeDirection(dx,dy,performance.now()-start.time)
        if(direction&&onNavigate){onNavigate(direction);return}
        if(Math.hypot(dx,dy)<15)this.tap(pointer)
      })
      this.input.on('gameout',()=>{swipe=null})
      this.input.on('dragstart',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite)=>{
        swipe=null
        const id=sprite.getData('collectibleId') as string
        dragging.add(id);sprite.setDepth(900)
        this.input.setDefaultCursor('grabbing')
      })
      this.input.on('drag',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite,x:number,y:number)=>{
        const half=sprite.displayWidth/2
        sprite.setPosition(Math.max(half,Math.min(this.scale.width-half,x)),Math.max(half,Math.min(this.scale.height-half,y)))
      })
      this.input.on('dragend',(_pointer:Phaser.Input.Pointer,sprite:Phaser.GameObjects.Sprite)=>{
        const id=sprite.getData('collectibleId') as string,entry=entries.get(id)
        dragging.delete(id);sprite.setDepth(0);this.input.setDefaultCursor('pointer')
        if(!entry)return
        const position=entry.motion.place(sprite.x-sprite.displayWidth/2,sprite.y-sprite.displayHeight/2,clock,this.scale.width,this.scale.height,reduced)
        onPlace?.(id,position.x,position.y)
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
        if (current) { current.motion.setItem(item,clock,this.scale.width,this.scale.height,reduced); continue }
        const sprite = this.add.sprite(0, 0, key, sheet ? 'swim-0' : undefined)
        sprite.setData('collectibleId',item.id)
        sprite.setInteractive({pixelPerfect:true,alphaTolerance:32,cursor:'grab'})
        this.input.setDraggable(sprite)
        entries.set(item.id, { motion: new InhabitantMotion(item, clock), sprite, path, sheet })
      }
      if (!this.load.isLoading() && queued.size) this.load.start()
      this.draw(0)
    }
    draw(delta: number) {
      for (const entry of entries.values()) {
        if(dragging.has(entry.motion.item.id))continue
        const pose = entry.motion.update(clock, delta, this.scale.width, this.scale.height, reduced)
        entry.sprite.setPosition(pose.x + pose.size / 2, pose.y + pose.size / 2).setDisplaySize(pose.size, pose.size).setAngle(pose.angle)
        entry.sprite.setFlipX(entry.motion.item.species.kind === 'fish' && pose.direction < 0)
        if (entry.sheet) { const frame = `swim-${pose.frame}`; if (entry.sprite.frame.name !== frame) entry.sprite.setFrame(frame) }
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
