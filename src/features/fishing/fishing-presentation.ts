export const FISHING_ANIMATION_MS = 3000
export const fishingScenes = [
 { id:'pier',image:'/sprites/pongi-fishing-pier.png',label:'부두에서 낚싯줄을 바라보는 퐁이' },
 { id:'float',image:'/sprites/pongi-fishing-float.png',label:'튜브를 타고 낚시하는 퐁이' },
 { id:'rock',image:'/sprites/pongi-fishing-rock.png',label:'바위 위에서 낚싯대를 당기는 퐁이' },
] as const
export const oceanTrivia = [
 {text:'산호는 식물처럼 보여도 동물이에요.',source:'https://oceanservice.noaa.gov/facts/coral.html'},
 {text:'산호와 함께 사는 작은 조류는 산호에게 영양분을 나눠 줘요.',source:'https://oceanservice.noaa.gov/facts/coral.html'},
 {text:'해마는 수컷의 육아 주머니에서 새끼가 자라요.',source:'https://oceanservice.noaa.gov/facts/seahorse.html'},
 {text:'해마는 수컷이 새끼를 낳는 특별한 물고기예요.',source:'https://oceanservice.noaa.gov/facts/seahorse.html'},
 {text:'해달은 돌을 도구로 써서 단단한 조개껍데기를 열기도 해요.',source:'https://www.montereybayaquarium.org/wallpaper/southern-sea-otter-enrichment-wallpaper'},
 {text:'해달은 물속에서도 공기를 마셔야 하는 포유류예요.',source:'https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/sea-otter'},
] as const
// Playful flavor text only: these never change the server's roll or consume extra bait.
export const fishingFailureReasons = [
 '물고기가 미끼만 쏙 먹고 달아났어요.',
 '앗, 물결에 찌가 흔들린 걸 입질로 착각했어요.',
 '물고기가 낚싯바늘 앞에서 마음을 바꿨어요.',
 '살짝 늦었어요. 작은 꼬리만 물속으로 사라졌네요.',
 '퐁이가 잠깐 하품하는 사이 입질이 지나갔어요.',
 '미끼가 맛집으로 소문났나 봐요. 흔적도 안 남았어요.',
 '기다리던 물고기가 오늘은 다른 항로로 갔나 봐요.',
 '줄을 당기는 순간, 물고기가 재빠르게 빠져나갔어요.',
] as const
export function pickRandom<T>(items:readonly T[],random= Math.random):T {
 return items[Math.floor(random()*items.length)]
}
export function createFishingPresentation(){
 return {id:crypto.randomUUID(),scene:pickRandom(fishingScenes),trivia:pickRandom(oceanTrivia),failure:pickRandom(fishingFailureReasons)}
}
export type FishingPresentation = ReturnType<typeof createFishingPresentation>
