import type {ComponentProps,ReactNode} from 'react'
import {memo} from 'react'

const charms:Record<string,ReactNode>={
 plunder:<image href="/region-icons/plunder-v1.png" x="1" y="1" width="22" height="22" preserveAspectRatio="xMidYMid meet"/>,
 swift:<><path d="m3 16 7-5-1-7 6 6 7-2-6 6-1 7-4-5-8 2Z" fill="#e8c981" stroke="#26364f" strokeWidth="1.2"/><path d="m7 17 7-6" stroke="#fff2d7" strokeWidth="1.5" strokeLinecap="round"/></>,
 nyamnyam:<><rect x="3" y="8" width="18" height="12" rx="5" fill="#fff0d5"/><path d="M3 11Q3 4 12 4t9 7Z" fill="#ed9975"/><path d="m7 5 3 6m3-7 3 7" stroke="#ffe3c3" strokeWidth="1.5"/><path d="M10 5h4v15h-4Z" fill="#435c3b"/></>,
 basic:<><path d="M12 2v5" stroke="#e7d6b6"/><path d="M12 6c-5 0-6 7-5 11h10c1-4 0-11-5-11Z" fill="#ef765d"/><path d="M7 17h10l-5 5Z" fill="#fff3d9"/></>,
 bronze:<><circle cx="12" cy="12" r="9" fill="#bd8c50"/><circle cx="12" cy="12" r="5" fill="#73aaa0"/><circle cx="12" cy="12" r="2" fill="#ffe1a3"/></>,
 pongdang:<><path d="M4 18V9l8-6 8 6v9Z" fill="#dba769"/><path d="m2 10 10-8 10 8" fill="none" stroke="#a46838" strokeWidth="3"/><path d="M10 18v-6h5v6" fill="#76503a"/><path d="M3 21q4-3 8 0t10 0" fill="none" stroke="#87c7bf" strokeWidth="2"/></>,
 coral:<path d="M12 21V5m0 8L6 9V4m6 13 7-6V6M6 9 3 7m16 4 3-2" stroke="#f1a2a7" strokeWidth="4" fill="none" strokeLinecap="round"/>,
 bluegrove:<><path d="M12 2C9 7 4 11 4 16a8 8 0 0 0 16 0c0-5-5-9-8-14Z" fill="#79d8e1"/><path d="M8 13q-3 5 2 6" fill="none" stroke="#dbffff" strokeWidth="2"/></>,
 mistmoon:<><path d="M17 3A10 10 0 1 0 21 18 9 9 0 0 1 17 3Z" fill="#e5dafb"/><path d="m19 6 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#ffe4a6" stroke="none"/></>,
 lunea:<><path d="M18 3A10 10 0 1 0 21 17 9 9 0 0 1 18 3Z" fill="#fff1c9"/><circle cx="14" cy="12" r="4" fill="#d3bfee"/><circle cx="13" cy="11" r="1" fill="#fff" stroke="none"/></>,
 whitenight:<path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1V5m14 9-4 1v4M3 14l4 1v4m14-9-4-1V5" fill="none" stroke="#c5efff" strokeWidth="2.3" strokeLinecap="round"/>,
 starruins:<><path d="m12 2 3 6 7 2-5 5 1 7-6-3-6 3 1-7-5-5 7-2Z" fill="#d8c596"/><path d="m12 7 2 4-2 5-2-5Z" fill="#80b8bd" stroke="none"/></>,
 primal:<><path d="M3 15V9l5-5 9 1 5 6v4h-9l-4 5H4v-3h7l2-3Z" fill="#f0dfae"/><path d="m15 8 4 3h-5Z" fill="#574b35"/><path d="M6 8h4v4H6Z" fill="#574b35"/><path d="M14 15v3m3-3v3m3-3v2" stroke="#f0dfae" strokeWidth="2"/><path d="m5 5 2 2m5-2 1 3" fill="none" stroke="#b6a27b"/></>,
 dreamabyss:<><path d="M4 13c-4-11 20-13 16 0Z" fill="#bba3ed"/><path d="M6 14q-3 6 1 8m4-8q4 4 0 8m5-8q-1 6 3 7" fill="none" stroke="#94e3e8" strokeWidth="2.5" strokeLinecap="round"/></>,
 cloudferry:<><path d="M12 2c-6 0-8 5-7 11s4 9 7 9 6-3 7-9S18 2 12 2Z" fill="#fff4dc"/><path d="M7 8h4m2 0h4" stroke="#3f3d48" strokeWidth="2"/><path d="m8 11 1 4m7-4-1 4" stroke="#9e88b7" strokeWidth="2"/><ellipse cx="12" cy="18" rx="2" ry="1" fill="#514658"/></>,
 scrapisle:<><path d="m9 2 6 0 1 4 4 1 2 5-3 3 0 4-5 3-3-3-4 1-4-4 2-4-2-4 4-3Z" fill="#89aa80"/><circle cx="12" cy="12" r="4" fill="#cfaa71"/><circle cx="12" cy="12" r="1.5" fill="#415d49"/></>,
 mukhyang:<><path d="m8 3 5-1 5 13-6 2Z" fill="#d4d7b9"/><path d="m12 16 6-2q4 7-6 8 3-3 0-6Z" fill="#364c43"/><path d="m8 6 6-2" stroke="#a47a4c" strokeWidth="2"/></>,
 siren:<><path d="M4 18q-3-8 0-12l8-3 8 3q3 4 0 12l-8 4Z" fill="#edddb8"/><path d="M12 5v14M7 7l3 12m7-12-3 12M4 10l4 9m12-9-4 9" fill="none" stroke="#b3a16f" strokeWidth="1.5"/><circle cx="12" cy="18" r="3" fill="#8adbc9"/></>,
 calm:<path d="M2 10q4-5 8 0t8 0 4 0M2 17q4-5 8 0t8 0 4 0" fill="none" stroke="#a5e4d8" strokeWidth="3" strokeLinecap="round"/>,
}

export const RodGaugeCharm=memo(function RodGaugeCharm({rodId,...props}:ComponentProps<'svg'>&{rodId:string}){
 return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="#584934" strokeWidth=".8" strokeLinejoin="round" aria-hidden="true" focusable="false" data-rod-charm={rodId}>{charms[rodId]??charms.basic}</svg>
})
