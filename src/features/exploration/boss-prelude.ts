import type {Monster} from './monster-catalog'

const bossLines:Record<string,readonly string[]>={
 'obsidian-anubis':['저 검은 형상… 왕릉을 지키는 아누비스야. 한순간도 방심하면 안 되겠어.','숨이 막힐 만큼 강한 기운이 느껴져… 보통 수호자가 아니야.','저 눈빛, 우리를 놓아줄 생각이 없어 보여. 단단히 준비하자.'],
 'golden-pharaoh':['황금 왕좌가 움직였어… 파라오가 직접 일어나는 거야!','이 압도적인 기운… 지금까지 만난 적들과는 차원이 달라.','파라오가 우리를 보고 있어. 여기서 물러설 수는 없어…!'],
 'golden-scales-maaken':['저 거대한 망치… 한 번만 맞아도 위험하겠어. 저울의 집행자야!','공기까지 무거워졌어… 마아켄이 우리를 심판하려는 것 같아.','왕릉 깊은 곳을 지키는 집행자… 지금까지보다 훨씬 힘든 싸움이 되겠어.'],
 'black-sun-aker':['저 황금가면… 왕조의 마지막 힘이 전부 깨어나고 있어!','온몸이 떨려… 지금까지의 적들과는 비교할 수 없는 힘이야.','여기가 마지막이야. 저 가면을 넘어서야 밖으로 돌아갈 수 있어…!'],
}
const fallback=['이 기운… 이곳을 지키는 강적이야. 단단히 준비하자!','등골이 서늘해… 보통 상대가 아니야. 끝까지 집중해야 해.','저 앞의 존재… 지금까지처럼 쉽게 넘어갈 수는 없겠어.']
export function bossPreludeLines(monster:Pick<Monster,'id'|'tier'>):readonly string[]|undefined{
 return monster.tier==='boss'?(bossLines[monster.id]??fallback):undefined
}
