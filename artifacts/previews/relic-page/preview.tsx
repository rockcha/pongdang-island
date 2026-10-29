import {useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {RelicCatalogTabs} from '/src/features/relics/relic-catalog-tabs'
import {RelicEquipmentSlot} from '/src/features/relics/relic-equipment-slot'
import {RelicCraftingGuide} from '/src/features/relics/relic-crafting-guide'
import catalog from '/supabase/catalog/catalog.json'
import '/src/index.css'
import '/src/features/relics/relics.css'
function Preview(){
 const list=useRef(null),[equipped,setEquipped]=useState('instant-fishing-hook')
 const ids=['instant-fishing-hook','current-piercing-needle','eternal-water-clock','shell-hourglass','fish-calling-bell']
 const relics=ids.map((id,i)=>({...catalog.fishing_relics.find(r=>r.id===id)!,owned:true,discovered:true,quantity:[1,3,2,4,1][i]}))
 const state={equippedId:equipped,changeFee:500,equipFee:0,unequipFee:500,relics}
 return <main className="mx-auto flex h-dvh max-w-lg flex-col gap-4 bg-background p-5"><header className="flex shrink-0 items-center justify-between border-b border-border/50 pb-3"><span className="text-sm font-semibold">유물</span><span className="text-xs text-muted-foreground">미리보기</span></header><RelicEquipmentSlot relic={relics.find(r=>r.id===equipped)} disabled={false} canChoose onChoose={()=>list.current?.querySelector('button')?.focus()} onUnequip={()=>setEquipped('')}/><RelicCraftingGuide/><RelicCatalogTabs state={state} disabled={false} listRef={list} onOpenCatalog={()=>{}} onEquip={r=>setEquipped(r.id)} onSell={()=>{}}/></main>
}
createRoot(document.getElementById('root')!).render(<Preview/>)
