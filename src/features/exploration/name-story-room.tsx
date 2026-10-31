import {useRef,useState} from 'react'
import {Feather} from 'lucide-react'
import {ChoiceLog} from './choice-log'
import {drawRoomLoot,type RoomLoot} from './room-loot'
import {nextRoomLabel} from './run-state'
import {canAppeaseNameGuardian,nameStoryGreeting,progressNameStory,type NameStoryAction} from './name-story'
import type {MonsterId} from './monster-catalog'
import type {PracticeState} from './practice-state'
import type {RoomVisit} from './adventure-rooms'

export function NameStoryRoom({visit,state,onChange,onTalk,onDescend,onLoot,onEncounter}:{visit:RoomVisit;state:PracticeState;onChange:React.Dispatch<React.SetStateAction<PracticeState>>;onTalk:(text:string)=>void;onDescend:()=>void;onLoot:(loot:RoomLoot)=>void;onEncounter:(id:MonsterId)=>void}){
 const [line,setLine]=useState(''),[finished,setFinished]=useState(false),[topic,setTopic]=useState(false)
 const story=state.nameStory??{},guardian=visit.id==='nameless-guardian',record=visit.id==='erased-name-record'
 const title=guardian?'이름 없는 왕실 수문장':record?'왕이 지운 기록':'지워진 이름'
 const remembered=story.choice==='restored'||!!story.gateOpened
 const peaceful=canAppeaseNameGuardian(state),challengeStarted=useRef(false)
 function fight(){if(challengeStarted.current||peaceful||story.gateOpened||story.rewardClaimed)return;challengeStarted.current=true;onTalk('수문장이 대검을 뽑아 길을 가로막는다. 그가 지키던 문을 넘으려면 싸워야 한다.');onEncounter('nameless-royal-warden')}
 const initial=guardian?nameStoryGreeting(state):record?'봉인된 기록에 이런 문장이 남아 있다. “왕은 반역자의 육신보다 이름을 먼저 지웠다.” 나머지 글은 먼지에 가려져 있다.':'벽에는 수많은 이름이 새겨져 있다. 그중 하나만 칼로 집요하게 긁혀 있다. 바닥의 돌조각으로 희미한 글자를 이을 수 있을 것 같다.'
 function act(action:NameStoryAction,text:string,done=true){onChange(previous=>progressNameStory(previous,action));setLine(text);onTalk(text);setFinished(done)}
 function claim(){
  if(story.rewardClaimed||!story.gateOpened)return
  const loot=drawRoomLoot(state,'advanced')
  act('claim','문 뒤에는 𓋴𓈖𓅱가 지키던 유품이 남아 있다. “왕을 위해서가 아니라, 나를 기억해 준 너에게 맡긴다.”')
  onLoot(loot)
 }
 const complete=finished||(!guardian&&!!(record?story.recordRead:story.choice))||guardian&&!!story.rewardClaimed
 return <section className={`exploration-adventure-room exploration-name-story ${guardian?'is-story-guardian':''}`} aria-label={`탐험 방 · ${title}`}>
  {guardian?<div className={`exploration-story-guardian${remembered?' is-awakened':''}${story.gateOpened?' is-gate-open':''}`}><div className="exploration-royal-warden"><img src="/exploration/npcs/nameless-royal-warden.png" alt={remembered?'왕실 수문장 𓋴𓈖𓅱':'이름 없는 왕실 수문장'}/><span className="exploration-royal-warden-name" aria-hidden="true">𓋴𓈖𓅱</span></div></div>:<div className="exploration-story-inscription" aria-hidden="true">{!record&&<Feather size={48} strokeWidth={1}/>}<span>{story.choice==='restored'||record&&story.recordRead?'𓋴𓈖𓅱':'𓋴 — 𓅱'}</span></div>}
  <div className="exploration-room-panel"><div className="exploration-npc-dialogue"><h2>{title}</h2><ChoiceLog text={line||initial} speaker={guardian?'수문장':title} label="방 진행" className="exploration-room-dialogue"/></div>
  {complete?<button className="exploration-room-next" onClick={onDescend}>{nextRoomLabel(state)}</button>:<div className="exploration-room-decisions">
   {!guardian&&!record?<><button onClick={()=>act('restore','마지막 획을 잇자, 벽 안쪽에서 모래가 조금 흘러내렸다. 손끝에 남은 이름은 ‘𓋴𓈖𓅱’. 아무 일도 일어나지 않았다.')}>지워진 이름을 다시 새긴다</button><button className="is-secondary" onClick={()=>act('leave-name','돌조각을 내려놓았다. 지워진 이름은 그대로 남겨 두기로 했다.')}>남의 무덤에 손대지 않는다</button></>:record?<><button onClick={()=>act('read-record','“𓋴𓈖𓅱. 왕의 부당한 명령을 거부한 왕실 수문장. 이름을 빼앗긴 자는 죽어서도 자신의 문을 떠날 수 없었다.” '+(story.choice==='restored'?'그때 돌벽에 되새겼던 이름이다.':story.choice==='left'?'그때 지나쳤던 이름이 떠오른다.':'기억해 두는 것이 좋겠다.'))}>먼지를 털고 기록을 읽는다</button><button className="is-secondary" onClick={onDescend}>그냥 지나간다</button></>:story.gateOpened?<><button onClick={claim}>열린 문 안을 살펴본다</button><button className="is-secondary" onClick={onDescend}>유품을 남겨두고 떠난다</button></>:peaceful?<><button onClick={()=>act('open-gate',story.choice==='restored'?'“내 이름을 돌려준 네게는 숨길 문이 없다.” 가슴의 명패에 𓋴𓈖𓅱가 금빛으로 되살아난다. 수문장은 대검을 곁으로 옮기고 무거운 석문을 밀어 열었다.':'“𓋴𓈖𓅱… 그래. 그것이 내 이름이었다.” 가슴의 지워진 명패가 금빛으로 빛난다. 수문장이 대검을 내려 길을 비키자 그가 지키던 석문이 열렸다.',false)}>{story.choice==='restored'?'그가 지키던 문에 대해 묻는다':'벽에 새겨진 이름을 불러준다'}</button><button className="is-secondary" onClick={()=>{setLine('“왕은 무덤을 지키라 했지만, 나는 돌아오지 못한 이들을 기다렸다. 내 이름을 기억해 다오.”');onTalk('𓋴𓈖𓅱는 마지막으로 자신의 이름을 기억해 달라고 부탁했다.');setTopic(true)}}>{topic?'그의 말을 다시 듣는다':'그의 마지막 부탁을 듣는다'}</button></>:<button onClick={fight}>수문장과 싸운다</button>}
  </div>}</div>
 </section>
}
