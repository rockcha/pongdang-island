// Production facilities share one definition across shop, artwork, dialogs and status.
export const farmWorkshops={
 apiary:{name:'양봉장',price:2000,purchaseLimit:Infinity,purpose:'벌들이 모은 꿀을 수확해 음료와 과자를 만들어요.',pickerLabel:'생산할 꿀',maxOutput:2,nextFacilities:['dairy','bakery','mediumBakery'],image:'/farm/art/honey-v1/apiary.png'},
 dairy:{name:'유제품 공방',price:2000,purchaseLimit:Infinity,purpose:'우유로 유제품과 음료를 만들어요.',pickerLabel:'만들 유제품',maxOutput:2,nextFacilities:['store'],image:'/farm/art/v19/buildings/dairy.png'},
 bakery:{name:'작은 빵집',price:3000,purchaseLimit:Infinity,purpose:'밀가루·달걀·우유 등으로 과자와 빵을 만들어요.',pickerLabel:'만들 빵과 과자',maxOutput:2,nextFacilities:['store'],image:'/farm/art/v19/buildings/bakery.png'},
 mediumBakery:{name:'중형 빵집',price:4000,purchaseLimit:Infinity,purpose:'밀가루와 달걀에 과일·생크림을 더해 풍성한 케이크를 만들어요.',pickerLabel:'만들 케이크',maxOutput:2,nextFacilities:['store'],image:'/farm/art/v29/buildings/mediumBakery.png'},
 kitchen:{name:'작은 주방',price:2500,purchaseLimit:Infinity,purpose:'수확한 작물로 간단한 요리를 만들고, 버터와 고기를 더해 다양한 음식을 준비해요.',pickerLabel:'만들 간단한 요리',maxOutput:2,nextFacilities:['store'],image:'/farm/art/v19/buildings/kitchen.png'},
 sauceWorkshop:{name:'소스 공방',price:2000,purchaseLimit:Infinity,purpose:'토마토와 딸기에 설탕을 더해 케첩·딸기잼을 만들어요. 주방 요리의 재료로 사용해요.',pickerLabel:'만들 소스와 잼',maxOutput:2,nextFacilities:['kitchen','advancedKitchen'],image:'/farm/art/v19/buildings/sauceWorkshop.png'},
 advancedKitchen:{name:'중급 주방',price:5000,purchaseLimit:Infinity,purpose:'쌀과 채소에 소스·유제품을 더해 풍성한 요리를 만들어요.',pickerLabel:'만들 중급 요리',maxOutput:2,nextFacilities:['store'],image:'/farm/art/v19/buildings/advancedKitchen.png'},
} as const
export type ProcessingBuilding=keyof typeof farmWorkshops
export const isProcessingBuilding=(kind:unknown):kind is ProcessingBuilding=>typeof kind==='string'&&Object.hasOwn(farmWorkshops,kind)
export const farmWorkshopItems=Object.fromEntries(Object.entries(farmWorkshops).map(([kind,item])=>[kind,{name:item.name,price:item.price,purchaseLimit:item.purchaseLimit,w:2,h:1,group:'건물' as const}])) as Record<ProcessingBuilding,{name:string;price:number;purchaseLimit:number;w:number;h:number;group:'건물'}>
