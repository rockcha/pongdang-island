export type FarmIconKind='building'|'animal'|'decoration'|'land'|'sea'|'tile'
export function FarmCategoryIcon({kind,size=26}:{kind:FarmIconKind;size?:number}){
 return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="farm-category-icon">
  {kind==='building'&&<><path d="M6 13h20v15H6z" fill="#efdab9"/><path d="M3.5 13 7 5h18l3.5 8z" fill="#bf825c"/><path d="M10 5 8 13m8-8v8m6-8 2 8" stroke="#fff0d6"/><path d="M13 28V18h7v10" fill="#b68859"/><path d="M8 17h3v4H8z" fill="#fff6de"/><path d="M14 19 19 26m0-7-5 7" stroke="#f8e7c9"/></>}
  {kind==='animal'&&<><path d="M10 11 5 7l-2 6 7 4m12-6 5-4 2 6-7 4" fill="#d9ad7c"/><path d="M10 7 8 3m14 4 2-4"/><path d="M8 13c0-7 16-7 16 0v7c0 12-16 12-16 0z" fill="#fff1d7"/><path d="M9 20c2-4 12-4 14 0v3c-1 7-13 7-14 0z" fill="#e8bc99"/><path d="M12 13v2m8-2v2m-7 8v1m6-1v1"/></>}
  {kind==='decoration'&&<><path d="M16 28V16m0 7-7-4m7 1 7-4" stroke="#7e9358"/><path d="M9 19c-5-5-7 1 0 3m14-6c5-5 7 1 0 3" fill="#b9cc88" stroke="#7e9358"/><path d="M16 4c4-5 8 1 5 5 7-1 8 6 2 8 2 6-5 9-8 4-5 5-10 0-7-5-7-3-4-9 2-8-2-5 3-8 6-4z" fill="#e5b58d"/><circle cx="16" cy="12" r="4" fill="#f5dc91"/></>}
  {kind==='land'&&<><path d="M3 24c5-3 21-3 26 0l-4 4H7z" fill="#d4b27c" stroke="#a48658"/><path d="M4 22c4-3 20-3 24 0l-3 3H7z" fill="#bfd493" stroke="#7b9257"/><path d="M16 22V11m0 6c-8 0-10-5-9-8 6 0 9 3 9 8Zm0-3c0-7 4-10 9-10 0 6-3 10-9 10Z" fill="#9fbd70" stroke="#6e8950"/></>}
  {kind==='sea'&&<><path d="M3 23c4-5 7 5 13 0s9 5 13 0v4H3z" fill="#9bcbd0" stroke="none"/><path d="M3 14c4 4 6-4 10 0s6-4 10 0 5 1 6 0M3 21c4 4 6-4 10 0s6-4 10 0 5 1 6 0" stroke="#548f9b" strokeWidth="2"/><circle cx="23" cy="6" r="3" fill="#e9cf89" stroke="#c2a66c"/></>}
  {kind==='tile'&&<><path d="m16 3 13 7-13 7L3 10z" fill="#ead4af"/><path d="m3 16 13 7 13-7M3 22l13 7 13-7"/></>}
 </svg>
}
