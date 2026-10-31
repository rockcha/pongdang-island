import type {PracticeState} from './practice-state'
export type NameStoryAction='restore'|'leave-name'|'read-record'|'open-gate'|'claim'
export function canAppeaseNameGuardian(state:PracticeState){return state.nameStory?.choice==='restored'||state.nameStory?.recordRead===true}
export function progressNameStory(state:PracticeState,action:NameStoryAction):PracticeState{
 const story=state.nameStory??{}
 if(action==='restore'||action==='leave-name'){
  if(story.choice)return state
  return {...state,nameStory:{...story,choice:action==='restore'?'restored':'left',...(action==='restore'?{nameLearned:true}:{})}}
 }
 if(action==='read-record')return story.recordRead?state:{...state,nameStory:{...story,recordRead:true,nameLearned:true}}
 if(action==='open-gate')return !canAppeaseNameGuardian(state)||story.gateOpened?state:{...state,nameStory:{...story,met:true,nameLearned:true,gateOpened:true}}
 return !story.gateOpened||story.rewardClaimed?state:{...state,nameStory:{...story,rewardClaimed:true}}
}
export function nameStoryGreeting(state:PracticeState){
 if(state.nameStory?.choice==='restored')return '흑청동 갑옷의 수문장이 당신을 보자 대검을 쥔 손에서 힘을 푼다. “돌벽에 내 이름을 돌려놓은 자가… 너였구나. 나는 𓋴𓈖𓅱. 이제야 나를 기억한다.”'
 if(state.nameStory?.recordRead)return '“내가 누구였는지… 아는가?” 거대한 대검을 짚은 왕실 수문장이 묻는다. 왕의 기록에서 읽은 이름, 𓋴𓈖𓅱가 떠오른다.'
 return '거대한 흑청동 갑옷의 수문장이 대검을 치켜든다. “이름도 모르는 침입자여. 이 문은 넘을 수 없다.” 지워진 이름을 돌려줄 기억이 없다. 수문장이 길을 막고 달려든다.'
}
