import type {CropKind} from './crop-catalog'

const goodArt=(id:string)=>`/farm/art/v1/goods/${id}.png`
export const farmProducts={
 flour:{name:'밀가루',price:12,image:goodArt('flour')},
 egg:{name:'달걀',price:16,image:goodArt('egg')},
 milk:{name:'우유',price:24,image:goodArt('milk')},
 butter:{name:'버터',price:30,image:goodArt('butter')},
 strawberryMilk:{name:'딸기우유',price:72,image:goodArt('strawberryMilk')},
 eggCookies:{name:'달걀과자',price:36,image:goodArt('eggCookies')},
 pancakes:{name:'팬케이크',price:68,image:goodArt('pancakes')},
 cake:{name:'케이크',price:150,image:goodArt('cake')},
} as const
export type ProductGood=keyof typeof farmProducts
export type RecipeIngredient=CropKind|ProductGood
export type ProcessingBuilding='dairy'|'bakery'

// Trial recipes: ingredients are reserved once at start, collected once after completion.
export const farmRecipes={
 butter:{building:'dairy',seconds:4,ingredients:[{good:'milk',quantity:1}]},
 strawberryMilk:{building:'dairy',seconds:5,ingredients:[{good:'milk',quantity:1},{good:'strawberry',quantity:1}]},
 eggCookies:{building:'bakery',seconds:5,ingredients:[{good:'flour',quantity:1},{good:'egg',quantity:1}]},
 pancakes:{building:'bakery',seconds:7,ingredients:[{good:'flour',quantity:1},{good:'egg',quantity:1},{good:'milk',quantity:1}]},
 cake:{building:'bakery',seconds:10,ingredients:[{good:'flour',quantity:2},{good:'egg',quantity:2},{good:'butter',quantity:1},{good:'strawberry',quantity:1}]},
} as const satisfies Record<string,{building:ProcessingBuilding;seconds:number;ingredients:readonly {good:RecipeIngredient;quantity:number}[]}>
export type RecipeId=keyof typeof farmRecipes
export const recipeIds=Object.keys(farmRecipes) as RecipeId[]
export const processedGoods=['flour',...recipeIds] as const
export const isRecipeId=(id:unknown):id is RecipeId=>typeof id==='string'&&Object.hasOwn(farmRecipes,id)
export function recipeBatchLimit(inventory:Record<RecipeIngredient,number>,id:RecipeId){
 return Math.min(99,...farmRecipes[id].ingredients.map(item=>Math.floor(inventory[item.good]/item.quantity)))
}
