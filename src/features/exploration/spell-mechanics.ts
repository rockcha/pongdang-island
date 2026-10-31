import type {EnemyAilment} from './ailments'
export type SpellMechanics={damage?:number;healing?:number;guard?:number;stun?:boolean;cleanse?:boolean;shield?:{remaining:number;turns:number};attackBuff?:{attack:number;critical:number;turns:number};ailment?:EnemyAilment&{chance:number}}
export const spellMechanics:Record<string,SpellMechanics>={
 'sandstone-bolt':{damage:26},
 'ember-brand':{damage:18,ailment:{kind:'burn',amount:40,turns:2,chance:50}},
 'crimson-shards':{damage:34,ailment:{kind:'bleed',amount:3,turns:3,chance:70}},
 'binding-chain':{damage:24,ailment:{kind:'weaken',amount:4,turns:2,chance:100}},
 'glacial-crown':{damage:76,ailment:{kind:'freeze',amount:1,turns:1,chance:40}},
 ember:{damage:20},tide:{guard:8},light:{healing:18},sand:{damage:12,stun:true},
 'compressed-water-bolt':{damage:22},
 'sand-thorns':{damage:16,ailment:{kind:'blind',amount:15,turns:2,chance:25}},
 'tomb-curse':{ailment:{kind:'weaken',amount:6,turns:3,chance:100}},
 'bronze-ward':{shield:{remaining:25,turns:3}},
 'solar-lance':{damage:50},
 'frost-wave':{damage:34,ailment:{kind:'freeze',amount:1,turns:1,chance:35}},
 'oasis-breath':{healing:40},'purifying-spring':{cleanse:true},
 'sun-god-glare':{ailment:{kind:'blind',amount:60,turns:3,chance:100}},
 'sun-kings-majesty':{attackBuff:{attack:20,critical:15,turns:4}},
 'judgment-of-ra':{damage:110},
 'black-sandstorm':{damage:80,ailment:{kind:'blind',amount:40,turns:3,chance:100}},
}
