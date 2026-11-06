import type {FarmAnimal} from './animal-catalog'
import artwork from './animal-idle-art.json'
import './animal-idle.css'

export function FarmAnimalIdle({kind,phase=0}:{kind:FarmAnimal;phase?:number}){
 const art=artwork[kind]
 return <svg viewBox={art.viewBox} aria-hidden="true" data-animal-idle={kind}><svg width="512" height="512" viewBox="0 0 512 512" overflow="hidden"><image className="farm-animal-idle-frame" href={art.path} width="1024" height="1024" style={{animationDelay:`${-phase*.37}s`}}/></svg></svg>
}
