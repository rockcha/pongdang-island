import type {FarmAnimal} from './animal-catalog'

export const butcherRecipes={
 cow:{good:'redMeat',output:3},
 chicken:{good:'chickenMeat',output:2},
 duck:{good:'duckMeat',output:2},
 sheep:{good:'redMeat',output:3},
} as const satisfies Record<FarmAnimal,{good:string;output:number}>
export const meatGoods=['redMeat','chickenMeat','duckMeat'] as const
