import {useFishingAudio} from '@/features/fishing/fishing-audio'

export function AquariumAmbience(){
 useFishingAudio('/sounds/aquarium-ambience.mp3',true,{loop:true,volume:.25})
 return null
}
