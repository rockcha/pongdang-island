const supporterHonors = [
  { emoji: '👑', title: '퐁당섬 대주주' },
  { emoji: '💎', title: '퐁당섬 명예이사' },
  { emoji: '🏛️', title: '퐁당섬 수석고문' },
  { emoji: '⚓', title: '퐁당섬 운영위원' },
  { emoji: '🧭', title: '퐁당섬 개척단장' },
  { emoji: '🌟', title: '퐁당섬 특별고문' },
  { emoji: '🐚', title: '퐁당섬 명예위원' },
  { emoji: '🦀', title: '퐁당섬 발전위원' },
  { emoji: '🐟', title: '퐁당섬 협력위원' },
  { emoji: '🪙', title: '퐁당섬 명예주주' },
] as const
// The server assigns the same tier to equal public, confirmed cumulative amounts.
export const supporterHonor = (tier: number) =>
  supporterHonors[tier - 1] ?? { emoji: '💛', title: '퐁당섬 숨은 공신' }
