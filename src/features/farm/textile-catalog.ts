const art=(id:string)=>`/farm/art/textiles-v1/${id}.png`

export const textileCropArt={icon:art('cotton'),ready:art('cotton-ready')}
export const textileProducts={
 cottonFabric:{name:'면직물',price:10,image:art('cottonFabric')},
 woolYarn:{name:'털실',price:4,image:art('woolYarn')},
 felt:{name:'펠트',price:4,image:art('felt')},
 towel:{name:'수건',price:160,image:art('towel')},
 scarf:{name:'목도리',price:180,image:art('scarf')},
 pongiDoll:{name:'퐁이 인형',price:420,image:art('pongiDoll')},
 blanket:{name:'포근한 담요',price:540,image:art('blanket')},
} as const

// Intermediate fibers stay out of delivery; only the four finished household goods sell.
export const textileRecipes={
 cottonFabric:{building:'textileMill',seconds:2700,ingredients:[{good:'cotton',quantity:2}]},
 woolYarn:{building:'textileMill',seconds:1800,ingredients:[{good:'wool',quantity:2}]},
 felt:{building:'textileMill',seconds:2700,ingredients:[{good:'wool',quantity:2}]},
 towel:{building:'sewingWorkshop',seconds:3600,household:true,ingredients:[{good:'cottonFabric',quantity:2}]},
 scarf:{building:'sewingWorkshop',seconds:3600,household:true,ingredients:[{good:'woolYarn',quantity:2}]},
 pongiDoll:{building:'sewingWorkshop',seconds:7200,household:true,ingredients:[{good:'cottonFabric',quantity:2},{good:'felt',quantity:2}]},
 blanket:{building:'sewingWorkshop',seconds:10800,household:true,ingredients:[{good:'cottonFabric',quantity:3},{good:'woolYarn',quantity:3}]},
} as const
