const rates:Record<string,number>={
 'surface-seeking-beanstalk':1.25,
 'upward-sinking-waterfall':3,
 'parasol-sponge-tree':1.5,
 'waterwheel-cascade-tower':4,
 'levitating-stone-spire':1,
}
export const platformWorkSpritePath='decorations/mythic/pongi-subsea-drilling-platform_work8_v1_sprite.png'
export const platformCompatSpritePath='decorations/mythic/pongi-subsea-drilling-platform_compat_v1_sprite.png'
export const deusZeroIdleSpritePath='decorations/mythic/mechsanctum-deus-zero_idle8_v1_sprite.png'
export const deusZeroCompatSpritePath='decorations/mythic/mechsanctum-deus-zero_compat_v1_sprite.png'
export function sharedDecorationAsset(path:string){
 if(path===deusZeroCompatSpritePath||path===deusZeroIdleSpritePath)return {path:deusZeroIdleSpritePath,url:'/aquarium/swim/mechsanctum-deus-zero_idle8_v1_sprite.png'}
 return path===platformCompatSpritePath||path===platformWorkSpritePath?{path:platformWorkSpritePath,url:'/aquarium/swim/pongi-subsea-drilling-platform_work8_v1_sprite.png'}:null
}
export function sharedDecorationColumns(path:string){return path===platformWorkSpritePath||path===deusZeroIdleSpritePath?4:null}


// Animate local details while registered solid anchors and editing stay still.
export function sharedDecorationFrame(id:string,time:number,reduced=false,editing=false){
 if(id==='mechsanctum-deus-zero')return reduced||editing?0:Math.floor(Math.max(0,time))%8
 if(id==='pongi-subsea-drilling-platform')return reduced||editing?0:Math.floor(Math.max(0,time)*3)%8
 const rate=rates[id]
 return rate===undefined?null:reduced||editing?0:Math.floor(Math.max(0,time)*rate)%4
}
