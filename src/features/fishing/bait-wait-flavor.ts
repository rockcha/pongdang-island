const descriptions:Record<string,string>={
 bait:'익숙한 향기로 바다 친구들을 부르는 기본 미끼예요.',
 bait_safe:'맑은 이슬 향기로 바다 친구들을 빠르게 불러요.',
 bait_cloud_dough:'폭신한 구름 향기로 일반 등급 물고기를 빠르게 불러요.',
 bait_grubby_magnet:'꼬질한 향기로 물밑에 버려진 쓰레기만 끌어모아요.',
 bait_shell_crumbs:'고소한 조개 향기를 좋아하는 일반·희귀 물고기가 찾아와요.',
 bait_honey_dumpling:'달콤한 꿀 향기로 일반·희귀 물고기를 재빨리 불러요.',
 bait_pearl_bubble:'반짝이는 거품이 희귀 물고기의 호기심을 자극해요.',
 bait_halfmoon_honey:'반달 모양 꿀젤리에 일반·희귀 물고기가 고르게 모여요.',
 bait_zigzag_jelly:'두 가지 맛으로 일반·희귀 물고기를 번갈아 불러요.',
 bait_coral_pollen:'은은한 산호꽃 향기 사이로 특급 물고기가 찾아오기도 해요.',
 bait_firefly_pupa:'깊은 곳까지 번지는 작은 불빛이 특급 물고기를 유혹해요.',
 bait_starlight_wax:'은은하게 번지는 별빛에 드물게 신화 물고기가 이끌려 와요.',
 bait_shooting_star_tail:'대부분 일반 쓰레기를 건지지만, 가끔 신화 등급의 뜻밖의 발견을 만나요.',
 bait_cracked_star:'갈라진 별빛으로 희귀 물고기를 부르며, 드물게 신화 물고기도 만나요.',
 bait_lightning_stardust:'강렬한 번개빛이 희귀·특급 물고기를 끌어당겨요.',
 bait_forbidden_star:'금지된 별가루의 달콤한 향기가 특급·신화 등급의 기회를 높여요.',
 bait_sea_memory:'익숙한 바다의 향기로 현재 해역의 토착종을 더 자주 만나요.',
 bait_magnet:'바닷속에 잠든 장식물만 끌어올리는 인양 미끼예요.',
 bait_snowflake_salt:'맑은 소금 향기로 토착종을 제외한 공통종 물고기·쓰레기만 불러요.',
 bait_special:'진주새우의 반짝임으로 희귀 등급의 바다 친구들을 불러요.',
 bait_epic:'신비로운 보랏빛 잔광이 특급 등급의 바다 친구들을 이끌어요.',
 bait_first_greeting:'처음 맡는 향기로 아직 발견하지 못한 개체만 불러요.',
 bait_goblin_bell_cherry:'신비로운 방울 소리에 주로 희귀 물고기가 모이고, 가끔 특급 물고기도 찾아와요.',
 bait_aurora_clockwork_bug:'오색으로 빛나는 태엽이 물고기와 장식물을 끌어당겨요.',
 bait_mermaid_whisper_candy:'인어의 달콤한 노래가 희귀 물고기를 유혹해요.',
 bait_moonshade_dumpling:'밤에는 향기가 깊어져 희귀 등급을 조금 더 자주 만나지만, 입질은 더 느려져요.',
 bait_deep_sleep_sachet:'아주 긴 기다림을 감수하면 희귀 등급 이상의 깊은 바다 손님을 만나요.',
}

export function baitWaitFlavor(id:string){return descriptions[id]??'향기가 물속에 퍼지도록 차분히 기다려 주세요.'}

const durationLevels:Record<string,string>={
 bait:'보통',bait_safe:'낮음',bait_cloud_dough:'낮음',bait_grubby_magnet:'보통',
 bait_shell_crumbs:'약간 높음',bait_honey_dumpling:'약간 낮음',bait_pearl_bubble:'보통',
 bait_halfmoon_honey:'보통',bait_zigzag_jelly:'약간 높음',bait_coral_pollen:'약간 낮음',
 bait_firefly_pupa:'높음',bait_starlight_wax:'약간 높음',bait_shooting_star_tail:'약간 높음',
 bait_cracked_star:'높음',bait_lightning_stardust:'높음',bait_forbidden_star:'높음',
 bait_sea_memory:'약간 높음',bait_magnet:'약간 높음',bait_snowflake_salt:'보통',
 bait_special:'약간 낮음',bait_epic:'보통',bait_first_greeting:'보통',
 bait_goblin_bell_cherry:'높음',bait_aurora_clockwork_bug:'높음',bait_mermaid_whisper_candy:'보통',
 bait_deep_sleep_sachet:'매우 높음',
}

export function baitDurationLevel(id:string,period?:'day'|'night'){
 if(id==='bait_moonshade_dumpling')return period==='night'?'높음':'약간 높음'
 return durationLevels[id]??'보통'
}
