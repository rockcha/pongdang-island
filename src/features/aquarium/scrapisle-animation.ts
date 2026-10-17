const fixedSpecies=new Set(['scrap-bulb-home-octopus','scrap-tire-moray'])
export function scrapisleFixedFrame(id:string,time:number,reduced=false,editing=false){
 return fixedSpecies.has(id)?reduced||editing?0:Math.floor(Math.max(0,time)*2.4)%4:null
}
