import type {CropKind} from './crop-catalog'
import type {FarmAnimal} from './animal-catalog'

const goodArt=(id:string)=>`/farm/art/v2/goods/${id}.png`
export const farmProducts={
 sugar:{name:'설탕',price:12,image:goodArt('sugar')},
 flour:{name:'밀가루',price:18,image:goodArt('flour')},
 cornFlour:{name:'옥수수가루',price:32,image:'/farm/art/v1/goods/cornFlour-v2.png'},
 egg:{name:'달걀',price:16,image:goodArt('egg')},
 milk:{name:'우유',price:24,image:goodArt('milk')},
 butter:{name:'버터',price:54,image:goodArt('butter')},
 strawberryMilk:{name:'딸기우유',price:90,image:goodArt('strawberryMilk')},
 eggCookies:{name:'달걀과자',price:36,image:goodArt('eggCookies')},
 pancakes:{name:'팬케이크',price:68,image:goodArt('pancakes')},
 cake:{name:'케이크',price:180,image:goodArt('cake')},
 cornBread:{name:'콘브레드',price:78,image:'/farm/art/v1/goods/cornBread-v2.png'},
 potatoBread:{name:'감자빵',price:98,image:'/farm/art/v1/goods/potatoBread-v2.png'},
 sweetPotatoPie:{name:'고구마파이',price:130,image:'/farm/art/v1/goods/sweetPotatoPie-v2.png'},
 butterCookies:{name:'쿠키',price:94,image:'/farm/art/v1/goods/butterCookies-v2.png'},
 cheese:{name:'치즈',price:60,image:'/farm/art/v1/goods/cheese-v2.png'},
 cream:{name:'생크림',price:54,image:'/farm/art/v1/goods/cream-v2.png'},
 yogurt:{name:'요구르트',price:58,image:'/farm/art/v1/goods/yogurt-v2.png'},
 duckEgg:{name:'오리알',price:24,image:'/farm/art/v2/goods/duckEgg.png'},
 goatMilk:{name:'염소젖',price:32,image:'/farm/art/v2/goods/goatMilk.png'},
 duckEggTart:{name:'에그타르트',price:128,image:'/farm/art/v2/goods/duckEggTart.png'},
 goatCheese:{name:'염소치즈',price:82,image:'/farm/art/v2/goods/goatCheese.png'},
 carrotCake:{name:'당근케이크',price:140,image:goodArt('carrotCake')},
 rice:{name:'쌀',price:24,image:goodArt('rice')},
 ricePudding:{name:'쌀푸딩',price:130,image:goodArt('ricePudding')},
 grilledRiceBall:{name:'구운주먹밥',price:200,image:goodArt('grilledRiceBall')},
 tomatoKetchup:{name:'토마토케첩',price:58,image:goodArt('tomatoKetchup')},
} as const
export type ProductGood=keyof typeof farmProducts
export type RecipeIngredient=CropKind|ProductGood
export type ProcessingBuilding='dairy'|'bakery'|'kitchen'
export const millRecipes={flour:{crop:'wheat',seconds:10,input:2,output:1},cornFlour:{crop:'corn',seconds:10,input:2,output:1},sugar:{crop:'sugarcane',seconds:8,input:2,output:2},rice:{crop:'paddy',seconds:10,input:2,output:1}} as const
export type MillProduct=keyof typeof millRecipes
export const millProducts=Object.keys(millRecipes) as MillProduct[]

// Trial recipes: ingredients are reserved once at start, collected once after completion.
export const farmRecipes={
 butter:{building:'dairy',seconds:4,ingredients:[{good:'milk',quantity:2}]},
 strawberryMilk:{building:'dairy',seconds:5,food:true,ingredients:[{good:'milk',quantity:2},{good:'strawberry',quantity:1}]},
 eggCookies:{building:'bakery',seconds:5,food:true,ingredients:[{good:'flour',quantity:1},{good:'egg',quantity:1}]},
 pancakes:{building:'bakery',seconds:7,food:true,ingredients:[{good:'flour',quantity:1},{good:'egg',quantity:1},{good:'milk',quantity:1}]},
 cake:{building:'bakery',seconds:10,food:true,ingredients:[{good:'flour',quantity:2},{good:'egg',quantity:1},{good:'cream',quantity:1},{good:'strawberry',quantity:1},{good:'sugar',quantity:1}]},
 cornBread:{building:'bakery',seconds:7,food:true,ingredients:[{good:'cornFlour',quantity:1},{good:'flour',quantity:1},{good:'milk',quantity:1}]},
 potatoBread:{building:'bakery',seconds:7,food:true,ingredients:[{good:'flour',quantity:1},{good:'potato',quantity:1},{good:'butter',quantity:1}]},
 sweetPotatoPie:{building:'bakery',seconds:10,food:true,ingredients:[{good:'flour',quantity:2},{good:'sweetPotato',quantity:1},{good:'butter',quantity:1}]},
 butterCookies:{building:'bakery',seconds:8,food:true,ingredients:[{good:'flour',quantity:1},{good:'butter',quantity:1},{good:'sugar',quantity:1}]},
 cheese:{building:'dairy',seconds:8,ingredients:[{good:'milk',quantity:2}]},
 cream:{building:'dairy',seconds:4,ingredients:[{good:'milk',quantity:2}]},
 yogurt:{building:'dairy',seconds:6,food:true,ingredients:[{good:'milk',quantity:2}]},
 duckEggTart:{building:'bakery',seconds:8,food:true,animal:'duck',ingredients:[{good:'duckEgg',quantity:1},{good:'flour',quantity:1},{good:'cream',quantity:1},{good:'sugar',quantity:1}]},
 goatCheese:{building:'dairy',seconds:8,animal:'goat',ingredients:[{good:'goatMilk',quantity:2}]},
 carrotCake:{building:'bakery',seconds:10,food:true,ingredients:[{good:'carrot',quantity:2},{good:'flour',quantity:1},{good:'egg',quantity:1},{good:'sugar',quantity:1},{good:'cream',quantity:1}]},
 tomatoKetchup:{building:'kitchen',seconds:8,food:true,ingredients:[{good:'tomato',quantity:2},{good:'sugar',quantity:1}]},
 ricePudding:{building:'kitchen',seconds:8,food:true,ingredients:[{good:'rice',quantity:2},{good:'milk',quantity:2},{good:'sugar',quantity:1}]},
 grilledRiceBall:{building:'kitchen',seconds:8,food:true,ingredients:[{good:'rice',quantity:2},{good:'egg',quantity:1},{good:'cheese',quantity:1},{good:'tomatoKetchup',quantity:1}]},
} as const satisfies Record<string,{building:ProcessingBuilding;seconds:number;food?:boolean;output?:number;animal?:FarmAnimal;ingredients:readonly {good:RecipeIngredient;quantity:number}[]}>
export type RecipeId=keyof typeof farmRecipes
export const recipeIds=Object.keys(farmRecipes) as RecipeId[]
export type FinishedFood={[K in RecipeId]:typeof farmRecipes[K] extends {food:true}?K:never}[RecipeId]
export const finishedFoods=recipeIds.filter(id=>'food' in farmRecipes[id]&&farmRecipes[id].food) as FinishedFood[]
export const isFinishedFood=(id:unknown):id is FinishedFood=>finishedFoods.some(food=>food===id)
export const processedGoods=[...millProducts,...recipeIds] as const
export const isRecipeId=(id:unknown):id is RecipeId=>typeof id==='string'&&Object.hasOwn(farmRecipes,id)
export function recipeUnlocked(id:RecipeId,animals:readonly FarmAnimal[]=['cow','chicken']){const recipe=farmRecipes[id];return !('animal' in recipe)||animals.includes(recipe.animal)}
export function recipeOutput(id:RecipeId){const recipe:{seconds:number;output?:number}=farmRecipes[id];return recipe.output??1}
export function recipeBatchLimit(inventory:Record<RecipeIngredient,number>,id:RecipeId){
 return Math.min(Math.floor(2/recipeOutput(id)),...farmRecipes[id].ingredients.map(item=>Math.floor(inventory[item.good]/item.quantity)))
}
