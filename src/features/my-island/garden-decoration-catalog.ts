import type {Facility} from './island-model'
import {villageDecorations} from './village-decoration-catalog'
export const gardenDecorations:Facility[]=[
 ...villageDecorations,
 {id:'wood-arrow-sign',name:'나무 화살표 표지판',kind:'arrow-sign',w:1,h:1,color:'#c69e6b',price:80,category:'decoration',rotatable:false},
 {id:'island-name-sign',name:'이름 간판',kind:'name-sign',w:2,h:1,color:'#c69e6b',price:120,category:'decoration',rotatable:false},
 {id:'fishing-pongi-statue',name:'낚시하는 퐁이 동상',kind:'pongi-statue',w:2,h:2,color:'#b5b39a',price:800,category:'decoration',rotatable:false},
 {id:'shell-fountain',name:'조개 분수대',kind:'shell-fountain',w:2,h:2,color:'#d4b8a6',price:1200,category:'decoration',rotatable:false},
 {id:'wood-fence',name:'나무 울타리',kind:'wood-fence',w:1,h:1,color:'#c2a073',price:40,category:'decoration',rotatable:true},
 {id:'stone-wall',name:'낮은 돌담',kind:'stone-wall',w:1,h:1,color:'#b4b5a0',price:60,category:'decoration',rotatable:true},
 {id:'flower-arch',name:'꽃 아치',kind:'flower-arch',w:2,h:1,color:'#d7aca8',price:250,category:'decoration',rotatable:false},
 ...[{id:'blue',name:'푸른',color:'#9cb9d1'},{id:'pink',name:'분홍',color:'#d8a7b3'},{id:'lilac',name:'보랏빛',color:'#b9acd1'}].map(c=>({id:'hydrangea-'+c.id,name:c.name+' 수국 화단',kind:'hydrangea',w:1,h:1,color:c.color,price:90,category:'decoration' as const,rotatable:false})),
 {id:'water-lily',name:'호수 수련',kind:'water-lily',w:1,h:1,color:'#e5c4ca',price:60,category:'decoration',rotatable:false,placementTerrain:'water'},
 {id:'beach-parasol',name:'해변 파라솔',kind:'parasol',w:2,h:2,color:'#e5c58f',price:220,category:'decoration',rotatable:false},
 {id:'beach-chair',name:'비치체어',kind:'beach-chair',w:1,h:2,color:'#b5c8b7',price:120,category:'decoration',rotatable:true},
 {id:'picnic-table',name:'피크닉 테이블',kind:'picnic-table',w:2,h:2,color:'#bc9568',price:300,category:'decoration',rotatable:true},
 {id:'sleeping-cat',name:'잠자는 고양이',kind:'sleeping-cat',w:1,h:1,color:'#c9ab8b',price:450,category:'decoration',rotatable:false},
]
export const gardenKinds=new Set(gardenDecorations.map(f=>f.kind))
