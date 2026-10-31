export type SpellShape='fire'|'drop'|'stone'|'thorns'|'rune'|'lance'|'snow'|'shards'|'chain'|'crown'|'storm'|'sun'|'shield'|'leaf'
type Visual={color:string;accent:string;shape:SpellShape;size:number;count:number;target:'enemy'|'self'}
const enemy=(color:string,accent:string,shape:SpellShape,size:number,count=1):Visual=>({color,accent,shape,size,count,target:'enemy'})
const self=(color:string,accent:string,shape:SpellShape,size:number):Visual=>({color,accent,shape,size,count:1,target:'self'})
export const spellVisuals:Record<string,Visual>={
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
