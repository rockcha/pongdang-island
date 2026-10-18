import {randomId} from '@/lib/random-id'
import { memoryFaces, type MemoryAction, type MemoryRun, type MemoryState } from './memory-api'
export function createMemoryPractice(){
 let run:MemoryRun|null=null,deck:string[]=[]
 function response():MemoryState{
  if(!run)return {serverNow:new Date().toISOString(),run:null}
  return {serverNow:new Date().toISOString(),run:{...run,elapsedMs:run.finished?run.elapsedMs:run.startedAt?Date.now()-Date.parse(run.startedAt):0,cards:deck.map((face,i)=>i===12||run!.matched.includes(i+1)||run!.first===i+1||run!.second===i+1?face:null)}}
 }
 return (action:MemoryAction):MemoryState=>{
  if(action.p_action==='start'){
   deck=[...memoryFaces,...memoryFaces];for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}deck.splice(12,0,'pongi')
   run={id:randomId(),cards:[],matched:[],first:null,second:null,clearAt:null,startedAt:null,elapsedMs:0,moves:0,finished:false,abandoned:false}
  }else if(action.p_action==='leave'){run=null}
  else if(run&&!run.finished){
   if(action.p_action==='clear'&&run.clearAt&&Date.now()>=Date.parse(run.clearAt)){run={...run,first:null,second:null,clearAt:null}}
   const card=action.p_card
   if(action.p_action==='flip'&&card&&card>=1&&card<=25&&card!==13&&!run.matched.includes(card)&&run.first!==card&&run.second===null){
    run.startedAt??=new Date().toISOString()
    if(run.first===null)run.first=card
    else{
     run.moves++
     if(deck[run.first-1]===deck[card-1]){run.matched=[...run.matched,run.first,card];run.first=null;if(run.matched.length===24){run.finished=true;run.elapsedMs=Date.now()-Date.parse(run.startedAt)}}
     else{run.second=card;run.clearAt=new Date(Date.now()+900).toISOString()}
    }
   }
  }
  return response()
 }
}
