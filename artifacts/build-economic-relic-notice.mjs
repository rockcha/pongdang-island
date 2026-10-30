import fs from 'node:fs'
import {randomUUID} from 'node:crypto'
import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
const root='assets/notices/20261030-economic-relics'
fs.mkdirSync(root,{recursive:true})
const id=fs.existsSync(root+'/notice.json')?JSON.parse(fs.readFileSync(root+'/notice.json','utf8')).id:randomUUID()
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const groups=[
 {file:'bait-refund-relics.png',title:'사용한 미끼가 다시 돌아와요',subtitle:'미끼 반환 유물 3종',kind:'bait_refund_percent',footer:'직접 낚시 성공 시 사용한 미끼 1개를 돌려받을 수 있어요.'},
 {file:'savings-interest-relics-v2.png',title:'차곡차곡, 조개 적금 이자도 더 크게',subtitle:'적금 유물 3종',kind:'savings_interest_bonus_percent',footer:'기본 조개 적금 이자에 추가 적용 · 3일·5일·7일 모두 적용'}
]
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:1080,height:650},deviceScaleFactor:1})
 await page.goto('http://127.0.0.1:5173/artifacts/previews/relic-atelier.html')
 for(const group of groups){
  const rows=['rare','epic','mythic'].map(rarity=>catalog.fishing_relics.find(r=>r.enabled&&r.effect_kind===group.kind&&r.rarity===rarity))
  const cards=rows.map(r=>`<article data-rarity="${r.rarity}"><span class="grade">${{rare:'희귀',epic:'특급',mythic:'신화'}[r.rarity]}</span><img src="${r.thumbnail_path}" alt="${r.name}"><h2>${r.name}</h2><strong>${group.kind==='bait_refund_percent'?'반환 확률 ':'조개 적금 이자 +'}${r.effect_value}%</strong></article>`).join('')
  await page.setContent(`<!doctype html><html lang="ko"><head><link rel="stylesheet" href="http://127.0.0.1:5173/src/index.css"><style>
   *{box-sizing:border-box}body{margin:0;font-family:'Gowun Dodum','Malgun Gothic',sans-serif}.poster{width:1080px;padding:38px 40px 30px;background:#fff8ee;color:#67442e}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}h1{font-size:36px;line-height:1.4;margin:5px 0 0;font-weight:600}.subtitle{font-size:21px;color:#aa7350}header img{width:66px;height:66px;object-fit:contain}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}article{display:flex;flex-direction:column;align-items:center;padding:18px 14px 22px;border:1px solid #ead5bd;border-radius:24px;background:#fffdf9}article[data-rarity=rare]{background:#f1f7ff;border-color:#c6dbef}article[data-rarity=epic]{background:#f8f1ff;border-color:#e1c9ee}article[data-rarity=mythic]{background:#fff4da;border-color:#ead19d}.grade{font-size:19px;color:#997353}article img{width:214px;height:214px;object-fit:contain;margin:12px 0}h2{display:flex;align-items:center;justify-content:center;min-height:62px;margin:0;font-size:25px;line-height:1.4;font-weight:500;text-align:center;word-break:keep-all}strong{margin-top:9px;font-size:29px;font-weight:600;color:#a15d2c}footer{padding-top:24px;text-align:center;color:#997353;font-size:21px;line-height:1.5}
  </style></head><body><section class="poster"><header><div><p class="subtitle">${group.subtitle}</p><h1>${group.title}</h1></div><img src="http://127.0.0.1:5173/app-icons/relic.png" alt=""></header><div class="grid">${cards}</div><footer>${group.footer}</footer></section></body></html>`)
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()))})
  await page.locator('.poster').screenshot({path:root+'/'+group.file})
 }
}finally{await browser.close()}
const images=groups.map(g=>id+'/'+g.file)
const body=`안녕하세요, 퐁당섬입니다! 🦦
두 유물의 힘을 하나로 잇는 **세공**이 곧 찾아옵니다.
그리고 낚시와 적금에 도움을 줄 **신규 유물 6종**이 추가됐어요!

## 곧 만나요, 유물 세공
서로 다른 계열의 유물 2개를 결합하면 두 효과를 함께 가진 유물이 완성돼요.
- 성공 확률 **35%**, 비용 **5,000골드**로 준비하고 있어요.
- 실패하면 낮은 등급 유물 1개가 소모돼요. 같은 등급끼리는 무작위로 1개가 소모돼요.
- 성공·실패 모두 골드가 소모돼요. 장착한 1개는 보호하며, 여분이 있으면 재료로 사용할 수 있어요.
**세공은 현재 운영자 테스트 중이며, 정식 오픈 시 다시 안내드릴게요.**

## 미끼가 다시 돌아오는 유물 3종
![이미지](${images[0]})
- **희귀 · 돌아오는 미끼 주머니**: 미끼 반환 확률 1%
- **특급 · 밀물이 돌려준 미끼함**: 미끼 반환 확률 3%
- **신화 · 해왕의 끝없는 미끼 항아리**: 미끼 반환 확률 5%
장착하고 새로 시작한 직접 낚시가 성공하면, 사용한 미끼 1개를 확률에 따라 돌려받아요. 실패·취소·만료에는 반환되지 않아요.

## 조개 적금 이자를 더해 주는 유물 3종
![이미지](${images[1]})
- **희귀 · 동전을 품은 조개**: 조개 적금 이자 +2%
- **특급 · 바다상인의 진주 금고**: 조개 적금 이자 +5%
- **신화 · 해왕의 황금 금고**: 조개 적금 이자 +10%
3일·5일·7일 적금 모두 적용돼요. 원금이 아니라 **기본 조개 적금 이자**에 보너스를 더하는 효과예요.
예를 들어 기본 조개 적금 이자가 1,000골드라면, 신화 유물 적용 시 1,100골드의 이자를 받아요.
장착하고 새로 가입할 때 효과가 확정돼요. 기존 적금에는 소급 적용되지 않으며, 중도 해지나 납입 실패에는 이자가 지급되지 않아요.

새 유물은 직접 낚시로 발견하고 유물 메뉴에서 장착할 수 있어요.
앞으로 열릴 세공에서도 같은 계열끼리는 결합할 수 없지만, 미끼 반환 유물과 적금 유물처럼 서로 다른 계열은 함께 결합할 수 있어요.

오늘도 퐁당섬에서 소소한 행운을 만나세요! 🧡`
const notice={id,category:'update',title:'곧 만나요, 유물 세공! 신규 유물 6종도 등장했어요',images,body}
fs.writeFileSync(root+'/notice.json',JSON.stringify(notice,null,2)+'\n')
console.log(JSON.stringify({id,title:notice.title,images:groups.map(g=>g.file),bodyLength:body.length}))
