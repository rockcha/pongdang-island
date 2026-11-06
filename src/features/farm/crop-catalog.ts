// Local farm production values: one seed yields three crops; processing consumes full harvests.
export const farmCrops = {
  sugarcane: {name:'사탕수수', seedPrice:85, sellPrice:35, yield:3, growSeconds:10, researchPrice:2000, researchSeconds:8, color:'#8aa75c'},
  wheat: {name:'밀', seedPrice:45, sellPrice:20, yield:3, growSeconds:10, researchPrice:0, researchSeconds:0, color:'#dfb052'},
  potato: {name:'감자', seedPrice:65, sellPrice:30, yield:3, growSeconds:10, researchPrice:1200, researchSeconds:3, color:'#cda775'},
  sweetPotato: {name:'고구마', seedPrice:90, sellPrice:40, yield:3, growSeconds:8, researchPrice:2400, researchSeconds:5, color:'#b77186'},
  carrot: {name:'당근', seedPrice:55, sellPrice:25, yield:3, growSeconds:5, researchPrice:1000, researchSeconds:4, color:'#e19c5c'},
  corn: {name:'옥수수', seedPrice:80, sellPrice:35, yield:3, growSeconds:7, researchPrice:1800, researchSeconds:6, color:'#e0bd59'},
  strawberry: {name:'딸기', seedPrice:160, sellPrice:70, yield:3, growSeconds:10, researchPrice:5000, researchSeconds:10, color:'#d78079'},
  paddy: {name:'벼', seedPrice:75, sellPrice:30, yield:3, growSeconds:10, researchPrice:1400, researchSeconds:8, color:'#c4af62'},
  tomato: {name:'토마토', seedPrice:110, sellPrice:45, yield:3, growSeconds:8, researchPrice:3200, researchSeconds:8, color:'#d57d61'},
} as const
export type CropKind = keyof typeof farmCrops
export type SeedGood = `${CropKind}Seed`
export const cropKinds = Object.keys(farmCrops) as CropKind[]
export const seedGood = (crop:CropKind):SeedGood => `${crop}Seed`
export const isCropKind = (value:unknown):value is CropKind => typeof value==='string' && Object.hasOwn(farmCrops,value)
export const cropArt = (crop:CropKind) => `/farm/art/v2/crops/${crop}.png`
