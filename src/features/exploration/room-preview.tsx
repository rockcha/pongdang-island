import {useState} from 'react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'

export const roomTypes=[
 {id:'monster',name:'몬스터 방',mark:'⚔',title:'왕릉의 수호자',text:'붕대를 두른 수호자가 어둠 속에서 길을 막아섭니다.',actions:['전투 · 준비 중','도망 · 성공률 35%'],note:'처치하거나 도망에 성공하면 한 층 더 내려갑니다.'},
 {id:'merchant',name:'상인 방',mark:'⚖',title:'모래길의 상인',text:'“여기까지 오다니, 운이 좋은 손님이군.” 작은 등불 아래 상인이 보따리를 펼칩니다.',actions:['물품 살펴보기','지나가기'],note:'골드로 장비와 소모품을 구매하는 방입니다.'},
 {id:'quiz',name:'퀴즈 방',mark:'𓃭',title:'스핑크스의 수수께끼',text:'“아침에는 네 발, 낮에는 두 발, 저녁에는 세 발로 걷는 것은?” 스핑크스가 답을 기다립니다.',actions:['사람','낙타','풍뎅이'],note:'황금해의 출제자는 스핑크스입니다. 오답 시 체력 30 피해.'},
 {id:'treasure-monster',name:'보물 몬스터 방',mark:'◈',title:'황금 풍뎅이',text:'보석을 등에 짊어진 풍뎅이가 금화를 흘리며 달아나려 합니다.',actions:['붙잡기 · 전투 준비 중','도망 · 성공률 35%'],note:'처치하면 아이템과 골드를 얻습니다. 도망에 성공하면 보상 없이 다음 층으로 갑니다.'},
 {id:'investigate',name:'조사 방',mark:'𓊭',title:'오래된 관',text:'먼지 쌓인 관의 뚜껑이 조금 열려 있습니다. 틈 사이로 희미한 금빛이 새어 나옵니다.',actions:['조사한다','무시하고 내려간다'],note:'조사하면 몬스터가 나타나거나 골드·아이템을 발견할 수 있습니다.'},
 {id:'save',name:'저장 방',mark:'☥',title:'기억의 석실',text:'고요한 석실 한가운데, 당신의 발자취를 새길 석판이 놓여 있습니다.',actions:['저장 · 준비 중','지나가기'],note:'탐험 상황을 저장하는 방입니다. 저장 기능은 아직 제공하지 않습니다.'},
 {id:'rest',name:'휴식 방',mark:'☾',title:'지하의 오아시스',text:'잔잔한 샘물과 부드러운 바람. 잠시 경계를 풀고 숨을 고를 수 있을 것 같습니다.',actions:['체력 회복','마나 회복','그냥 지나가기'],note:'회복량은 추후 조정합니다. 여기서는 선택 분위기만 확인합니다.'},
 {id:'curse',name:'저주 방',mark:'𓂀',title:'그림자의 제단',text:'“네 생명의 절반을 바쳐라. 다음 위기에서는 그림자가 너를 숨겨 주리라.”',actions:['체력 절반을 바친다','거절한다'],note:'현재 체력의 절반을 지불하면 다음 도망 시도 1회에 성공률 +50%p: 35% → 85%.'},
 {id:'magic',name:'마법 수련 방',mark:'✧',title:'별빛의 서고',text:'황금 문자들이 공중을 떠다닙니다. 오래된 마법의 지식을 배울 수 있을 것 같습니다.',actions:['새 마법 배우기','장착 마법 수련','지나가기'],note:'마법 습득·강화의 선택을 시험하는 방입니다. 상세 효과는 추후 결정합니다.'},
] as const
export type RoomTypeId=typeof roomTypes[number]['id']

export function RoomPreview({type,onClose}:{type:RoomTypeId|null;onClose:()=>void}){
 const [feedback,setFeedback]=useState('')
 const room=roomTypes.find(room=>room.id===type)
 return <Dialog open={!!room} onOpenChange={open=>{if(!open){setFeedback('');onClose()}}}><DialogContent className="exploration-room-preview"><DialogHeader><DialogTitle>{room?.name} · 미리보기</DialogTitle><DialogDescription>임시 체험 · 체력, 골드, 아이템과 층수는 바뀌지 않아요.</DialogDescription></DialogHeader>{room&&<><div className="exploration-room-mark" aria-hidden="true">{room.mark}</div><h3>{room.title}</h3><p>{room.text}</p><div className="exploration-room-actions">{room.actions.map(action=><button key={action} disabled={action.includes('준비 중')} onClick={()=>setFeedback(`‘${action}’ 선택 · 실제 효과는 아직 연결하지 않았어요.`)}>{action}</button>)}</div><small>{room.note}</small>{feedback&&<p role="status">{feedback}</p>}<button className="exploration-room-return" onClick={()=>{setFeedback('');onClose()}}>문 앞으로 돌아가기</button></>}</DialogContent></Dialog>
}
