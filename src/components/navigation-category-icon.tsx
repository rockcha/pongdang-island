const categories = new Set(['home', 'sea', 'production', 'market', 'collection', 'news', 'community'])

export function NavigationCategoryIcon({ category, className }: { category: string; className?: string }) {
  const name = category === 'home' ? 'island' : category === 'sea' ? 'hook' : category === 'production' ? 'still' : categories.has(category) ? category : 'island'
  return <img aria-hidden="true" alt="" src={`/navigation-icons/orange-v1/${name}.png`} width={128} height={128} decoding="async" draggable={false} className={`${className ?? ''} object-contain`} />
}
