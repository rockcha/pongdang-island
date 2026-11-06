export const farmAnimals={
 chicken:{name:'닭',housing:'coop',product:'egg',price:600,seconds:1200,description:'달걀을 생산해 과자와 빵의 재료를 준비해요.'},
 cow:{name:'젖소',housing:'barn',product:'milk',price:1800,seconds:2400,description:'우유를 생산해 유제품과 빵의 재료를 준비해요.'},
 duck:{name:'오리',housing:'coop',product:'duckEgg',price:1000,seconds:2100,description:'오리알을 생산해요. 구매하면 빵집에 에그타르트가 열려요.'},
 sheep:{name:'양',housing:'barn',product:'wool',price:1400,seconds:3600,description:'양털을 생산해요. 방직 공방에서 털실과 펠트로 가공하고 재봉 공방에서 생활용품을 만들어요.'},
} as const
export type FarmAnimal=keyof typeof farmAnimals
export const farmAnimalKinds=Object.keys(farmAnimals) as FarmAnimal[]
export const animalGoods=farmAnimalKinds.map(animal=>farmAnimals[animal].product)
export const ANIMAL_PURCHASE_SECONDS=10
export const ANIMAL_PRODUCTION_OUTPUT=2
export const isFarmAnimal=(kind:string):kind is FarmAnimal=>Object.hasOwn(farmAnimals,kind)
