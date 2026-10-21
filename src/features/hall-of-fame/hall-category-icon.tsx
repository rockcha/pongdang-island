import {funCategories, hallCategories, type HallCategory} from './categories'

export function HallTabIcon({kind}: {kind: 'honor' | 'fun'}) {
  return <span aria-hidden="true" className="size-9 shrink-0 bg-no-repeat" style={{
    backgroundImage: 'url(/hall-icons/honor-records.png)',
    backgroundSize: '400% 400%',
    backgroundPosition: `${kind === 'honor' ? 200 / 3 : 100}% 100%`,
  }}/>
}

export function HallCategoryIcon({category}: {category: HallCategory}) {
  const index = funCategories.findIndex(item => item.id === category.id)
  const honorIndex = hallCategories.findIndex(item => item.id === category.id)
  const cell = index < 0 ? honorIndex : index
  const columns = index < 0 ? 4 : 5
  const rows = index < 0 ? 4 : 2
  return <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/5">
    <span className="size-11 bg-no-repeat" style={{
      backgroundImage: `url(/hall-icons/${index < 0 ? 'honor' : 'fun'}-records.png)`,
      backgroundSize: `${columns * 100}% ${rows * 100}%`,
      backgroundPosition: `${cell % columns * 100 / (columns - 1)}% ${Math.floor(cell / columns) * 100 / (rows - 1)}%`,
    }}/>
  </span>
}
