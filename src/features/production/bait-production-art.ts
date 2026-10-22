// Facility artwork is shipped with the frontend, independently of bait icons returned by the RPC.
const artwork: Record<string, string> = {
  'fluffy-dough-bowl': '/bait-production/fluffy-dough-bowl-v1.png',
  'sweet-steam-basket': '/bait-production/sweet-steam-basket-v1.png',
  'scrap-magnet-bench': '/bait-production/scrap-magnet-bench-v1.png',
  'sea-memory-bottle': '/bait-production/sea-memory-bottle-v1.png',
  'wriggly-soil-box': '/bait-production/wriggly-soil-box-v1.png',
  'dew-incubator': '/bait-production/dew-incubator-v1.png',
  'overnight-soil-pot': '/bait-production/overnight-soil-pot-v1.png',
  'leisure-compost-garden': '/bait-production/leisure-compost-garden-v1.png',
  'wave-mill': '/bait-production/wave-mill-v1.png',
  'firefly-greenhouse': '/bait-production/firefly-greenhouse-v1.png',
  'dawn-coral-garden': '/bait-production/dawn-coral-garden-v1.png',
  'cloud-pearl-bottle': '/bait-production/cloud-pearl-bottle-v1.png',
  'lightning-condenser': '/bait-production/lightning-condenser-v1.png',
  'deep-sleep-room': '/bait-production/deep-sleep-room-v1.png',
}
export function baitProductionArt(site: {id: string; image_path: string}) {
  return artwork[site.id] ?? site.image_path
}
