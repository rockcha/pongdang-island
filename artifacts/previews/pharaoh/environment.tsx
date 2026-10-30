import {createRoot} from 'react-dom/client'
import '@/index.css'
import {FishingStandby} from '@/features/fishing/fishing-environment'
import {MapPieceProgress} from '@/features/regions/map-piece-progress'
import {RodShopArtwork} from '@/features/fishing/rod-shop-artwork'
import {fishingRods} from '@/features/fishing/fishing-rods'
import type {Region} from '@/features/regions/api'
const region={id:'pharaoh',name:'파라오의 황금해',map_image_path:'/regions/pharaoh/map-v1.png',mapPieceCount:4,mapPieceRarities:['rare','rare','epic','epic'],mapPieces:[1,3],unlocked:false} as Region
createRoot(document.getElementById('root')!).render(<main style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",maxWidth:900,margin:"auto",padding:20,gap:24}} className="mx-auto grid max-w-4xl gap-6 p-5 md:grid-cols-2"><section><h1 className="mb-3 flex items-center gap-2 text-xl"><img src="/region-icons/pharaoh-v1.png" alt="" className="size-12"/>파라오의 황금해</h1><div style={{height:570,position:"relative",overflow:"hidden",borderRadius:24}} className="relative h-[570px] overflow-hidden rounded-3xl"><FishingStandby regionId="pharaoh"/></div></section><section className="rounded-3xl border bg-card p-5"><h2 className="text-lg">황금해의 지도</h2><MapPieceProgress region={region}/><div className="my-5 border-t"/><h2 className="text-lg">황금 태양 낚싯대</h2><RodShopArtwork rod={fishingRods.find(r=>r.id==='pharaoh')!} className="mx-auto size-64"/><p className="text-center text-sm text-muted-foreground">🪙 1,800</p></section></main>)
