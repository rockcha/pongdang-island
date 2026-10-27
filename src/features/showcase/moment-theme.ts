import type {Species} from '@/features/collection/api'

export function catchMomentTheme(species:Pick<Species,'id'|'native_region_id'>,regionName?:string){
 const paper=species.native_region_id==='mukhyang'||species.id.startsWith('muk-')||regionName==='묵향 해역'
 return paper
  ?{paper,background:'#f5eedf',text:'#303b36',muted:'#536259',metadata:'#68756a',glowAlpha:'22',glowEnd:'#f5eedf00'}
  :{paper,background:'#101b2a',text:'#ffffff',muted:'#ffffffbf',metadata:'#ffffff80',glowAlpha:'65',glowEnd:'#101b2a00'}
}
