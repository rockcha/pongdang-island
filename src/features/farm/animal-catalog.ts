export const farmAnimals={
 chicken:{name:'닭',housing:'coop',product:'egg',price:1200,seconds:10,description:'달걀을 생산해 과자와 빵의 재료를 준비해요.'},
 cow:{name:'젖소',housing:'barn',product:'milk',price:3500,seconds:10,description:'우유를 생산해 유제품과 빵의 재료를 준비해요.'},
 duck:{name:'오리',housing:'coop',product:'duckEgg',price:2000,seconds:10,description:'오리알을 생산해요. 구매하면 빵집에 에그타르트가 열려요.'},
 sheep:{name:'양',housing:'barn',product:'wool',price:2800,seconds:10,description:'포근한 양털을 생산해요. 양털은 창고에 보관해요. 활용처는 준비 중이에요.'},
} as const
export type FarmAnimal=keyof typeof farmAnimals
export const farmAnimalKinds=Object.keys(farmAnimals) as FarmAnimal[]
export const animalGoods=farmAnimalKinds.map(animal=>farmAnimals[animal].product)
export const ANIMAL_PURCHASE_SECONDS=10
export const isFarmAnimal=(kind:string):kind is FarmAnimal=>Object.hasOwn(farmAnimals,kind)
