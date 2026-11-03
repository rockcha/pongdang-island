/** Only new runs receive this marker. Missing markers always retain legacy rules. */
export const explorationBalanceVersion=2 as const
export type BalanceProfile={balanceVersion?:2}
export function usesCurrentBalance(state?:BalanceProfile){return state?.balanceVersion===explorationBalanceVersion}
