import {farmWorkshops,type ProcessingBuilding} from './workshop-catalog'
export type {ProcessingBuilding} from './workshop-catalog'
import type {CropKind} from './crop-catalog'
import type {FarmAnimal} from './animal-catalog'
import {meatGoods} from './butcher-catalog'

const goodArt=(id:string)=>`/farm/art/v2/goods/${id}.png`
const newFoodArt=(id:string)=>`/farm/art/v21/goods/${id}.png`
export const farmProducts={
 butterSteak:{name:'버터스테이크',price:5400,image:'/farm/art/v25/goods/butterSteak.png'},
 chickenSoup:{name:'닭고기수프',price:2800,image:'/farm/art/v25/goods/chickenSoup.png'},
 duckPotatoStirFry:{name:'오리감자볶음',price:4300,image:'/farm/art/v25/goods/duckPotatoStirFry.png'},
 meatStew:{name:'고기스튜',price:9800,image:'/farm/art/v25/goods/meatStew.png'},
 chickenGratin:{name:'치킨그라탱',price:7000,image:'/farm/art/v25/goods/chickenGratin.png'},
 duckFriedRice:{name:'오리볶음밥',price:6900,image:'/farm/art/v25/goods/duckFriedRice.png'},
 redMeat:{name:'붉은 고기',price:1200,image:'/farm/art/v22/goods/redMeat.png'},
 chickenMeat:{name:'닭고기',price:700,image:'/farm/art/v22/goods/chickenMeat.png'},
 duckMeat:{name:'오리고기',price:1100,image:'/farm/art/v22/goods/duckMeat.png'},
 butterPotato:{name:'버터감자',price:1000,image:newFoodArt('butterPotato')},
 roastedSweetPotato:{name:'군고구마',price:230,image:newFoodArt('roastedSweetPotato')},
 cornCheese:{name:'콘치즈',price:2500,image:newFoodArt('cornCheese')},
 potatoGratin:{name:'감자 그라탱',price:2500,image:newFoodArt('potatoGratin')},
 cornCookies:{name:'옥수수쿠키',price:2600,image:newFoodArt('cornCookies')},
 sugar:{name:'설탕',price:180,image:goodArt('sugar')},
 flour:{name:'밀가루',price:110,image:goodArt('flour')},
 cornFlour:{name:'옥수수가루',price:180,image:'/farm/art/v1/goods/cornFlour-v2.png'},
 egg:{name:'달걀',price:55,image:goodArt('egg')},
 milk:{name:'우유',price:90,image:goodArt('milk')},
 butter:{name:'버터',price:420,image:goodArt('butter')},
 strawberryMilk:{name:'딸기우유',price:2600,image:goodArt('strawberryMilk')},
 eggCookies:{name:'달걀과자',price:650,image:goodArt('eggCookies')},
 pancakes:{name:'팬케이크',price:1050,image:goodArt('pancakes')},
 cake:{name:'딸기 케이크',price:4300,image:goodArt('cake')},
 cornBread:{name:'콘브레드',price:1600,image:'/farm/art/v1/goods/cornBread-v2.png'},
 potatoBread:{name:'감자빵',price:1600,image:'/farm/art/v1/goods/potatoBread-v2.png'},
 sweetPotatoPie:{name:'고구마파이',price:2900,image:'/farm/art/v1/goods/sweetPotatoPie-v2.png'},
 butterCookies:{name:'쿠키',price:2300,image:'/farm/art/v1/goods/butterCookies-v2.png'},
 cheese:{name:'치즈',price:580,image:'/farm/art/v1/goods/cheese-v2.png'},
 cream:{name:'생크림',price:420,image:'/farm/art/v1/goods/cream-v2.png'},
 yogurt:{name:'요구르트',price:450,image:'/farm/art/v1/goods/yogurt-v2.png'},
 duckEgg:{name:'오리알',price:90,image:'/farm/art/v2/goods/duckEgg.png'},
 wool:{name:'양털',price:100,image:goodArt('wool')},
 duckEggTart:{name:'에그타르트',price:2800,image:'/farm/art/v2/goods/duckEggTart.png'},
 carrotCake:{name:'당근케이크',price:2900,image:goodArt('carrotCake')},
 rice:{name:'쌀',price:160,image:goodArt('rice')},
 ricePudding:{name:'쌀푸딩',price:240,image:goodArt('ricePudding')},
 grilledRiceBall:{name:'구운주먹밥',price:250,image:goodArt('grilledRiceBall')},
 omurice:{name:'오므라이스',price:6500,image:goodArt('omurice')},
 strawberryJam:{name:'딸기잼',price:900,image:goodArt('strawberryJam')},
 tomatoKetchup:{name:'토마토케첩',price:800,image:goodArt('tomatoKetchup')},
} as const
export type ProductGood=keyof typeof farmProducts
export type RecipeIngredient=CropKind|ProductGood
export const millRecipes={flour:{crop:'wheat',seconds:10,input:3,output:1},cornFlour:{crop:'corn',seconds:10,input:3,output:1},sugar:{crop:'sugarcane',seconds:8,input:3,output:1},rice:{crop:'paddy',seconds:10,input:3,output:1}} as const
export type MillProduct=keyof typeof millRecipes
export const millProducts=Object.keys(millRecipes) as MillProduct[]

// Trial recipes: ingredients are reserved once at start, collected once after completion.
export const farmRecipes={
 butter:{building:'dairy',seconds:4,ingredients:[{good:'milk',quantity:3}]},
 strawberryMilk:{building:'dairy',seconds:5,food:true,ingredients:[{good:'milk',quantity:3},{good:'strawberryJam',quantity:1}]},
 eggCookies:{building:'bakery',seconds:5,food:true,ingredients:[{good:'flour',quantity:2},{good:'egg',quantity:2}]},
 pancakes:{building:'bakery',seconds:7,food:true,ingredients:[{good:'flour',quantity:2},{good:'egg',quantity:2},{good:'milk',quantity:2}]},
 cake:{building:'mediumBakery',seconds:10,food:true,ingredients:[{good:'flour',quantity:3},{good:'egg',quantity:3},{good:'cream',quantity:2},{good:'strawberry',quantity:3},{good:'sugar',quantity:2}]},
 cornBread:{building:'bakery',seconds:7,food:true,ingredients:[{good:'cornFlour',quantity:2},{good:'flour',quantity:2},{good:'milk',quantity:2}]},
 potatoBread:{building:'bakery',seconds:7,food:true,ingredients:[{good:'flour',quantity:2},{good:'potato',quantity:3},{good:'butter',quantity:1}]},
 sweetPotatoPie:{building:'bakery',seconds:10,food:true,ingredients:[{good:'flour',quantity:3},{good:'sweetPotato',quantity:3},{good:'butter',quantity:2}]},
 butterCookies:{building:'bakery',seconds:8,food:true,ingredients:[{good:'flour',quantity:2},{good:'butter',quantity:1},{good:'sugar',quantity:2}]},
 cheese:{building:'dairy',seconds:8,ingredients:[{good:'milk',quantity:4}]},
 cream:{building:'dairy',seconds:4,ingredients:[{good:'milk',quantity:3}]},
 yogurt:{building:'dairy',seconds:6,food:true,ingredients:[{good:'milk',quantity:3}]},
 duckEggTart:{building:'bakery',seconds:8,food:true,animal:'duck',ingredients:[{good:'duckEgg',quantity:2},{good:'flour',quantity:2},{good:'cream',quantity:1},{good:'sugar',quantity:2}]},
 carrotCake:{building:'mediumBakery',seconds:10,food:true,ingredients:[{good:'carrot',quantity:3},{good:'flour',quantity:2},{good:'egg',quantity:2},{good:'sugar',quantity:2},{good:'cream',quantity:1}]},
 tomatoKetchup:{building:'sauceWorkshop',seconds:8,category:'sauce',ingredients:[{good:'tomato',quantity:3},{good:'sugar',quantity:2}]},
 // Keep the retired definition so an already running job can still be collected.
 ricePudding:{building:'kitchen',seconds:8,retired:true,ingredients:[{good:'rice',quantity:2},{good:'milk',quantity:2},{good:'strawberryJam',quantity:1}]},
 grilledRiceBall:{building:'advancedKitchen',seconds:8,retired:true,ingredients:[{good:'rice',quantity:2},{good:'egg',quantity:1},{good:'cheese',quantity:1},{good:'tomatoKetchup',quantity:1}]},
 omurice:{building:'advancedKitchen',seconds:10,food:true,ingredients:[{good:'rice',quantity:3},{good:'egg',quantity:3},{good:'butter',quantity:1},{good:'tomatoKetchup',quantity:2}]},
 strawberryJam:{building:'sauceWorkshop',seconds:8,category:'sauce',ingredients:[{good:'strawberry',quantity:3},{good:'sugar',quantity:2}]},
 butterPotato:{building:'kitchen',seconds:6,food:true,ingredients:[{good:'potato',quantity:3},{good:'butter',quantity:1}]},
 roastedSweetPotato:{building:'kitchen',seconds:5,food:true,ingredients:[{good:'sweetPotato',quantity:3}]},
 cornCheese:{building:'advancedKitchen',seconds:10,food:true,ingredients:[{good:'corn',quantity:3},{good:'cheese',quantity:1},{good:'butter',quantity:1}]},
 potatoGratin:{building:'advancedKitchen',seconds:10,food:true,ingredients:[{good:'potato',quantity:3},{good:'cheese',quantity:1},{good:'cream',quantity:1}]},
 cornCookies:{building:'bakery',seconds:8,food:true,ingredients:[{good:'cornFlour',quantity:2},{good:'butter',quantity:1},{good:'sugar',quantity:2}]},
 butterSteak:{building:'kitchen',seconds:8,food:true,ingredients:[{good:'redMeat',quantity:2},{good:'butter',quantity:1}]},
 chickenSoup:{building:'kitchen',seconds:7,food:true,ingredients:[{good:'chickenMeat',quantity:2},{good:'carrot',quantity:3}]},
 duckPotatoStirFry:{building:'kitchen',seconds:8,food:true,ingredients:[{good:'duckMeat',quantity:2},{good:'potato',quantity:3}]},
 meatStew:{building:'advancedKitchen',seconds:10,food:true,ingredients:[{good:'redMeat',quantity:2},{good:'potato',quantity:3},{good:'carrot',quantity:2},{good:'tomatoKetchup',quantity:2}]},
 chickenGratin:{building:'advancedKitchen',seconds:10,food:true,ingredients:[{good:'chickenMeat',quantity:2},{good:'potato',quantity:3},{good:'cheese',quantity:1},{good:'cream',quantity:2}]},
 duckFriedRice:{building:'advancedKitchen',seconds:10,food:true,ingredients:[{good:'duckMeat',quantity:2},{good:'rice',quantity:3},{good:'egg',quantity:3},{good:'carrot',quantity:2}]},
} as const satisfies Record<string,{building:ProcessingBuilding;seconds:number;retired?:boolean;food?:boolean;category?:'sauce';output?:number;animal?:FarmAnimal;ingredients:readonly {good:RecipeIngredient;quantity:number}[]}>
export type RecipeId=keyof typeof farmRecipes
export const recipeIds=(Object.keys(farmRecipes) as RecipeId[]).filter(id=>!('retired' in farmRecipes[id]))
export type FinishedFood={[K in RecipeId]:typeof farmRecipes[K] extends {food:true}?K:never}[RecipeId]
export const finishedFoods=recipeIds.filter(id=>'food' in farmRecipes[id]&&farmRecipes[id].food) as FinishedFood[]
export const isFinishedFood=(id:unknown):id is FinishedFood=>finishedFoods.some(food=>food===id)
export const processedGoods=[...millProducts,...meatGoods,...Object.keys(farmRecipes) as RecipeId[]] as const
export const isRecipeId=(id:unknown):id is RecipeId=>typeof id==='string'&&Object.hasOwn(farmRecipes,id)
export function recipeUnlocked(id:RecipeId,animals:readonly FarmAnimal[]=['cow','chicken']){const recipe=farmRecipes[id];return !('retired' in recipe)&&(!('animal' in recipe)||animals.includes(recipe.animal))}
export function recipeOutput(id:RecipeId){const recipe:{seconds:number;output?:number}=farmRecipes[id];return recipe.output??1}
export function recipeBatchLimit(inventory:Record<RecipeIngredient,number>,id:RecipeId){
 return Math.min(Math.floor(farmWorkshops[farmRecipes[id].building].maxOutput/recipeOutput(id)),...farmRecipes[id].ingredients.map(item=>Math.floor(inventory[item.good]/item.quantity)))
}

export function recipesForBuilding(kind:ProcessingBuilding,animals?:readonly FarmAnimal[]){return recipeIds.filter(id=>farmRecipes[id].building===kind&&recipeUnlocked(id,animals))}
