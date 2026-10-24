// Display filters only. Acquisition windows must be enforced separately on the server.
// The reserved prefix also connects future catalog entries to the server window.
export const limitedCollectionEvents: { value: string; label: string; speciesIds: string[]; speciesPrefix: string; iconPath:string }[] = [
  { value: 'halloween_2026', label: '할로윈', speciesIds: [], speciesPrefix: 'halloween-', iconPath:'/collection-icons/halloween.svg' },
]
export function limitedCollectionEvent(speciesId:string){return limitedCollectionEvents.find(event=>event.speciesIds.includes(speciesId)||speciesId.startsWith(event.speciesPrefix))}
