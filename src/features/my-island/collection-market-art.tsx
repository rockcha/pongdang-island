import {useId} from 'react'

/** Small silhouettes, bright focal objects and consistent wooden bases stay readable at map scale. */
export function CreatureArchive() {
 const id=useId(),cover=`${id}-cover`
 return <g data-landmark-art="creature-archive" strokeLinejoin="round" strokeLinecap="round">
  <defs><linearGradient id={cover} x2="0.8" y2="1"><stop stopColor="#5caa9d"/><stop offset="1" stopColor="#286e72"/></linearGradient></defs>
  <ellipse cx="16" cy="30" rx="22" ry="5" fill="#335b4e" opacity=".2"/>
  <path d="M-4 21h36v9H-4q-4-4 0-9" fill="#bb7857" stroke="#795440" strokeWidth="1.3"/>
  <path d="M0 23h30v4H0" fill="#fff1d5"/>
  <path d="M-3 7h36v16H-3q-5-8 0-16" fill={`url(#${cover})`} stroke="#315e59" strokeWidth="1.4"/>
  <path d="M2 11h29v8H2q-3-4 0-8" fill="#fff0cc"/>
  <path d="M5 14h22m-22 3h22" stroke="#d6bc89" strokeWidth=".7"/>
  <path d="M-2 8v14M2 8v14" stroke="#91d1b5" strokeWidth="1.3"/>
  <path d="M-4-2q10-6 20-1 10-5 20 1v13q-10-5-20 0-10-5-20 0Z" fill="#fff8e4" stroke="#9e7851" strokeWidth="1.2"/>
  <path d="M16-3v14" stroke="#c4a16e"/>
  <path d="M0 2q5-7 11 0-5 7-11 0l-3-3v6Z" fill="#e9a14f" stroke="#ac683c" strokeWidth=".6"/>
  <circle cx="8" cy="1" r=".8" fill="#4f5244"/>
  <path d="M22-1h9m-9 3h8m-8 3h6" stroke="#ba9d72" strokeWidth=".9"/>
  <path d="M24 9v9l3-2 3 2V9" fill="#e4a74d" stroke="#a97940" strokeWidth=".6"/>
  <circle cx="29" cy="-5" r="4" fill="#c6dac0" stroke="#698c73"/>
  <path d="M32-2l4 4" stroke="#926b44" strokeWidth="2.8"/>
  <path d="M27-6l2-1" stroke="#fffbed" strokeWidth="1.2"/>
 </g>
}

export function ItemArchive() {
 const id=useId(),glass=`${id}-glass`
 return <g data-landmark-art="item-archive" strokeLinejoin="round" strokeLinecap="round">
  <defs><linearGradient id={glass} x2=".8" y2="1"><stop stopColor="#ddf6ec" stopOpacity=".85"/><stop offset="1" stopColor="#65a9a2" stopOpacity=".3"/></linearGradient></defs>
  <ellipse cx="48" cy="89" rx="54" ry="10" fill="#395f53" opacity=".2"/>
  <path d="M0 65h96v22L48 98 0 87Z" fill="#9b674c" stroke="#73513d" strokeWidth="2"/>
  <path d="M0 65l48-10 48 10-48 12Z" fill="#e0b77b" stroke="#a77b50" strokeWidth="1.5"/>
  <path d="M8 79l33 7m14 0 33-7" stroke="#ce9a65" strokeWidth="2"/>
  <path d="M7 37l39-8 16 32-39 10Z" fill="#fce7ad" stroke="#b38a54" strokeWidth="2"/>
  <path d="M13 40l27-5 14 22-28 7Z" fill="#a8d9cc"/>
  <path d="M23 42l8-4 7 6-4 8-9 5-4-7Z" fill="#a8b875" stroke="#7c955d"/>
  <path d="M15 53l6-2m22 5 5-2" stroke="#e8f4d6" strokeWidth="2"/>
  <path d="M51 59V15q19-15 38 0v44Z" fill={`url(#${glass})`} stroke="#628e88" strokeWidth="2"/>
  <path d="M57 16q10-9 20-4M57 21v20" fill="none" stroke="#fff9de" strokeWidth="2.6" opacity=".85"/>
  <ellipse cx="70" cy="58" rx="22" ry="6" fill="#d3ad6c" stroke="#a17d4c" strokeWidth="1.4"/>
  <circle cx="70" cy="33" r="16" fill="#c69345" stroke="#88613d" strokeWidth="2"/>
  <circle cx="70" cy="33" r="12" fill="#4d9c98" stroke="#f9d78d" strokeWidth="2"/>
  <path d="M70 20l4 12-4 14-4-12Z" fill="#fff0b5"/>
  <path d="M58 33l12-4 12 4-12 4Z" fill="#96d3b7"/>
  <circle cx="70" cy="33" r="3" fill="#f6c65d" stroke="#9e793e"/>
  <path d="M14 68v6m71-7v7" stroke="#79593f" strokeWidth="3"/>
 </g>
}

export function FleaMarketStall() {
 return <g data-landmark-art="flea-market" strokeLinejoin="round" strokeLinecap="round">
  <ellipse cx="48" cy="91" rx="55" ry="9" fill="#395f53" opacity=".2"/>
  <path d="M-3 79l51-7 52 7v13H-3Z" fill="#ad8d67" stroke="#806449" strokeWidth="1.5"/>
  <path d="M1 81h94" stroke="#f2d5a3" strokeWidth="2"/>
  <path d="M9 12v65m78-65v65" stroke="#765743" strokeWidth="5"/>
  <path d="M11 12v65m78-65v65" stroke="#dbb37b" strokeWidth="2"/>
  <path d="M-6 8L14-13h67l21 21Z" fill="#c87851" stroke="#8b553d" strokeWidth="2"/>
  {[0,1,2,3,4,5].map(i=><path key={i} d={`M${-6+i*18} 8h18v13q-9 8-18 0Z`} fill={i%2?'#fff0cc':'#d98a5b'} stroke="#a96e49" strokeWidth=".8"/>)}
  <path d="M3 6l15-15h60L94 6" fill="none" stroke="#f4c597" strokeWidth="2"/>
  <path d="M0 60h96v27H0Z" fill="#be8b5b" stroke="#865f44" strokeWidth="1.7"/>
  <path d="M0 60h96v7H0Z" fill="#f0ca8c" stroke="#a77c4e" strokeWidth="1.3"/>
  <path d="M7 72h82m-82 8h82M24 69v15m47-15v15" stroke="#e0b379" strokeWidth="1.5"/>
  <path d="M7 44h28l-3 15H10Z" fill="#76a28b" stroke="#4f7663" strokeWidth="1.4"/>
  <path d="M14 43q7-12 14 0" fill="none" stroke="#947044" strokeWidth="2"/>
  <path d="M41 50q10-13 23 0-12 13-23 0l-7-5v10Z" fill="#7bb8be" stroke="#4a808d" strokeWidth="1.2"/>
  <circle cx="58" cy="48" r="1.5" fill="#354c4d"/>
  <path d="M76 36h10l3 22H73Z" fill="#e4b95f" stroke="#9a7843" strokeWidth="1.3"/>
  <path d="M78 34v-4h6v4m-9 10h12" fill="none" stroke="#94754b" strokeWidth="2"/>
  <path d="M35 24h27v13H35Z" fill="#fff4d6" stroke="#ae794b" strokeWidth="1.2"/>
  <path d="M41 30h15m-3-3 3 3-3 3m-9-6-3 3 3 3" fill="none" stroke="#a76941" strokeWidth="1.5"/>
 </g>
}
