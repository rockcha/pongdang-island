export const farmAnimals={
 chicken:{name:'닭',housing:'coop',product:'egg',price:300,seconds:10,description:'달걀을 생산해 과자와 빵의 재료를 준비해요.'},
 cow:{name:'젖소',housing:'barn',product:'milk',price:800,seconds:10,description:'우유를 생산해 유제품과 빵의 재료를 준비해요.'},
 duck:{name:'오리',housing:'coop',product:'duckEgg',price:500,seconds:10,description:'오리알을 생산해요. 구매하면 빵집에 에그타르트가 열려요.'},
 goat:{name:'염소',housing:'barn',product:'goatMilk',price:1000,seconds:10,description:'염소젖을 생산해요. 구매하면 유제품 공방에 염소치즈가 열려요.'},
} as const
export type FarmAnimal=keyof typeof farmAnimals
export const farmAnimalKinds=Object.keys(farmAnimals) as FarmAnimal[]
export const animalGoods=farmAnimalKinds.map(animal=>farmAnimals[animal].product)
export const ANIMAL_PURCHASE_SECONDS=10
export const isFarmAnimal=(kind:string):kind is FarmAnimal=>Object.hasOwn(farmAnimals,kind)
