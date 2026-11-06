import type {FarmAnimal} from './animal-catalog'
export const BUTCHER_SECONDS=60

export const butcherRecipes={
 cow:{good:'redMeat',output:10},
 chicken:{good:'chickenMeat',output:6},
 duck:{good:'duckMeat',output:8},
 sheep:{good:'redMeat',output:8},
} as const satisfies Record<FarmAnimal,{good:string;output:number}>
export const meatGoods=['redMeat','chickenMeat','duckMeat'] as const
