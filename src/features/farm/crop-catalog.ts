// Local farm economy: long crops trade plot throughput for fewer visits and larger harvests.
export const farmCrops = {
  sugarcane: {name:'사탕수수', seedPrice:50, sellPrice:5, yield:10, growSeconds:7200, researchPrice:2000, researchSeconds:7200, color:'#8aa75c'},
  wheat: {name:'밀', seedPrice:12, sellPrice:4, yield:3, growSeconds:600, researchPrice:0, researchSeconds:0, color:'#dfb052'},
  potato: {name:'감자', seedPrice:20, sellPrice:4, yield:5, growSeconds:1800, researchPrice:0, researchSeconds:0, color:'#cda775'},
  sweetPotato: {name:'고구마', seedPrice:45, sellPrice:5, yield:9, growSeconds:5400, researchPrice:2400, researchSeconds:5400, color:'#b77186'},
  carrot: {name:'당근', seedPrice:16, sellPrice:4, yield:4, growSeconds:1200, researchPrice:0, researchSeconds:0, color:'#e19c5c'},
  corn: {name:'옥수수', seedPrice:24, sellPrice:4, yield:6, growSeconds:2700, researchPrice:1800, researchSeconds:3600, color:'#e0bd59'},
  strawberry: {name:'딸기', seedPrice:72, sellPrice:6, yield:12, growSeconds:14400, researchPrice:5000, researchSeconds:14400, color:'#d78079'},
  paddy: {name:'벼', seedPrice:32, sellPrice:4, yield:8, growSeconds:3600, researchPrice:1400, researchSeconds:3600, color:'#c4af62'},
  tomato: {name:'토마토', seedPrice:60, sellPrice:5, yield:12, growSeconds:10800, researchPrice:3200, researchSeconds:10800, color:'#d57d61'},
} as const
export type CropKind = keyof typeof farmCrops
export type SeedGood = `${CropKind}Seed`
export const cropKinds = Object.keys(farmCrops) as CropKind[]
export const seedGood = (crop:CropKind):SeedGood => `${crop}Seed`
export const isCropKind = (value:unknown):value is CropKind => typeof value==='string' && Object.hasOwn(farmCrops,value)
export const cropArt = (crop:CropKind) => `/farm/art/v2/crops/${crop}.png`
