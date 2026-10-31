import type extraGlyphs from './spell-glyphs.json'
export type SpellShape=keyof typeof extraGlyphs|'fire'|'drop'|'stone'|'thorns'|'rune'|'lance'|'snow'|'shards'|'chain'|'crown'|'storm'|'sun'|'shield'|'leaf'
type Visual={color:string;accent:string;shape:SpellShape;size:number;count:number;target:'enemy'|'self';aura?:'shield'|'leaf'}
const enemy=(color:string,accent:string,shape:SpellShape,size:number,count=1):Visual=>({color,accent,shape,size,count,target:'enemy'})
const self=(color:string,accent:string,shape:SpellShape,size:number):Visual=>({color,accent,shape,size,count:1,target:'self'})
export const spellVisuals:Record<string,Visual>={
 'silver-crescent':{"shape":"crescent","color":"#b9d5f2","accent":"#f3f7ff","size":62,"count":1,"target":"enemy","aura":"shield"},
 'sand-swallow-feather':{"shape":"feather","color":"#e5c18b","accent":"#fff3d2","size":66,"count":1,"target":"self"},
 'little-lotus':{"shape":"lotus","color":"#a4dfbf","accent":"#fff1e8","size":70,"count":1,"target":"self"},
 'blood-moon-drain':{"shape":"bloodmoon","color":"#dd7c98","accent":"#ffe2c9","size":72,"count":2,"target":"enemy","aura":"leaf"},
 'crystal-petals':{"shape":"petals","color":"#b9a6ee","accent":"#eaffff","size":82,"count":1,"target":"self"},
 'dune-slumber':{"shape":"dunes","color":"#d0c19d","accent":"#caf2f5","size":66,"count":3,"target":"enemy"},
 'eclipse-serpent':{"shape":"serpent","color":"#aa7ac9","accent":"#ffd88b","size":106,"count":1,"target":"enemy"},
 'phoenix-breath':{"shape":"phoenix","color":"#ffae71","accent":"#fff6b8","size":112,"count":1,"target":"self"},
 'stellar-tomb-seal':{"shape":"obelisk","color":"#7eafd9","accent":"#f8e5ab","size":110,"count":3,"target":"enemy","aura":"shield"},
 ember:enemy('#ff9f4b','#fff0a0','fire',48),
 tide:self('#7bcbdc','#e2fcff','drop',65),
 light:self('#d5e9a0','#fff7c0','sun',60),
 sand:enemy('#d8b172','#f6e5b4','storm',65,3),
 'compressed-water-bolt':enemy('#5ccef1','#e1fbff','drop',58),
 'sand-thorns':enemy('#cba56b','#ffe1a0','thorns',48,3),
 'tomb-curse':enemy('#b893de','#e8cba5','rune',70),
 'solar-lance':enemy('#ffd36a','#fffbd5','lance',86),
 'frost-wave':enemy('#86d8ee','#efffff','snow',58,3),
 'oasis-breath':self('#8ed9b6','#d8fff1','leaf',76),
 'purifying-spring':self('#b4eee3','#ffffff','rune',72),
 'sun-god-glare':enemy('#ffeaa0','#ffffff','sun',88),
 'sun-kings-majesty':self('#e3b556','#fff2b8','crown',90),
 'judgment-of-ra':enemy('#ffbd5b','#fff8c2','sun',104),
 'black-sandstorm':enemy('#9d83c4','#e7cfa0','storm',100,3),
 'sandstone-bolt':enemy('#c49b63','#ffe3aa','stone',60),
 'ember-brand':enemy('#f08059','#ffd794','rune',64),
 'crimson-shards':enemy('#e16c77','#ffd6c8','shards',52,3),
 'binding-chain':enemy('#a998c5','#e7d3a5','chain',76),
 'glacial-crown':enemy('#79cce8','#f1ffff','crown',88,3),
}
