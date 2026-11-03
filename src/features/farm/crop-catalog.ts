// Short, inexpensive tuning for the local farm trial. Production economics live separately.
export const farmCrops = {
  wheat: {name:'밀', seedPrice:5, sellPrice:7, yield:1, growSeconds:10, researchPrice:0, researchSeconds:0, color:'#dfb052'},
  potato: {name:'감자', seedPrice:8, sellPrice:10, yield:1, growSeconds:10, researchPrice:30, researchSeconds:3, color:'#cda775'},
  sweetPotato: {name:'고구마', seedPrice:12, sellPrice:20, yield:1, growSeconds:8, researchPrice:50, researchSeconds:5, color:'#b77186'},
  carrot: {name:'당근', seedPrice:6, sellPrice:8, yield:1, growSeconds:5, researchPrice:40, researchSeconds:4, color:'#e19c5c'},
  corn: {name:'옥수수', seedPrice:10, sellPrice:14, yield:1, growSeconds:7, researchPrice:60, researchSeconds:6, color:'#e0bd59'},
  strawberry: {name:'딸기', seedPrice:20, sellPrice:32, yield:1, growSeconds:10, researchPrice:100, researchSeconds:10, color:'#d78079'},
  tomato: {name:'토마토', seedPrice:14, sellPrice:18, yield:1, growSeconds:8, researchPrice:80, researchSeconds:8, color:'#d57d61'},
} as const
export type CropKind = keyof typeof farmCrops
export type SeedGood = `${CropKind}Seed`
export const cropKinds = Object.keys(farmCrops) as CropKind[]
export const seedGood = (crop:CropKind):SeedGood => `${crop}Seed`
export const isCropKind = (value:unknown):value is CropKind => typeof value==='string' && Object.hasOwn(farmCrops,value)
export const cropArt = (crop:CropKind) => `/farm/art/v1/crops/${crop}.png`
