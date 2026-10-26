export const destinationArt = {
  '/profile': 'home',
  '/island-news': 'newsstand',
  '/development-fund': 'fund',
  '/production-shop': 'fuel-stall',
  '/bait-production-shop': 'bait-stall',
  '/fishing': 'fishing-spot',
  '/decoration-shop': 'aquascape-stall',
  '/item-shop': 'supply-cart',
  '/expeditions': 'trap-rack',
  '/farm': 'garden',
  '/exchange': 'market',
  '/merchant-orders': 'merchant-desk',
  '/hall-of-fame': 'podium',
  '/showcase': 'gallery',
  '/square/sponsorship': 'gift-table',
  '/square/begging': 'letter-tree',
  '/square/suggestions': 'idea-box',
  '/square/bugs': 'repair-bench',
} as const
export type DestinationArt = (typeof destinationArt)[keyof typeof destinationArt]
export function destinationArtwork(path: string) {
  return destinationArt[path as keyof typeof destinationArt]
}
