import type {PracticeState} from './practice-state'

// Missing profiles belong to the original 50-floor campaign and remain resumable.
export const campaignFinalFloor=(state:Pick<PracticeState,'campaignFinalFloor'>)=>state.campaignFinalFloor??50
export const campaignFinalBoss=(state:Pick<PracticeState,'campaignFinalFloor'>)=>campaignFinalFloor(state)===80?'black-sun-aker' as const:'golden-pharaoh' as const
export const campaignFinalRoom=(state:Pick<PracticeState,'campaignFinalFloor'>)=>campaignFinalFloor(state)===80?'boss-golden-mask' as const:'boss-pharaoh' as const
export const campaignBossFloors={20:'boss-anubis',30:'boss-anubis',40:'boss-anubis',50:'boss-pharaoh',65:'boss-maaken',80:'boss-golden-mask'} as const
