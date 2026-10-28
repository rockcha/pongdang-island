import {createElement} from 'react'
import '../src/index.css'
import {createRoot} from 'react-dom/client'
import {CollectiblePreview} from '../src/features/collection/collectible-preview'
import {createTankRenderer} from '../src/features/aquarium/phaser-tank'
import {collectibleUrl,type Species,type OwnedCollectible} from '../src/features/collection/api'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout,mythicSheetColumns} from '../src/features/aquarium/mythic-swim'
import {swimFrameLayout} from '../src/features/aquarium/swim-frame-layout'
import {premiumSwimFrame} from '../src/features/aquarium/premium-swim-frame'
const root='/assets/storage-upload/new/20261029-055051/'
const manifest=await fetch(root+'manifest.json').then(r=>r.json())
const grid=document.querySelector('#grid')!,status=document.querySelector('#status')!,errors:string[]=[]
let time=0,last=0,paused=false,reduced=false,step:number|null=null
const loaded:{canvas:HTMLCanvasElement,image:HTMLImageElement,species:Species,path:string,columns:number,label:HTMLElement}[]=[]
const species=manifest.items.map((s:any)=>({...s,thumbnail_path:s.path+'_thumbnail.png',sprite_sheet_path:s.frames>1?s.id==='atlantean-sentinel'?'fish/mythic/atlantean-sentinel-standing_sprite.png':s.path+'_sprite.png':null,speed:s.movement_type==='fixed'?0:s.movement_type==='crawl'?.012:s.movement_type==='pulse'?.018:.025,description:s.design,native_region_id:'starruins',is_native:true})) as Species[]
for(const s of species){
 const article=document.createElement('article');article.className='card';article.dataset.id=s.id
 const title=document.createElement('h2');title.textContent=s.name;article.append(title)
 const art=document.createElement('div');art.className='art';const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;canvas.className='pinned';art.append(canvas);article.append(art)
 const label=document.createElement('p');article.append(label)
 const actual=document.createElement('div');actual.className='actual';createRoot(actual).render(createElement(CollectiblePreview,{species:s}));article.append(actual);grid.append(article)
 const enhanced=s.sprite_sheet_path?mythicSwimAsset(s.sprite_sheet_path,s.rarity):null,path=enhanced?.path??s.sprite_sheet_path??s.thumbnail_path
 const image=new Image();image.onload=()=>loaded.push({canvas,image,species:s,path,columns:s.sprite_sheet_path?mythicSheetColumns(path):1,label});image.onerror=()=>errors.push(s.id);image.src=enhanced?.url??collectibleUrl(path)
}
const items=species.map((s,i)=>({id:s.id,species_id:s.id,tank_id:'preview',animation_seed:i*34567,position_x:s.movement_type==='fixed'?.2+(i%4)*.2:null,position_y:s.movement_type==='fixed'?.88:null,acquired_at:'',species:s})) as OwnedCollectible[]
const tankHost=document.querySelector('#tank')! as HTMLElement
const tank=createTankRenderer(tankHost,items,false,message=>errors.push(message),undefined,undefined,undefined,undefined,undefined,{columns:1,motionPaused:()=>paused,onFrame:frame=>{(window as any).starruinsTank=frame}})
new ResizeObserver(()=>tank.resize(tankHost.clientWidth,tankHost.clientHeight)).observe(tankHost)
document.querySelector('#play')!.addEventListener('click',()=>{paused=!paused;step=null;document.querySelector('#play')!.textContent=paused?'계속 재생':'일시정지'})
document.querySelector('#step')!.addEventListener('click',()=>{paused=true;step=(step===null?0:step+1)%8;document.querySelector('#play')!.textContent='계속 재생'})
document.querySelector('#light')!.addEventListener('click',()=>document.body.classList.toggle('dark'))
document.querySelector('#reduced')!.addEventListener('click',()=>{reduced=!reduced;tank.setReduced(reduced)})
function draw(now:number){
 if(!paused)time+=(now-last)/1000||0;last=now
 for(const {canvas,image,species:s,path,columns,label} of loaded){
  const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,600,600)
  if(!s.sprite_sheet_path){ctx.drawImage(image,0,0,600,600);label.textContent='정적 이미지';continue}
  const f=reduced?0:step!==null?step%(columns*2):mythicSwimFrame(path,time,0)??premiumSwimFrame(path,time,0,Math.floor(time*3)%4)
  const layout=mythicSwimLayout(path,f)??swimFrameLayout(path,f),w=image.width/columns,h=image.height/2,size=480*layout.scale
  ctx.drawImage(image,f%columns*w,Math.floor(f/columns)*h,w,h,300-layout.originX*size,300-layout.originY*size,size,size)
  label.textContent=`${f+1}/${columns*2} · 위치 고정 반복 재생`
 }
 status.textContent=errors.length?'오류: '+errors.join(', '):`${loaded.length}/16종 로드 완료`
 ;(window as any).starruinsPreview={loaded:loaded.length,errors,time,paused,reduced}
 requestAnimationFrame(draw)
}
requestAnimationFrame(draw)
