import {createLucideIcon} from 'lucide-react'

export const RouletteIcon=createLucideIcon('Roulette',[
 ['circle',{cx:12,cy:13,r:9,key:'rim'}],
 ['path',{d:'m10 2 2 4 2-4Z',fill:'currentColor',strokeWidth:1,key:'pointer'}],
 ['path',{d:'M12 15v7M10.3 14l-6.1 3.5M10.3 12 4.2 8.5M13.7 12l6.1-3.5M13.7 14l6.1 3.5',key:'sectors'}],
 ['circle',{cx:12,cy:13,r:2,key:'hub'}],
])
