import React from 'react'
import {createRoot} from 'react-dom/client'
import {AquariumBackgroundDialog} from '@/features/aquarium/aquarium-background-dialog'
import type {AquariumState} from '@/features/aquarium/api'
import catalog from '../../supabase/catalog/catalog.json'
import '@/index.css'
import AquariumLabPage from '@/features/aquarium/aquarium-lab-page'
const params=new URLSearchParams(location.search),halloween=params.get('collection')==='halloween',pharaoh=params.get('collection')==='pharaoh'
const ids=['halloween-pumpkin-teahouse','halloween-ghost-glasshouse','halloween-witch-lavender-room']
const state={owned:[],catalog:catalog.aquarium_backgrounds.filter(theme=>pharaoh?['pharaoh-sleeping-pyramid-court','pharaoh-sunken-sun-tomb'].includes(theme.id):halloween?ids.includes(theme.id):theme.id.startsWith('fairy-'))} as AquariumState
createRoot(document.getElementById('root')!).render(params.get('view')==='tank'?<AquariumLabPage/>:<main style={{maxWidth:480,margin:'auto',padding:24}}><h1 className="mb-5 text-lg">{pharaoh?'황금해 어항 배경':halloween?'할로윈 어항 배경':'요정 어항 배경'}</h1><AquariumBackgroundDialog state={state} selectedId="default" gold={10000} busy={false} loading={false} error={false} onAct={async()=>{throw new Error('미리보기에서는 실제 구매를 실행하지 않아요.')}}/></main>)
