import {expect,it} from 'vitest'
import {matchesTitleSearch} from '@/features/titles/title-search'
it('supports partial names, spaced terms, composed Hangul and initial-consonant queries',()=>{
 for(const query of ['끝없는','바다 양식','ㄲㅇㄴ','ㅂㄷ','  양식  끝없는  '])expect(matchesTitleSearch('끝없는 바다의 양식',query)).toBe(true)
 expect(matchesTitleSearch('한글', '한글'.normalize('NFD'))).toBe(true)
 expect(matchesTitleSearch('Sea King','SEA')).toBe(true)
 expect(matchesTitleSearch('끝없는 바다의 양식','비밀 조건')).toBe(false)
})
