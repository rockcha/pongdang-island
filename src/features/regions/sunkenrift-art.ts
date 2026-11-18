export const sunkenriftArt={
 scenery:'/regions/sunkenrift/overview-v2.png',
 map:'/regions/sunkenrift/map-v2.png',
 banner:'/regions/sunkenrift/overview-v2.png',
 // A single painted camera keeps the standing bank and water on one ground plane.
 fishing:{scenery:'/fishing/scenery/sunkenrift-v3.png',portrait:'/fishing/scenery/sunkenrift-portrait-v3.png',portraitMedia:'(orientation: portrait)'},
} as const

export function currentSunkenriftFishingArt(){
 const {scenery,portrait,portraitMedia}=sunkenriftArt.fishing
 return globalThis.matchMedia?.(portraitMedia).matches?portrait:scenery
}
