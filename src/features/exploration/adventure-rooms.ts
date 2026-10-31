import {drawRewardTier,drawFloorMonster,drawInvestigationMonster,campaignChestGold} from './campaign'
﻿import {drawMonster,type MonsterId} from './monster-catalog'
import {drawInvestigationLoot,type RoomLoot} from './room-loot'
import {playerMaxHp,playerManaMax,type PracticeState} from './practice-state'
type RoomKind='story'|'choice'|'lore'|'rest'|'curse'|'thief'|'chest'|'investigate'|'giant'|'boss'|'sphinx'|'scales'
type RoomDefinition={id:string;kind:RoomKind;name:string;title:string;intro:readonly string[];progress:readonly string[];background:string;monsterId?:MonsterId}
const bg=(id:string)=>`/exploration/rooms/${id}.webp`
export const adventureRooms=[
 {id:'erased-name',kind:'story',name:'이야기 · 지워진 이름',title:'지워진 이름',background:bg('warning-wall'),intro:['지워진 이름 아래에 작은 돌조각이 떨어져 있다.'],progress:['아무 일도 일어나지 않았다.']},
 {id:'erased-name-record',kind:'story',name:'이야기 · 왕이 지운 기록',title:'왕이 지운 기록',background:bg('investigate-wall'),intro:['봉인된 기록에 왕이 지운 이름의 진실이 남아 있다.'],progress:['문지기 𓋴𓈖𓅱의 이름을 기억했다.']},
 {id:'nameless-guardian',kind:'story',name:'이야기 · 이름 없는 왕실 수문장',title:'이름 없는 왕실 수문장',background:bg('investigate-guards'),intro:['흑청동 중갑의 왕실 수문장이 거대한 대검을 짚고 오래된 문을 지키고 있다. 가슴의 이름은 깊게 깎여 있다.'],progress:['가슴 명패에 금빛 이름이 되살아났다. 왕실 수문장이 자신을 기억해 냈다.']},

 {id:'soul-lantern',kind:'choice',name:'계약 · 영혼의 등불',title:'영혼의 등불',background:bg('rest-camp'),intro:['최대 마나 10을 영구히 바치면, 이번 탐험에서 사망할 때 한 번 체력 20으로 부활한다. 등불을 켤까?'],progress:['영혼의 불꽃이 켜졌다. 최대 마나 −10 · 사망 시 한 번 체력 20으로 부활.']},
 {id:'deep-well',kind:'choice',name:'선택 · 깊은 샘',title:'깊은 샘',background:bg('rest-oasis'),intro:['깊은 샘이 생기를 품고 있다. 물을 마시면 체력은 전부 회복되지만, 마나를 모두 잃는다.'],progress:['차가운 물이 상처를 아물게 한다. 체력을 전부 회복하고 마나는 0이 되었다.']},
 {id:'forbidden-trade',kind:'choice',name:'계약 · 금단의 거래',title:'금단의 거래',background:bg('curse'),intro:['“살아 있는 피에는 잊힌 주문을 깨우는 힘이 있지.” 체력 50을 바치면 아직 얻지 못한 중급 마법 하나를 무작위로 받는다.'],progress:['피를 대가로 잊힌 주문이 기억 속에 새겨졌다. 체력 −50 · 중급 마법 획득.']},
 {id:'cursed-gem-eye',kind:'choice',name:'선택 · 저주받은 보석눈',title:'저주받은 보석눈',background:bg('chest'),intro:['석상의 보석눈을 뽑으면 골드 500을 얻는다. 대신 다음 두 전투에서 적의 기본 공격력이 3 증가한다.'],progress:['보석눈을 뽑았다. 골드 +500 · 다음 두 전투 적 기본 공격력 +3. 도망쳐도 한 전투로 센다.']},
 {id:'broken-teleport',kind:'choice',name:'이동 · 불완전한 순간이동진',title:'불완전한 순간이동진',background:'/exploration/rooms/broken-teleport.png',intro:['골드 200을 넣으면 3층 아래로 이동한다. 도착한 층은 평소처럼 탐험하며, 고정 등장 방은 건너뛰지 않는다.'],progress:['마법진에 골드 200을 넣었다. 세 층 아래로 향하는 길이 열렸다.']},

 {"id":"warning-wall","kind":"lore","name":"이야기 · 벽에 새겨진 경고","title":"벽에 새겨진 경고","background":"/exploration/rooms/warning-wall.webp","intro":["텅 빈 방이다. 벽 한편에 누군가 경고를 새겨 두었다. 읽어 볼까?","바랜 벽화 아래에 오래된 글귀가 남아 있다. 잠시 읽어 볼까?","발소리만 울리는 고요한 방이다. 등불 옆의 석벽에 글자가 보인다."],"progress":["“스핑크스 앞에서는 성급히 입을 열지 말라. 답을 찾지 못한 자는 영혼의 절반을 두고 떠나리라.”","“검은 갑옷의 문지기를 만나거든 뒤돌아보지 말라. 아누비스가 닫은 문은 승자에게만 다시 열린다.”","“붉은 약병과 푸른 약병을 깊이 간수하라. 이곳에는 황금보다 작은 약병을 탐내는 손도 있다.”","“모든 궤짝이 보물을 품지는 않는다. 금화가 쏟아질 수도, 잠든 괴물이 뛰쳐나올 수도 있다.”","“별빛이 닿는 정원과 맑은 샘을 기억하라. 왕릉에도 지친 나그네가 숨을 고를 자리는 남아 있다.”","“검은 제단 앞에 오래 머물지 말라. 그 돌은 기도 대신 살아 있는 자의 기운을 마신다.”","“잠든 돌의 거인을 깨우지 말라. 왕이 잠든 뒤에도 그 충성은 모래 아래에서 식지 않았다.”","“갈라진 벽화 뒤에서 빛이 새어 나온다면 살펴보아도 좋다. 다만 틈 너머에서도 누군가 너를 살피고 있으리라.”","“아누비스 앞에서 도망길을 찾지 말라. 그의 창을 넘어선 자만 문 너머의 전리품을 얻으리라.”","“상자의 봉인은 금화를 지키는 자물쇠일 수도, 안에 든 것을 가두는 마지막 빗장일 수도 있다.”","“주머니를 가볍게 스치는 손길을 조심하라. 뒤늦게 알아차리면 약병 한두 개가 사라져 있으리라.”","“스핑크스가 허락하는 것은 길뿐이다. 지혜를 증명했다 하여 황금을 바라지 말라.”","“푸른 꽃이 별빛을 머금은 곳에서는 잠시 검을 내려놓아도 좋다. 고요한 정원이 지친 생명과 마력을 달래리라.”","“빛을 삼키는 검은 문양을 밟았다면 서둘러 떠나라. 제단은 생명과 마력을 함께 탐낸다.”","“궤짝을 그냥 지나친 자는 상처를 피했고, 봉인을 푼 자는 황금을 얻기도 했다. 어느 길이 옳았는지는 돌아온 자만 안다.”","“금화만 세지 말라. 모래두건의 그림자는 네가 동전을 바라보는 사이 약병을 노린다.”","“무너진 호위대의 짐에는 칼날도, 튼튼한 옷도, 멀쩡한 약병도 남아 있을 수 있다. 주인이 돌아오지 않기만을 바라라.”","“거인의 발밑에는 오래된 물건이 잠들어 있다. 탐난다면 돌주먹의 무게부터 헤아려라.”","“작은 상처라 하여 비웃지 말라. 흘러내리는 피는 적의 칼이 멈춘 뒤에도 목숨을 갉아먹는다.”","“청록의 수호 문양이 깨졌다면 다음 혼불을 경계하라. 금이 간 보호막으로는 같은 불꽃도 더 뜨겁게 스며든다.”","“황금왕의 사슬은 장식이 아니다. 빛나는 고리가 살갗을 스치면 깊은 상처가 남으리라.”","“마지막 왕은 황금보다 강한 탐욕으로 깨어난다. 가장 깊은 문 앞에서는 지나온 행운만을 믿지 말라.”","“저울은 네가 손에서 놓은 물건만을 받는다. 지금 쥔 검과 걸친 갑옷은 거래의 무게가 될 수 없다.”","“벽화의 눈은 지나가는 이를 오래 바라본다. 왕의 이름을 지우려 한 자들의 이름은 먼저 잊혔다.”"]},
 {id:'rest-oasis',kind:'rest',name:'휴식 · 지하 오아시스',title:'지하 오아시스',background:bg('rest-oasis'),intro:['벽 사이로 맑은 물소리가 들린다. 여기서 쉬었다 가겠습니까?','고요한 샘물이 지친 발걸음을 붙잡는다. 잠시 쉬어 갈까?','야자수 그늘 아래 맑은 샘이 있다. 몸을 쉬일 수 있을 것 같다.'],progress:['차가운 샘물이 지친 몸을 달랜다. 체력과 마나가 완전히 회복됐다.','맑은 물을 마시고 숨을 돌렸다. 몸과 마력이 다시 충만해진다.','물가에서 잠시 눈을 감았다. 어느새 피로가 말끔히 걷혔다.']},
 {id:'rest-camp',kind:'rest',name:'휴식 · 순례자의 야영지',title:'순례자의 야영지',background:bg('rest-camp'),intro:['누군가 남긴 불씨가 아직 따뜻하다. 여기서 쉬었다 가겠습니까?','빈 침낭과 따뜻한 주전자가 놓여 있다. 잠시 머물러도 좋을 것 같다.','모닥불이 작게 타닥인다. 긴장을 풀고 쉬어 갈까?'],progress:['불가에서 눈을 붙이자 기력이 돌아온다. 체력과 마나가 완전히 회복됐다.','따뜻한 차 한 모금에 몸의 긴장이 풀린다. 기운이 다시 차오른다.','침낭에서 짧게 쉬었다. 몸과 마음이 한결 가벼워졌다.']},
 {id:'rest-garden',kind:'rest',name:'휴식 · 별빛 정원',title:'별빛 정원',background:bg('rest-garden'),intro:['왕릉 깊은 곳에 고요한 정원이 펼쳐진다. 여기서 쉬었다 가겠습니까?','천장 틈으로 내려온 별빛이 푸른 꽃에 맺혀 있다. 잠시 쉬어 갈까?','은은한 꽃향기가 바람을 타고 흐른다. 이곳에서는 경계를 풀어도 될 것 같다.'],progress:['푸른 꽃향기 속에서 마음까지 맑아진다. 체력과 마나가 완전히 회복됐다.','별빛 아래 깊게 숨을 들이쉬었다. 지쳤던 생명과 마력이 되살아난다.','고요한 정원에 앉아 쉬었다. 다시 걸어갈 힘이 돌아왔다.']},
 {id:'curse',kind:'curse',name:'저주 · 검은 제단',title:'검은 제단',background:bg('curse'),intro:['검은 문양이 발밑을 감싼다. 생명과 마력의 일부가 빠져나간다.'],progress:['제단의 빛이 꺼졌다. 서둘러 이곳을 벗어나는 편이 좋겠다.']},
 {id:'thief',kind:'thief',name:'도둑 · 모래두건의 그림자',title:'모래두건 도둑',background:bg('thief-empty'),intro:['모래두건을 쓴 도둑이 빼앗은 약병을 흔들어 보인다. 주머니가 가벼워졌다!'],progress:['도둑이 약병을 품속에 숨기며 슬쩍 웃는다. 남은 물품을 확인하고 길을 나서자.']},
 {id:'chest',kind:'chest',name:'아이템 상자 · 봉인된 궤짝',title:'봉인된 궤짝',background:bg('chest'),intro:['묵직한 궤짝의 틈으로 희미한 빛이 새어 나온다. 열어 볼까?'],progress:['봉인을 풀자 궤짝 안에서 금화가 쏟아졌다.']},
 {id:'investigate-guards',kind:'investigate',name:'조사 · 무너진 호위대의 흔적',title:'무너진 호위대의 흔적',background:bg('investigate-guards'),intro:['부러진 창과 모래에 묻힌 짐이 보인다. 온전한 물건이 남아 있을까?','급히 떠난 호위대의 짐이 길가에 흩어져 있다. 주변을 조사해 볼까?','낡은 방패 아래에 무언가 걸려 있다. 조심스럽게 살펴볼까?'],progress:['모래를 걷어내자 쓸 만한 물건이 드러났다.','버려진 짐 속에서 온전한 물건을 찾아냈다.','방패 아래에 숨겨진 물건을 발견했다.']},
 {id:'investigate-wall',kind:'investigate',name:'조사 · 벽화 뒤의 틈',title:'벽화 뒤의 틈',background:bg('investigate-wall'),intro:['떨어진 벽화 뒤로 작은 틈이 보인다. 안쪽을 조사해 볼까?','벽화의 일부가 부서져 있다. 틈 너머에서 금속이 희미하게 반짝인다.','오래된 벽의 균열 사이로 시원한 바람이 분다. 살펴볼까?'],progress:['벽 틈에 손을 넣어 숨겨진 물건을 꺼냈다.','부서진 벽화 뒤에서 작은 보관함을 발견했다.','돌조각을 치우자 오래 숨겨진 물건이 모습을 드러냈다.']},
 {id:'investigate-alchemy',kind:'investigate',name:'조사 · 버려진 연금술 작업대',title:'버려진 연금술 작업대',background:bg('investigate-alchemy'),intro:['먼지 쌓인 작업대에 봉인이 멀쩡한 물건이 남아 있다. 조사해 볼까?','낡은 기록과 약병이 놓여 있다. 쓸 만한 물건이 있을지도 모른다.','연금술사는 오래전에 떠난 듯하다. 남은 짐을 살펴볼까?'],progress:['작업대의 서랍에서 온전한 물건을 찾았다.','먼지를 털어내자 보관된 물건이 선명하게 드러났다.','낡은 기록 아래에서 쓸 만한 물건을 건져냈다.']},
 {id:'sealed-scarab',kind:'giant',monsterId:'treasure-scarab',name:'아이템 드롭 · 봉인된 보물갑충',title:'봉인된 보물갑충',background:'/exploration/rooms/scarab-sealed-treasury.png',intro:['황금 궤짝처럼 웅크린 갑충이 봉인에 묶여 있다. 봉인을 건드리면 깨어날 것 같다.'],progress:['봉인에 금이 간다. 보물갑충의 푸른 눈에 빛이 돌아온다.']},
 {id:'sleeping-giant',kind:'giant',monsterId:'ancient-giant',name:'아이템 드롭 · 잠든 고대거인',title:'잠든 고대거인',background:'/exploration/rooms/giant-slumber-chamber.png',intro:['거대한 돌의 몸이 미동도 없이 잠들어 있다. 가까이 다가가 깨우거나, 조용히 지나갈 수 있다.'],progress:['거인의 눈이 푸르게 빛난다. 무거운 돌주먹이 천천히 들린다.']},
 {id:'boss-anubis',kind:'boss',monsterId:'obsidian-anubis',name:'중간보스 · 흑요석 아누비스',title:'흑요석 아누비스',background:'/exploration/shopkeepers/nefera-open-observatory.png',intro:['살아 있는 자여, 이 문을 넘을 자격을 증명하라.'],progress:['왕릉의 문이 닫혔다. 이 싸움에서 도망칠 수 없다.']},
 {id:'boss-pharaoh',kind:'boss',monsterId:'golden-pharaoh',name:'최종보스 · 황금왕 라세프',title:'황금왕 라세프',background:'/exploration/shopkeepers/zahir-open-vault.png',intro:['황금의 왕이 옥좌에서 일어선다. 왕릉의 마지막 문지기가 그대를 내려다본다.'],progress:['왕의 심판을 넘어야 왕릉을 벗어날 수 있다. 이 싸움에서는 도망칠 수 없다.']},
 {id:'sphinx',kind:'sphinx',name:'스핑크스 · 영혼의 수수께끼',title:'영혼의 수수께끼',background:bg('sphinx'),intro:['“답하지 못한다면, 네 영혼의 절반을 가져가겠다.” 스핑크스가 고요히 눈을 뜬다.'],progress:['“너의 답을 인정한다. 길을 열어 주겠다.”']},
 {id:'scales',kind:'scales',name:'저울 · 망자의 거래소',title:'망자의 거래소',background:bg('scales'),intro:['저울은 황금 대신, 네가 내려놓을 물건을 기다린다.'],progress:['저울이 천천히 균형을 되찾는다. 장비가 사라진 자리에 금화가 남았다.']},
] as const satisfies readonly RoomDefinition[]
export type AdventureRoomId=typeof adventureRooms[number]['id']
export const getAdventureRoom=(id:string)=>adventureRooms.find(room=>room.id===id)
export const sphinxTimeLimitSeconds=10
export const sphinxQuestions=[
  {
    "question": "아침에는 네 발, 낮에는 두 발, 저녁에는 세 발로 걷는 것은?",
    "answers": [
      "사람",
      "낙타",
      "풍뎅이"
    ],
    "correct": 0
  },
  {
    "question": "입이 없어도 말을 따라 하고, 몸이 없어도 골짜기에 사는 것은?",
    "answers": [
      "모래바람",
      "메아리",
      "그림자"
    ],
    "correct": 1
  },
  {
    "question": "늘 우리 앞에 있지만 아직 볼 수 없는 것은?",
    "answers": [
      "발자국",
      "과거",
      "미래"
    ],
    "correct": 2
  },
  {
    "question": "땅에서 흙을 꺼낼수록 점점 더 커지는 것은?",
    "answers": [
      "구덩이",
      "모래성",
      "항아리"
    ],
    "correct": 0
  },
  {
    "question": "다른 것을 말릴수록 자신은 점점 젖는 것은?",
    "answers": [
      "등불",
      "수건",
      "부채"
    ],
    "correct": 1
  },
  {
    "question": "이는 많지만 음식을 한 입도 먹지 못하는 것은?",
    "answers": [
      "코브라",
      "악어",
      "빗"
    ],
    "correct": 2
  },
  {
    "question": "눈이 하나 있지만 앞을 보지 못하고, 실을 데리고 다니는 것은?",
    "answers": [
      "바늘",
      "매",
      "열쇠"
    ],
    "correct": 0
  },
  {
    "question": "바다와 강이 있지만 물 한 방울 흐르지 않는 것은?",
    "answers": [
      "오아시스",
      "지도",
      "우물"
    ],
    "correct": 1
  },
  {
    "question": "목은 있지만 머리는 없고, 배 속에 물을 담는 것은?",
    "answers": [
      "낙타",
      "독수리",
      "병"
    ],
    "correct": 2
  },
  {
    "question": "빛이 있을 때 따라다니지만, 완전한 어둠에서는 사라지는 것은?",
    "answers": [
      "그림자",
      "발소리",
      "향기"
    ],
    "correct": 0
  },
  {
    "question": "누구에게나 흐르지만 손으로 붙잡거나 되돌릴 수 없는 것은?",
    "answers": [
      "모래",
      "시간",
      "강물"
    ],
    "correct": 1
  },
  {
    "question": "모래 위를 걸을수록 내 뒤에 더 많이 남는 것은?",
    "answers": [
      "별빛",
      "메아리",
      "발자국"
    ],
    "correct": 2
  },
  {
    "question": "줄 없이 서로를 묶고, 지키기도 깨뜨리기도 하는 말은?",
    "answers": [
      "약속",
      "노래",
      "질문"
    ],
    "correct": 0
  },
  {
    "question": "아무도 모를 때는 지킬 수 있지만, 모두에게 말하면 더는 아닌 것은?",
    "answers": [
      "보물",
      "비밀",
      "이야기"
    ],
    "correct": 1
  },
  {
    "question": "내 것이지만 나보다 다른 사람들이 더 자주 부르는 것은?",
    "answers": [
      "주문",
      "노래",
      "이름"
    ],
    "correct": 2
  },
  {
    "question": "나무를 먹으면 자라지만 물을 마시면 죽는 것은?",
    "answers": [
      "불",
      "꽃",
      "코브라"
    ],
    "correct": 0
  },
  {
    "question": "지나간 일을 마음속에 간직하고, 떠올리면 되살아나는 것은?",
    "answers": [
      "꿈",
      "기억",
      "미래"
    ],
    "correct": 1
  },
  {
    "question": "모습은 보이지 않지만 나뭇잎을 흔들고 모래를 날리는 것은?",
    "answers": [
      "돌",
      "햇빛",
      "바람"
    ],
    "correct": 2
  },
  {
    "question": "입은 없지만 이야기를 전하고, 펼쳐서 읽는 것은?",
    "answers": [
      "책",
      "칼",
      "방패"
    ],
    "correct": 0
  },
  {
    "question": "태어나는 순간부터 늘어나며, 해마다 한 살씩 더해지는 것은?",
    "answers": [
      "키",
      "나이",
      "그림자"
    ],
    "correct": 1
  }
] as const
export type RoomVisit={key:string;id:AdventureRoomId;entry:string;progress:string;outcome:{kind:'none'}|{kind:'gold';gold:number}|{kind:'loot';loot:RoomLoot}|{kind:'monster';monsterId:MonsterId;loot?:RoomLoot};hpLost:number;mpLost:number;stolen:{health:number;mana:number};question:typeof sphinxQuestions[number]}
const sample=<T,>(items:readonly T[],random:()=>number)=>items[Math.min(items.length-1,Math.floor(random()*items.length))]
export function createRoomVisit(id:AdventureRoomId,state:PracticeState,key=`${state.market.floor}:${id}`,random=Math.random,previousInscription?:string):RoomVisit{
 const room=getAdventureRoom(id)!,visit:RoomVisit={key,id,entry:sample(room.intro,random),progress:sample(room.kind==='lore'?room.progress.filter(text=>text!==previousInscription):room.progress,random),outcome:{kind:'none'},hpLost:0,mpLost:0,stolen:{health:0,mana:0},question:sample(sphinxQuestions,random)}
 if(room.kind==='curse'){visit.hpLost=Math.min(Math.max(0,state.hp-1),Math.floor(state.hp*.4));visit.mpLost=Math.floor(state.mp*.4)}
 if(room.kind==='thief'){
  const bag={...state.potions},count=Math.min(bag.health+bag.mana,random()<.5?1:2)
  for(let index=0;index<count;index++){const kind=random()*(bag.health+bag.mana)<bag.health?'health':'mana';bag[kind]--;visit.stolen[kind]++}
  if(!count)visit.entry='도둑은 빈 포션 주머니를 뒤지다 투덜거리며 물러선다.'
 }
 if(room.kind==='chest'||room.kind==='investigate'){
  if(random()<.5)visit.outcome=room.kind==='chest'?{kind:'gold',gold:state.mode==='practice'?campaignChestGold(state.market.floor,random):160+state.market.floor*8+Math.floor(random()*101)}:{kind:'loot',loot:drawInvestigationLoot(state,state.mode==='practice'?drawRewardTier(state.market.floor,random):state.market.floor>50?'advanced':'starter',random)}
  else visit.outcome={kind:'monster',monsterId:state.mode==='practice'?(room.kind==='chest'?drawFloorMonster(state.market.floor,random):drawInvestigationMonster(state.market.floor,random)):drawMonster(random).id,...(['investigate','chest'].includes(room.kind)?{loot:drawInvestigationLoot(state,state.mode==='practice'?drawRewardTier(state.market.floor,random):state.market.floor>50?'advanced':'starter',random)}:{})}
 }
 return visit
}
export function enterRoomVisit(state:PracticeState,visit:RoomVisit):PracticeState{
 if(state.roomVisitKey===visit.key)return state
 return {...state,roomVisitKey:visit.key,hp:state.hp-visit.hpLost,mp:state.mp-visit.mpLost,potions:{health:state.potions.health-visit.stolen.health,mana:state.potions.mana-visit.stolen.mana}}
}
export function restFully(state:PracticeState):PracticeState{return {...state,hp:playerMaxHp(state),mp:playerManaMax(state)}}
export function sphinxPenalty(state:PracticeState):PracticeState{return {...state,hp:Math.max(1,state.hp-Math.floor(state.hp*.5))}}
