import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {BaitShop} from '../../src/features/fishing/bait-shop'
import {ProductionShopFilters,initialShopFilters} from '../../src/features/production/shop-filters'
import '../../src/index.css'

function Preview(){
 const [filter,setFilter]=useState(initialShopFilters)
 const production=new URLSearchParams(location.search).has('production')
 return <main className="mx-auto flex h-dvh max-w-xl flex-col overflow-hidden bg-background"><header className="shrink-0 border-b px-4 py-5 text-base text-primary">{production?'생산시설 상점':'미끼 상점'}</header><div data-shop-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{production?<div className="px-3"><ProductionShopFilters value={filter} onChange={setFilter}/><p className="mt-4 text-xs text-muted-foreground">{filter.sort}</p></div>:<BaitShop/>}</div></main>
}
createRoot(document.getElementById('root')!).render(<Preview/>)
