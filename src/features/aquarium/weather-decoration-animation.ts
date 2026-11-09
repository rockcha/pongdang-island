const rates:Record<string,number>={
 'weather-deco-rain-window':2,
 'weather-deco-snow-frame':1,
 'weather-deco-sand-scales':1,
 'weather-deco-night-winder':1,
 'weather-deco-spring-perfume':1.5,
}
const artPaths=new Set(Object.keys(rates).flatMap(id=>[
 `decorations/epic/${id}_v1_sprite.png`,
 `decorations/epic/${id}_v1_thumbnail.png`,
]))
// Bundle reviewed sheets with the app so catalog and aquarium use the same
// aligned artwork even before a browser has cached the Storage copy.
export function weatherDecorationArtUrl(path:string){
 return artPaths.has(path)?`/aquarium/swim/${path.split('/').at(-1)}`:null
}
export function weatherDecorationFrame(id:string,time:number,reduced=false,editing=false){
 const rate=rates[id]
 if(rate===undefined)return null
 if(reduced||editing)return 0
 const tick=Math.floor(Math.max(0,time)*rate)
 return id==='weather-deco-spring-perfume'?[0,1,2,3,2,1][tick%6]:tick%4
}
