export const kasim={
 name:'귀환 상인 카심',
 shopName:'카심의 귀환 상점',
 story:'왕릉 원정대에서 혼자 살아 돌아온 보급관. 그날 이후, 보물을 찾는 사람보다 돌아갈 사람을 위한 장비를 판다.',
 greeting:'보물은 두고 와도 좋네. 자네까지 두고 오지는 말게. 돌아올 준비부터 하고 가겠나?',
}

export const npcDialogue={
 merchantPurchase:[
  '꼼꼼히 골랐군. 필요한 순간에 제 몫을 해 줄 거야.',
  '내가 직접 살펴본 물건이네. 안심하고 챙겨 가게.',
  '준비가 하나 더 늘었군. 서두르지 말고 천천히 둘러보게.',
  '좋은 선택일세. 더 필요한 물건은 없나?',
  '이제 한결 든든하겠군. 남은 길에도 요긴할 게야.',
  '마음에 드는 걸 찾았나 보군. 다른 것도 살펴보겠나?',
 ],
 shamanLearn:[
  '새 주문이 자네 안에 자리를 잡았군. 그 감각을 잊지 말게.',
  '잘 익혔네. 이제 그 힘을 어디에 쓸지는 자네 몫이지.',
  '처음에는 천천히 펼쳐 보게. 주문도 주인을 알아가는 시간이 필요하니.',
  '모래바람이 좋은 제자를 데려왔군. 다른 가르침도 필요하겠나?',
  '그 주문은 자네와 잘 맞는군. 필요할 때 망설이지 말게.',
  '배운 건 잊히지 않네. 대신 마나까지 넘친다고 생각하면 곤란하지.',
 ],
 merchantFarewell:[
  '조심해서 내려가게. 돌아오는 길에도 내 자리는 여기일세.',
  '알겠네. 장비보다 먼저 자네 몸부터 챙기게.',
  '너무 깊이 욕심내지 말게. 살아 돌아와야 다음 거래도 하지.',
  '행운을 빌겠네. 횃불이 꺼지기 전에 길을 살피게.',
  '준비는 끝났나 보군. 발밑의 모래를 조심하게.',
 ],
 shamanFarewell:[
  '그럼 모래바람이 자네 길을 가려 주기를.',
  '내려가게. 배운 주문보다 자네 판단을 먼저 믿고.',
  '서두르지 말게. 이 아래의 침묵은 늘 무언가를 숨기고 있지.',
  '다시 만날 때까지 마력을 아껴 두게.',
  '인연이 닿으면 또 만나겠지. 무사히 돌아오게.',
 ],
} as const
export const shamanGreeting='모래바람이 자네를 여기까지 데려왔군. 금화가 있다면, 주문 하나쯤은 나눠 주지.'

export function pickNpcLine(lines:readonly string[],previous?:string,random=Math.random){
 const alternatives=lines.filter(line=>line!==previous)
 const pool=alternatives.length?alternatives:lines
 return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]??''
}
export function npcLineText(text:string){
 return text.replace(/^(?:귀환 상인 카심|카심|떠도는 사막 주술사)\s*:\s*/,'').replace(/^[“"]([\s\S]*)[”"]$/,'$1')
}
export function npcFarewellDelay(text:string){return Math.max(3000,Math.min(4600,1100+Array.from(text).length*65))}
