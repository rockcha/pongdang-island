import React from 'react'
import {createRoot} from 'react-dom/client'
import {CollectionBook} from '../../src/features/collection/collection-dialog'
import '../../src/index.css'

// The browser verifier intercepts collection/map RPCs with isolated fixtures.
// This preview never authenticates, starts fishing or writes player data.
document.body.style.margin='0'
createRoot(document.getElementById('root')!).render(<main className="mx-auto flex h-dvh max-w-[390px] flex-col overflow-hidden"><h1 className="shrink-0 border-b px-4 py-3 text-sm">도감 분류 미리보기</h1><CollectionBook onAddTemporary={()=>{}}/></main>)
