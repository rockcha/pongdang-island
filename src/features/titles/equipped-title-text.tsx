import titleNames from './title-name-tiers.json'
import {titleTiers,type TitleTier} from './title-tier'

// Profiles carry the title name. Use a small generated index, without loading
// the full game catalog or requesting each friend's private achievements.
export function EquippedTitleText({name,className=''}:{name:string;className?:string}){
 const tier=(Object.hasOwn(titleNames,name)?(titleNames as Record<string,number>)[name]:undefined) as TitleTier|undefined
 return <span className={`min-w-0 truncate ${tier?titleTiers[tier].text:'text-muted-foreground'} ${className}`}>{name}</span>
}
