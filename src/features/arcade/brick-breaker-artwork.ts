import type {DropKind} from './brick-breaker-model'

export const dropArtwork:Record<DropKind,{src:string;sheet:boolean;preview?:string}>={
 item:{src:'/arcade/brick-breaker/item.png',sheet:false},
 wide:{src:'/arcade/brick-breaker/wide.png',sheet:false},
 shield:{src:'/arcade/brick-breaker/shield.png',sheet:false},
 split:{src:'/arcade/brick-breaker/split.png',sheet:false},
 shark:{src:'/arcade/brick-breaker/shark-sprite.png',sheet:true},
 urchin:{src:'/arcade/brick-breaker/urchin.svg',sheet:false},
 ink:{src:'/arcade/brick-breaker/ink.svg',sheet:false},
 seaweed:{src:'/arcade/brick-breaker/seaweed.svg',sheet:false},
 puffer:{src:'/arcade/brick-breaker/puffer-sprite.png',sheet:true,preview:'/arcade/brick-breaker/puffer.png'},
 heart:{src:'/arcade/brick-breaker/heart.svg',sheet:false},
 sticky:{src:'/arcade/brick-breaker/sticky.svg',sheet:false},
 shrink:{src:'/arcade/brick-breaker/shrink.svg',sheet:false},
 magnet:{src:'/arcade/brick-breaker/magnet.svg',sheet:false},
 wave:{src:'/arcade/brick-breaker/wave.svg',sheet:false},
}

// Phaser 4 uses a physical drawing buffer and an inverse scale zoom. Keep
// simulation coordinates independent of DPR; cap GPU work on mobile devices.
export function brickViewport(width:number,height:number,dpr:number){
 const w=Math.max(1,Math.round(width)||1),h=Math.max(1,Math.round(height)||1)
 const ratio=Math.max(1,Math.min(Number.isFinite(dpr)?dpr:1,2,Math.sqrt(4000000/(w*h))))
 return {width:w,height:h,pixelWidth:Math.round(w*ratio),pixelHeight:Math.round(h*ratio),ratio}
}
