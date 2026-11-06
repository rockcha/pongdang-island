import type {FarmTool} from './topview-model'

const subtitles:Partial<Record<FarmTool,string>>={
 apiary:'벌들이 모은 꿀을 수확하는 양봉장',
 agriShop:'작물의 성장을 돕는 비료를 구매하는 곳',
 barn:'젖소·양을 키우는 사육 시설',
 coop:'닭·오리를 키우는 사육 시설',
 seedShop:'밭에 심을 종자를 구매하는 상점',
 store:'완성된 음식을 납품하고 골드를 받는 곳',
 butcher:'보관한 동물을 고기로 바꾸는 곳',
 waterwheel:'인접 생산 건물의 제작 시간을 레벨당 1분 단축',
 warehouse:'수확물과 생산품을 보관하는 창고',
 office:'개간 도구를 준비하는 작업터 · 밭 한도 +4칸',
 livestockOffice:'먹이와 물을 준비하는 돌봄 공간 · 동물 정원 +2마리',
 lab:'새 작물의 종자를 연구하는 곳',
 mill:'곡물을 가루·쌀·설탕으로 가공하는 곳',
 dairy:'우유로 유제품과 음료를 만드는 공방',
 bakery:'빵과 과자를 굽는 작은 빵집',
 mediumBakery:'과일과 생크림으로 케이크를 굽는 빵집',
 kitchen:'간단한 요리를 만드는 주방',
 advancedKitchen:'다양한 재료로 요리하는 주방',
 sauceWorkshop:'요리에 쓰는 소스와 잼을 만드는 공방',
 plot:'종자를 심고 작물을 수확하는 밭',
}
export const farmBuildingSubtitle=(kind:FarmTool)=>subtitles[kind]??'농장을 가꾸는 시설'
