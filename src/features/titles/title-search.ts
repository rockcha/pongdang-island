const initials='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const normalize=(text:string)=>text.normalize('NFC').toLocaleLowerCase('ko-KR').replace(/\s+/g,'')
export function matchesTitleSearch(name:string,query:string){
 const text=normalize(name)
 const consonants=Array.from(text,c=>{const code=c.codePointAt(0)!-0xac00;return code>=0&&code<11172?initials[Math.floor(code/588)]:c}).join('')
 return query.trim().split(/\s+/).filter(Boolean).every(term=>{
  const normalized=normalize(term)
  return text.includes(normalized)||(/^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$/.test(normalized)&&consonants.includes(normalized))
 })
}
